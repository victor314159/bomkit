// The import pipeline:
//
//   source files → grids of text cells → header and columns → rows with a
//   role → items (one or several rows) → emitted parts and usages → merged
//   BOM document, with provenance and review issues.
//
// Nothing here reads the clock, the network or a random source: the same
// sources and configuration give the same document.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import typia from "typia";
import {
  BomDocument,
  DocumentFile,
  Issue,
  IssueSubject,
  Organization,
  Part,
  SourceLocation,
  SPEC_VERSION,
  Usage,
} from "../../src/index.js";
import { UCUM_PREFIXES } from "../../src/units.js";
import { checkAll } from "../../tools/lib/check.js";
import { isObject } from "../../tools/lib/diff.js";
import { pointer } from "../../tools/lib/load.js";
import { validateStructure } from "../../tools/lib/structure.js";
import { isKnownUnit } from "../../tools/lib/units.js";
import {
  Column,
  Emit,
  Enrichment,
  ImportConfig,
  IssueTemplate,
  Table,
  Template,
} from "./config.js";
import {
  compile,
  Compiled,
  ConfigError,
  EvaluationError,
  FunctionName,
  Scope,
} from "./expr.js";
import { Grid, mediaType, readGrid, Sheet, SourceError } from "./grid.js";

export const TOOL = "bomkit-import";
export const TOOL_VERSION = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;

const HEADER_SEARCH_ROWS = 50;
const ID = /^[A-Za-z0-9_.:+=-]+$/;
const RESERVED_NAMES = new Set(["and", "or", "in", "true", "false", "null"]);

export interface SourceInput {
  /** Key in `ImportConfig.sources`, or the id of an enrichment. */
  id: string;
  /** File name; its extension selects the reader. */
  file: string;
  bytes: Uint8Array;
}

export interface ImportOptions {
  /** Revision of the BOM being imported; replaces `document.revision`. */
  revision?: string;
  /** Digest of the configuration file, recorded in `generator`. */
  configSha256?: string;
  /**
   * The import of the previous revision: the status and answers of its
   * issues are carried to the issues of the same id.
   */
  previous?: BomDocument;
  /** Enrichment files (JSON, see {@link Enrichment}), applied in order. */
  enrichments?: SourceInput[];
}

export interface ReportFinding {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface SheetReport {
  source: string;
  sheet?: string;
  headerRow: number;
  /** Headers present in the file that no column of the configuration reads. */
  unmappedColumns: string[];
  rows: {
    item: number;
    continuation: number;
    section: number;
    skip: number;
    empty: number;
  };
  /** For each emission of the table: the items it applied to (its `when` held). */
  emitted: number[];
}

export interface ImportResult {
  /** Absent when the import failed: see the `error` findings. */
  doc?: BomDocument;
  findings: ReportFinding[];
  sheets: SheetReport[];
}

const validateConfig = typia.createValidateEquals<ImportConfig>();
const validateEnrichment = typia.createValidateEquals<Enrichment>();
/** Emitted parts and usages are checked one by one, so that a bad row costs one row. */
const validatePart =
  typia.createValidateEquals<Omit<Part, "usages" | "steps" | "provenance">>();
const validateUsage = typia.createValidateEquals<Omit<Usage, "provenance">>();

const structureErrors = (r: typia.IValidation.IFailure) =>
  r.errors
    .map(
      (e) =>
        `  ${e.path.replace(/^\$input/, "") || "/"}: expected ${e.expected}, got ${JSON.stringify(e.value)}`,
    )
    .join("\n");

/** Checks the structure of a configuration read from JSON. */
export function parseConfig(input: unknown): ImportConfig {
  const r = validateConfig(input);
  if (!r.success)
    throw new ConfigError(
      `invalid import configuration:\n${structureErrors(r)}`,
    );
  return r.data;
}

/** Checks the structure of an enrichment read from JSON. */
export function parseEnrichment(input: unknown): Enrichment {
  const r = validateEnrichment(input);
  if (!r.success)
    throw new ConfigError(`invalid enrichment:\n${structureErrors(r)}`);
  return r.data;
}

// ---- Small helpers ---------------------------------------------------------

const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Turns any text into a valid id: accents are dropped and each run of other
 * characters becomes one `-`, except at the ends. Characters valid in an id
 * are kept as they are, so that `-X` and `+X` stay distinct.
 */
export function slug(text: string): string | undefined {
  const s = text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^A-Za-z0-9_.:+=-]+/g, "\0")
    .replace(/^\0|\0$/g, "")
    .replace(/\0/g, "-");
  return s === "" ? undefined : s;
}

/** Removes absent values, then empty arrays and objects. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (isObject(value)) {
    const entries = Object.entries(value)
      .map(([k, v]) => [k, prune(v)] as const)
      .filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value === null || value === "" ? undefined : value;
}

/** Values of `over` replace those of `base`; objects are merged key by key. */
function override(base: unknown, over: unknown): unknown {
  if (over === undefined) return base;
  if (!isObject(base) || !isObject(over)) return over;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = override(base[k], v);
  return out;
}

/**
 * Completes `target` with `incoming`: missing values are added, lists are
 * united, and values that disagree are kept as they are and reported.
 */
function complete(
  target: Record<string, unknown>,
  incoming: Record<string, unknown>,
  path: string,
  conflict: (path: string, kept: unknown, other: unknown) => void,
): void {
  for (const [key, value] of Object.entries(incoming)) {
    const at = `${path}${pointer(key)}`;
    const current = target[key];
    if (current === undefined) target[key] = value;
    else if (Array.isArray(current) && Array.isArray(value)) {
      const known = new Set(current.map((c) => JSON.stringify(c)));
      for (const item of value)
        if (!known.has(JSON.stringify(item))) current.push(item);
    } else if (isObject(current) && isObject(value))
      complete(current, value, at, conflict);
    else if (!same(current, value)) conflict(at, current, value);
  }
}

/**
 * JSONata gives a single value, not a list, when a path matches once. Where
 * the specification expects a list and a single value is given, the value
 * is put in a list: this undoes that rule of JSONata, and guesses nothing.
 * Returns the validation of `target` as it is left.
 */
function listSingletons(
  target: Record<string, unknown>,
  outside: string[],
  validate: (input: unknown) => typia.IValidation<unknown>,
): typia.IValidation<unknown> {
  const check = () =>
    validate(
      Object.fromEntries(
        Object.entries(target).filter(([k]) => !outside.includes(k)),
      ),
    );
  let r = check();
  for (let pass = 0; pass < 8 && !r.success; pass++) {
    let changed = false;
    for (const e of r.errors) {
      if (
        !/^\(?Array</.test(e.expected) ||
        e.value === undefined ||
        Array.isArray(e.value)
      )
        continue;
      const keys = [
        ...e.path
          .replace(/^\$input/, "")
          .matchAll(/\.([^.[\]]+)|\[(\d+)\]|\["((?:[^"\\]|\\.)*)"\]/g),
      ].map(
        (m) =>
          m[1] ??
          (m[2] !== undefined
            ? Number(m[2])
            : (JSON.parse(`"${m[3]}"`) as string)),
      );
      const last = keys.pop();
      let node: unknown = target;
      for (const k of keys)
        node = (node as Record<string | number, unknown> | undefined)?.[k];
      if (last === undefined || node === null || typeof node !== "object")
        continue;
      (node as Record<string | number, unknown>)[last] = [e.value];
      changed = true;
    }
    if (!changed) break;
    r = check();
  }
  return r;
}

// UCUM atoms that a cell may state a quantity in, beyond those that
// tools/lib/units.ts converts. Atoms of the first set take a metric prefix.
const UCUM_METRIC_ATOMS = new Set([
  "N",
  "Pa",
  "J",
  "bar",
  "K",
  "mol",
  "cd",
  "lm",
  "lx",
  "Wb",
  "T",
  "S",
  "C",
  "rad",
  "sr",
  "eV",
  "Bq",
  "Gy",
  "Sv",
  "bit",
  "By",
]);
const UCUM_FIXED_ATOMS = new Set([
  "%",
  "deg",
  "wk",
  "mo",
  "a",
  "[psi]",
  "[degF]",
  "[degR]",
  "[ppm]",
  "[ppb]",
  "[ppth]",
  "[pi]",
  "[mi_i]",
  "[mil_i]",
  "[nmi_i]",
  "[sin_i]",
  "[sft_i]",
  "[syd_i]",
  "[cin_i]",
  "[cft_i]",
  "[gal_us]",
  "[qt_us]",
  "[pt_us]",
  "[foz_us]",
  "[lbf_av]",
  "[gr]",
]);

function isUcumAtom(atom: string): boolean {
  if (
    isKnownUnit(atom) ||
    UCUM_FIXED_ATOMS.has(atom) ||
    UCUM_METRIC_ATOMS.has(atom)
  )
    return true;
  return Object.keys(UCUM_PREFIXES).some(
    (p) => atom.startsWith(p) && UCUM_METRIC_ATOMS.has(atom.slice(p.length)),
  );
}

/**
 * Whether `unit` is a UCUM code made of known atoms: products and quotients
 * (`N.m`, `mL/min`, `/s`), exponents (`m2`, `s-1`) and annotations (`{pcs}`).
 */
function isUcumUnit(unit: string): boolean {
  if (isKnownUnit(unit)) return true;
  return unit
    .replace(/^\//, "")
    .split(/[./]/)
    .every((component) => {
      const bare = component.replace(/\{[^{}]*\}/g, "");
      if (bare === "") return component !== "";
      if (bare === "1") return true;
      const m = /^(\[[^\]]+\]|[A-Za-z%]+?)(-?\d+)?$/.exec(bare);
      return m !== null && isUcumAtom(m[1]!);
    });
}

function where(loc: { sheet?: string; row?: number }): string {
  return `${loc.sheet !== undefined ? `sheet "${loc.sheet}" ` : ""}row ${loc.row}`;
}

// ---- Compiled configuration ------------------------------------------------

type CTemplate = Compiled | CTemplate[] | { [key: string]: CTemplate };

interface CRule {
  when: Compiled;
  part?: CTemplate;
  usage?: CTemplate;
  issue?: { template: IssueTemplate; text: Compiled; key: string };
}

interface CEmit {
  index: number;
  when?: Compiled;
  part?: CTemplate;
  usage?: CTemplate;
  shared: boolean;
  rules: CRule[];
}

interface CTable {
  table: Table;
  index: number;
  source: string;
  columns: { name: string; headers: string[]; optional: boolean }[];
  derive: [string, Compiled][];
  rowRules?: {
    role: "item" | "continuation" | "section" | "skip";
    when?: Compiled;
    ctx: [string, Compiled][];
  }[];
  emits: CEmit[];
}

interface Row {
  n: number;
  /** Text of the cells by column name, then derived values. */
  fields: Record<string, unknown>;
  /** The cells of the configured columns, as one text: identifies the row whatever its position. */
  content: string;
  /** Why a `derive` value of the row could not be computed. */
  error?: string;
}

interface Item {
  sheet?: string;
  rows: Row[];
  ctx: Record<string, unknown>;
}

/** A review issue, with what identifies it across revisions. */
interface PendingIssue {
  issue: Omit<Issue, "id">;
  key: string;
}

// ---- The import ------------------------------------------------------------

export async function runImport(
  config: ImportConfig,
  sources: SourceInput[],
  options: ImportOptions = {},
): Promise<ImportResult> {
  const findings: ReportFinding[] = [];
  const sheets: SheetReport[] = [];
  try {
    const doc = await new Import(
      config,
      sources,
      options,
      findings,
      sheets,
    ).run();
    return { doc, findings, sheets };
  } catch (e) {
    if (!(e instanceof ConfigError) && !(e instanceof SourceError)) throw e;
    findings.push({
      severity: "error",
      code: e instanceof ConfigError ? "config" : "source",
      message: e.message,
    });
    return { findings, sheets };
  }
}

class Import {
  private readonly base;
  private readonly organizations: Record<string, Organization>;
  private readonly createdOrganizations = new Set<string>();
  private readonly parts = new Map<
    string,
    {
      part: Part;
      base: boolean;
      locations: SourceLocation[];
      seen: Set<string>;
    }
  >();
  private readonly usages = new Map<
    string,
    Map<string, { usage: Usage; shared: boolean; locations: SourceLocation[] }>
  >();
  private readonly issues: PendingIssue[] = [];
  private readonly slugs = new Map<string, string>();
  private readonly reported = new Set<string>();
  private readonly enrichments: {
    input: SourceInput;
    enrichment: Enrichment;
  }[] = [];
  /** Problems met by functions while evaluating the current item. */
  private diagnostics: string[] = [];
  /** Counts of `$nth`, for the current sheet. */
  private nthCounts = new Map<string, number>();

  constructor(
    private readonly config: ImportConfig,
    private readonly sources: SourceInput[],
    private readonly options: ImportOptions,
    private readonly findings: ReportFinding[],
    private readonly sheets: SheetReport[],
  ) {
    this.base = structuredClone(config.document);
    this.organizations = this.base.organizations ?? {};
    for (const [id, part] of Object.entries(this.base.parts ?? {})) {
      const { usages, ...rest } = part;
      const locations = [...(part.provenance?.locations ?? [])];
      this.parts.set(id, {
        part: rest,
        base: true,
        locations,
        seen: new Set(locations.map((l) => JSON.stringify(l))),
      });
      if (usages)
        this.usages.set(
          id,
          new Map(
            usages.map((usage) => [
              usage.id,
              { usage, shared: false, locations: [] },
            ]),
          ),
        );
    }
  }

  async run(): Promise<BomDocument | undefined> {
    const tables = this.config.tables.map((t, i) => this.compileTable(t, i));
    for (const id of Object.keys(this.config.sources))
      if (!this.sources.some((s) => s.id === id))
        throw new ConfigError(`no file given for source "${id}"`);
    for (const input of this.options.enrichments ?? []) {
      if (input.id in this.config.sources)
        throw new ConfigError(
          `enrichment "${input.file}" has the id "${input.id}" of a source`,
        );
      let json: unknown;
      try {
        json = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(input.bytes),
        );
      } catch (e) {
        throw new ConfigError(
          `enrichment "${input.file}" is not JSON: ${(e as Error).message}`,
        );
      }
      try {
        this.enrichments.push({ input, enrichment: parseEnrichment(json) });
      } catch (e) {
        throw new ConfigError(`${input.file}: ${(e as Error).message}`);
      }
    }
    // A source is parsed once per delimiter that a table asks for.
    const grids = new Map<string, Grid>();
    for (const t of tables) {
      const input = this.sources.find((s) => s.id === t.source)!;
      const key = JSON.stringify([t.source, t.table.delimiter ?? null]);
      let grid = grids.get(key);
      if (!grid)
        grids.set(
          key,
          (grid = await readGrid(input.file, input.bytes, t.table.delimiter)),
        );
      for (const sheet of this.selectSheets(t, grid))
        await this.importSheet(t, sheet);
    }
    for (const e of this.enrichments) this.enrich(e.input, e.enrichment);
    return this.assemble();
  }

  // ---- Configuration ------------------------------------------------------

  private compileTable(table: Table, index: number): CTable {
    const at = `tables[${index}]`;
    const ids = Object.keys(this.config.sources);
    const source = table.source ?? (ids.length === 1 ? ids[0]! : undefined);
    if (source === undefined)
      throw new ConfigError(
        `${at}: "source" is needed when several sources are declared`,
      );
    if (!ids.includes(source))
      throw new ConfigError(
        `${at}: source "${source}" is not declared in "sources"`,
      );
    if (table.sheets && !Array.isArray(table.sheets)) {
      try {
        new RegExp(table.sheets.match);
      } catch {
        throw new ConfigError(
          `${at}.sheets.match is not a valid regular expression`,
        );
      }
    }
    const columns = Object.entries(table.columns).map(
      ([name, spec]: [string, Column]) => {
        if (RESERVED_NAMES.has(name))
          throw new ConfigError(
            `${at}.columns: "${name}" is a reserved word of JSONata`,
          );
        const headers =
          typeof spec === "string"
            ? [spec]
            : Array.isArray(spec)
              ? spec
              : [spec.header].flat();
        return {
          name,
          headers: headers.map(normalize),
          optional: isObject(spec) && spec.optional === true,
        };
      },
    );
    const derived = Object.keys(table.derive ?? {});
    for (const name of derived) {
      if (RESERVED_NAMES.has(name))
        throw new ConfigError(
          `${at}.derive: "${name}" is a reserved word of JSONata`,
        );
      if (name in table.columns)
        throw new ConfigError(`${at}.derive: "${name}" is already a column`);
    }
    const warn = (message: string) =>
      this.findings.push({ severity: "warning", code: "config-lint", message });
    const scope = (
      where: string,
      phase: Scope["phase"],
      fields = derived,
    ): Scope => ({
      at: `${at}.${where}`,
      columns: new Set([...columns.map((c) => c.name), ...fields]),
      ctxKeys: new Set(
        (table.rows ?? []).flatMap((r) => Object.keys(r.ctx ?? {})),
      ),
      rowVars: new Set([phase === "emit" ? "rows" : "prev"]),
      vars: new Set(["sheet", "row"]),
      phase,
      warn,
    });
    const value = (source: string, s: Scope) =>
      compile(source, s, this.functions);
    const condition = (source: string, s: Scope): Compiled => ({
      ...compile(`$boolean((${source}))`, s, this.functions),
      source,
    });
    const template = (t: Template, s: Scope): CTemplate =>
      typeof t === "string"
        ? value(t, s)
        : Array.isArray(t)
          ? t.map((x) => template(x, s))
          : Object.fromEntries(
              Object.entries(t).map(([k, v]) => [
                k,
                template(v, { ...s, at: `${s.at}.${k}` }),
              ]),
            );
    const derive = Object.entries(table.derive ?? {}).map(
      ([name, source], i) =>
        [
          name,
          value(source, scope(`derive.${name}`, "derive", derived.slice(0, i))),
        ] as [string, Compiled],
    );
    const rowRules = table.rows?.map((r, i) => {
      const s = scope(`rows[${i}]`, "rows");
      if (r.ctx && r.role !== "section")
        throw new ConfigError(`${s.at}: "ctx" is only for section rows`);
      return {
        role: r.role,
        when: r.when === undefined ? undefined : condition(r.when, s),
        ctx: Object.entries(r.ctx ?? {}).map(
          ([k, v]) => [k, value(v, s)] as [string, Compiled],
        ),
      };
    });
    const emits = table.emit.map((e: Emit, i): CEmit => {
      const s = scope(`emit[${i}]`, "emit");
      if (!e.part && !e.usage)
        throw new ConfigError(`${s.at}: needs a "part", a "usage" or both`);
      if (!e.part && e.usage?.part === undefined)
        throw new ConfigError(
          `${s.at}.usage: needs a "part" when no part is emitted with it`,
        );
      return {
        index: i,
        when: e.when === undefined ? undefined : condition(e.when, s),
        part: e.part && template(e.part, { ...s, at: `${s.at}.part` }),
        usage: e.usage && template(e.usage, { ...s, at: `${s.at}.usage` }),
        shared: e.shared === true,
        rules: (e.rules ?? []).map((r, j) => {
          const rs = { ...s, at: `${s.at}.rules[${j}]` };
          return {
            when: condition(r.when, rs),
            part:
              r.part &&
              template(r.part as Template, { ...rs, at: `${rs.at}.part` }),
            usage:
              r.usage &&
              template(r.usage as Template, { ...rs, at: `${rs.at}.usage` }),
            issue: r.issue && {
              template: r.issue,
              text: value(r.issue.text, { ...rs, at: `${rs.at}.issue.text` }),
              key: r.issue.key ?? `text=${r.issue.text}`,
            },
          };
        }),
      };
    });
    return { table, index, source, columns, derive, rowRules, emits };
  }

  private selectSheets(t: CTable, grid: Grid): Sheet[] {
    const wanted = t.table.sheets;
    if (!wanted) return grid.sheets;
    if (Array.isArray(wanted)) {
      return wanted.map((name) => {
        const sheet = grid.sheets.find((s) => s.name === name);
        if (!sheet)
          throw new SourceError(
            `source "${t.source}" has no sheet "${name}" (found: ${grid.sheets.map((s) => s.name ?? "(unnamed)").join(", ")})`,
          );
        return sheet;
      });
    }
    const re = new RegExp(wanted.match);
    const found = grid.sheets.filter(
      (s) => s.name !== undefined && re.test(s.name),
    );
    if (!found.length)
      throw new SourceError(
        `source "${t.source}" has no sheet matching /${wanted.match}/`,
      );
    return found;
  }

  // ---- Functions available in expressions -----------------------------------

  /** A number written with a decimal point, or a decimal comma when asked for. */
  private number(source: string, decimal: unknown): number | undefined {
    const t = decimal === "," ? source.replace(",", ".") : source;
    if (
      /^[+-]?\d+(\.\d+)?$/.test(t) &&
      !(decimal === "," && source.includes("."))
    )
      return Number(t);
    return undefined;
  }

  private readonly functions: Record<
    FunctionName,
    (...args: unknown[]) => unknown
  > = {
    /** `$id(text)`: a valid id made from any text. */
    id: (value) => {
      if (value === undefined || value === null) return undefined;
      const source = String(value).trim();
      const id = slug(source);
      if (id === undefined) return undefined;
      const first = this.slugs.get(id);
      if (first === undefined) this.slugs.set(id, source);
      else if (first !== source)
        this.diagnostics.push(
          `"${source}" and "${first}" give the same id "${id}"`,
        );
      return id;
    },
    /** `$org(name)`: id of the organization with that name or alias, declared if new. */
    org: (value) => {
      if (value === undefined || value === null) return undefined;
      const name = String(value).trim();
      const key = normalize(name);
      const id = slug(key);
      if (id === undefined) return undefined;
      for (const [orgId, org] of Object.entries(this.organizations))
        if (
          orgId === id ||
          normalize(org.name) === key ||
          org.aliases?.some((a) => normalize(a) === key)
        )
          return orgId;
      this.organizations[id] = { name };
      this.createdOrganizations.add(id);
      return id;
    },
    /** `$num(text)`: a number written with a decimal point; `$num(text, ",")` for a decimal comma. */
    num: (value, decimal) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "number") return value;
      const source = String(value).trim();
      const n = this.number(source, decimal);
      if (n === undefined)
        this.diagnostics.push(`"${source}" is not read as a number`);
      return n;
    },
    /**
     * `$quantity(text, options)`: `{ value, unit }` from a number and an
     * optional UCUM unit (`250 mm`, `2.5m`). `options.units` maps other
     * spellings to UCUM (`{ "pcs": "1", "ft": "[ft_i]" }`); the codes it
     * maps to are taken as given, so any UCUM code can be imported.
     * `options.decimal` is `","` for a decimal comma.
     */
    quantity: (value, options) => {
      if (value === undefined || value === null) return undefined;
      const opts = isObject(options) ? options : {};
      const units = isObject(opts["units"])
        ? (opts["units"] as Record<string, unknown>)
        : {};
      if (typeof value === "number") return { value };
      const source = String(value).trim();
      const m = /^([+-]?[\d.,]+)\s*(.*)$/.exec(source);
      const n = m ? this.number(m[1]!, opts["decimal"]) : undefined;
      if (n === undefined) {
        this.diagnostics.push(`"${source}" is not read as a quantity`);
        return undefined;
      }
      const spelled = m![2]!;
      if (spelled === "") return { value: n };
      const mapped = units[spelled];
      if (typeof mapped === "string") {
        if (!/^\S+$/.test(mapped)) {
          this.diagnostics.push(
            `"${source}": unit "${spelled}" is mapped to ${JSON.stringify(mapped)}, which is not a UCUM code`,
          );
          return undefined;
        }
        return mapped === "1" ? { value: n } : { value: n, unit: mapped };
      }
      if (!isUcumUnit(spelled)) {
        this.diagnostics.push(
          `"${source}": unit "${spelled}" is not understood (map it with $quantity(…, { "units": { "${spelled}": "<UCUM unit>" } }))`,
        );
        return undefined;
      }
      return spelled === "1" ? { value: n } : { value: n, unit: spelled };
    },
    /**
     * `$designators(text, scheme)`: designator sets from a list separated
     * by commas, semicolons or spaces. With the default scheme `refdes`,
     * ranges are expanded (`R1-R4`, `R1-4`), keeping leading zeros (`R01-R04`).
     */
    designators: (value, scheme = "refdes") => {
      if (value === undefined || value === null) return undefined;
      const values: string[] = [];
      for (const token of String(value)
        .split(/[,;\s]+/)
        .filter((t) => t !== "")) {
        const range =
          scheme === "refdes"
            ? /^([A-Za-z]+)(\d+)-([A-Za-z]*)(\d+)$/.exec(token)
            : null;
        if (!range) {
          values.push(token);
          continue;
        }
        const [, prefix, from, prefix2, to] = range as unknown as [
          string,
          string,
          string,
          string,
          string,
        ];
        const a = Number(from),
          b = Number(to);
        if ((prefix2 !== "" && prefix2 !== prefix) || b <= a || b - a > 1000) {
          this.diagnostics.push(
            `designator range "${token}" is not understood`,
          );
          return undefined;
        }
        // A range written with leading zeros (R01-R04) keeps their width.
        const width = from.startsWith("0") ? from.length : 0;
        for (let n = a; n <= b; n++)
          values.push(`${prefix}${String(n).padStart(width, "0")}`);
      }
      const unique = [...new Set(values)];
      if (unique.length !== values.length)
        this.diagnostics.push(`"${String(value)}" repeats a designator`);
      return unique.length ? [{ scheme, values: unique }] : undefined;
    },
    /**
     * `$nth(key)`: how many rows of the sheet, this one included, gave
     * this key so far. Tells apart rows that are otherwise identical,
     * by their order among themselves rather than by row number.
     */
    nth: (value) => {
      if (value === undefined || value === null) return undefined;
      const key = JSON.stringify(value);
      const n = (this.nthCounts.get(key) ?? 0) + 1;
      this.nthCounts.set(key, n);
      return n;
    },
  };

  // ---- Reading a sheet ------------------------------------------------------

  private findHeader(
    t: CTable,
    sheet: Sheet,
  ): { index: number; columnOf: Map<string, number> } {
    const name =
      sheet.name !== undefined
        ? `sheet "${sheet.name}"`
        : `source "${t.source}"`;
    /** `ambiguous` is what makes the row unusable as a header, if anything. */
    const tryRow = (index: number) => {
      const cells = (sheet.rows[index] ?? []).map((c) =>
        c === undefined ? undefined : normalize(c),
      );
      const columnOf = new Map<string, number>();
      const missing: string[] = [];
      let ambiguous: Error | undefined;
      for (const col of t.columns) {
        const hits = cells.flatMap((c, i) =>
          c !== undefined && col.headers.includes(c) ? [i] : [],
        );
        if (hits.length > 1)
          ambiguous ??= new SourceError(
            `${name} row ${index + 1}: several columns match "${col.name}"`,
          );
        else if (hits.length === 1) {
          const taken = [...columnOf].find(([, i]) => i === hits[0]);
          if (taken)
            ambiguous ??= new ConfigError(
              `columns "${taken[0]}" and "${col.name}" read the same header`,
            );
          else columnOf.set(col.name, hits[0]!);
        } else if (!col.optional) missing.push(col.name);
      }
      return { index, columnOf, missing, ambiguous };
    };
    const describe = (missing: string[]) =>
      missing
        .map(
          (m) =>
            `${m} (${t.columns
              .find((c) => c.name === m)!
              .headers.map((h) => `"${h}"`)
              .join(" or ")})`,
        )
        .join(", ");
    if (t.table.headerRow !== undefined) {
      const r = tryRow(t.table.headerRow - 1);
      if (r.ambiguous) throw r.ambiguous;
      if (r.missing.length)
        throw new SourceError(
          `${name} row ${t.table.headerRow}: header not found for ${describe(r.missing)}`,
        );
      return r;
    }
    // Rows above the header (titles, notes) may repeat a header text: an
    // ambiguous row is passed over, and reported only if no row is a header.
    let closest: ReturnType<typeof tryRow> | undefined;
    let ambiguous: Error | undefined;
    for (let i = 0; i < Math.min(sheet.rows.length, HEADER_SEARCH_ROWS); i++) {
      const r = tryRow(i);
      if (r.ambiguous) {
        if (!r.missing.length) ambiguous ??= r.ambiguous;
        continue;
      }
      if (!r.missing.length) return r;
      if (
        r.columnOf.size > 0 &&
        (!closest || r.missing.length < closest.missing.length)
      )
        closest = r;
    }
    if (ambiguous) throw ambiguous;
    throw new SourceError(
      closest
        ? `${name}: no header row found; the closest is row ${closest.index + 1}, without ${describe(closest.missing)}`
        : `${name}: no header row found in the first ${HEADER_SEARCH_ROWS} rows`,
    );
  }

  private async importSheet(t: CTable, sheet: Sheet): Promise<void> {
    const header = this.findHeader(t, sheet);
    const mapped = new Set(header.columnOf.values());
    const report: SheetReport = {
      source: t.source,
      sheet: sheet.name,
      headerRow: header.index + 1,
      unmappedColumns: (sheet.rows[header.index] ?? []).flatMap((c, i) =>
        c !== undefined && !mapped.has(i) ? [c] : [],
      ),
      rows: { item: 0, continuation: 0, section: 0, skip: 0, empty: 0 },
      emitted: t.emits.map(() => 0),
    };
    this.sheets.push(report);
    this.nthCounts = new Map();

    const items: Item[] = [];
    let ctx: Record<string, unknown> = {};
    let prev: Row | undefined;
    for (let i = header.index + 1; i < sheet.rows.length; i++) {
      const cells = sheet.rows[i]!;
      if (cells.every((c) => c === undefined)) {
        report.rows.empty++;
        continue;
      }
      const row: Row = { n: i + 1, fields: {}, content: "" };
      for (const [name, c] of header.columnOf)
        if (cells[c] !== undefined) row.fields[name] = cells[c]!;
      row.content = JSON.stringify([
        t.source,
        sheet.name ?? null,
        t.columns.map((c) => row.fields[c.name] ?? null),
      ]);
      const loc = { sheet: sheet.name, row: row.n };
      const vars = { sheet: sheet.name, row: row.n, ctx, prev: prev?.fields };
      this.diagnostics = [];
      for (const [name, expr] of t.derive) {
        let v: unknown;
        try {
          v = await expr.evaluate(row.fields, vars);
        } catch (e) {
          if (!(e instanceof EvaluationError)) throw e;
          // Later values may depend on this one: none is computed.
          row.error = `derive.${name}: ${e.message}`;
          break;
        }
        if (v !== undefined && v !== null && v !== "") row.fields[name] = v;
      }
      for (const text of this.diagnostics)
        this.issue(
          {
            severity: "warning",
            category: "ambiguous",
            text: `${where(loc)}: ${text}.`,
            provenance: {
              locations: [
                {
                  document: t.source,
                  ...(sheet.name !== undefined && { sheet: sheet.name }),
                  row: row.n,
                },
              ],
            },
          },
          ["derive", row.content, text],
        );
      let role: "item" | "continuation" | "section" | "skip" = "item";
      if (t.rowRules) {
        let rule;
        for (const r of t.rowRules) {
          if (
            r.when === undefined ||
            (await this.rowValue(r.when, row.fields, vars, loc)) === true
          ) {
            rule = r;
            break;
          }
        }
        if (!rule)
          throw new SourceError(
            `${where(loc)} matches no rule of "rows"; add a rule, or a last rule { "role": "skip" }`,
          );
        role = rule.role;
        if (role === "section") {
          ctx = { ...ctx };
          for (const [key, expr] of rule.ctx)
            ctx[key] = await this.rowValue(expr, row.fields, vars, loc);
        }
      }
      report.rows[role]++;
      if (row.error !== undefined && role !== "skip")
        this.issue(
          {
            severity: "error",
            category: "import",
            text: `${where(loc)}: ${row.error}; ${role === "section" ? "the context it gives to the rows below may be incomplete" : "its item is not imported"}.`,
            provenance: {
              locations: [
                {
                  document: t.source,
                  ...(sheet.name !== undefined && { sheet: sheet.name }),
                  row: row.n,
                },
              ],
            },
          },
          ["evaluation", `tables[${t.index}].derive`, row.content, row.error],
        );
      if (role === "item") items.push({ sheet: sheet.name, rows: [row], ctx });
      else if (role === "continuation") {
        const last = items.at(-1);
        if (!last)
          throw new SourceError(
            `${where(loc)} continues an item, but no item comes before it`,
          );
        last.rows.push(row);
      }
      prev = row;
    }
    for (const item of items) {
      if (item.rows.some((r) => r.error !== undefined)) continue;
      for (const emit of t.emits)
        if (await this.emit(t, emit, item)) report.emitted[emit.index]!++;
    }
  }

  /** Row rules decide the structure of the table: a failure there stops the import. A failure in `derive` costs its row. */
  private async rowValue(
    expr: Compiled,
    input: Record<string, unknown>,
    vars: Record<string, unknown>,
    loc: { sheet?: string; row: number },
  ): Promise<unknown> {
    try {
      return await expr.evaluate(input, vars);
    } catch (e) {
      if (e instanceof EvaluationError)
        throw new SourceError(`${where(loc)}: ${e.message}`);
      throw e;
    }
  }

  // ---- Emitting parts and usages ----------------------------------------------

  private async template(
    t: CTemplate,
    input: Record<string, unknown>,
    vars: Record<string, unknown>,
  ): Promise<unknown> {
    if (Array.isArray(t)) {
      const out = [];
      for (const x of t) out.push(await this.template(x, input, vars));
      return out;
    }
    if ("evaluate" in t && typeof t.evaluate === "function")
      return (t as Compiled).evaluate(input, vars);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(t as { [key: string]: CTemplate }))
      out[k] = await this.template(v, input, vars);
    return out;
  }

  /**
   * Records an issue. `key` names what the issue is about by what stays
   * when the source changes (ids, cell contents, the rule), never by row
   * number: the issue id is derived from it.
   */
  private issue(issue: Omit<Issue, "id">, key: unknown[]): void {
    this.issues.push({ issue, key: JSON.stringify(key) });
  }

  /** Returns whether the emission applied to the item. */
  private async emit(t: CTable, emit: CEmit, item: Item): Promise<boolean> {
    const head = item.rows[0]!;
    const locations: SourceLocation[] = item.rows.map((r) => ({
      document: t.source,
      ...(item.sheet !== undefined && { sheet: item.sheet }),
      row: r.n,
    }));
    const at = where({ sheet: item.sheet, row: head.n });
    const vars = {
      sheet: item.sheet,
      row: head.n,
      ctx: item.ctx,
      rows: item.rows.map((r) => r.fields),
    };
    const origin = `tables[${t.index}].emit[${emit.index}]`;
    this.diagnostics = [];
    let part: unknown, usage: unknown;
    const raised: { rule: NonNullable<CRule["issue"]>; text: string }[] = [];
    try {
      if (emit.when && (await emit.when.evaluate(head.fields, vars)) !== true)
        return false;
      if (emit.part) part = await this.template(emit.part, head.fields, vars);
      if (emit.usage)
        usage = await this.template(emit.usage, head.fields, vars);
      for (const rule of emit.rules) {
        if ((await rule.when.evaluate(head.fields, vars)) !== true) continue;
        if (rule.part)
          part = override(
            part,
            await this.template(rule.part, head.fields, vars),
          );
        if (rule.usage)
          usage = override(
            usage,
            await this.template(rule.usage, head.fields, vars),
          );
        if (rule.issue) {
          const text = await rule.issue.text.evaluate(head.fields, vars);
          if (typeof text === "string" && text !== "")
            raised.push({ rule: rule.issue, text });
        }
      }
    } catch (e) {
      if (!(e instanceof EvaluationError)) throw e;
      this.issue(
        {
          severity: "error",
          category: "import",
          text: `${at} is not imported: ${e.message}.`,
          provenance: { locations },
        },
        ["evaluation", origin, head.content],
      );
      return true;
    }
    const p = prune(part) as
      (Record<string, unknown> & { id?: unknown }) | undefined;
    const u = prune(usage) as
      | (Record<string, unknown> & {
          id?: unknown;
          parent?: unknown;
          part?: unknown;
        })
      | undefined;
    const diagnostics = this.diagnostics;
    const because = diagnostics.length ? ` (${diagnostics.join("; ")})` : "";
    const dropped = (
      what: string,
      problems: string[],
      subject?: IssueSubject,
    ) =>
      this.issue(
        {
          severity: "error",
          category: "missing",
          text: `${at}: ${what} is not imported: ${problems.join(", ")}${because}.`,
          ...(subject && { subjects: [subject] }),
          provenance: { locations },
        },
        ["dropped", what, origin, subject ?? head.content, problems],
      );
    // Ids first, with a hint; then everything else, as the specification types say.
    const problems = (
      o: Record<string, unknown>,
      ids: string[],
      outside: string[],
      validate: (input: unknown) => typia.IValidation<unknown>,
    ): string[] => {
      const out = ids.flatMap((k) =>
        o[k] === undefined
          ? [`${k} is missing`]
          : typeof o[k] === "string" && ID.test(o[k])
            ? []
            : [`${k} ${JSON.stringify(o[k])} is not a valid id (use $id())`],
      );
      if (out.length) return out;
      const r = listSingletons(o, outside, validate);
      if (r.success) return [];
      return r.errors.map((e) => {
        const path = e.path.replace(/^\$input\.?/, "");
        return e.value === undefined
          ? `${path} is missing`
          : `${path} is ${JSON.stringify(e.value)}, expected ${e.expected}`;
      });
    };

    let partId: string | undefined;
    if (emit.part) {
      const candidate = { ...p };
      const wrong = problems(candidate, ["id"], ["id"], validatePart);
      if (wrong.length) {
        dropped("the part", wrong);
        return true;
      }
      const { id, ...fields } = candidate;
      partId = id as string;
      this.addPart(partId, fields, locations);
    }
    let usageSubject: IssueSubject | undefined;
    if (emit.usage) {
      const {
        parent,
        id: usageId,
        part: usagePart,
        ...rest
      } = { ...u, part: u?.part ?? partId };
      const candidate: Record<string, unknown> = {
        parent,
        id: usageId,
        part: usagePart,
        ...rest,
      };
      const wrong = problems(
        candidate,
        ["parent", "id", "part"],
        ["parent"],
        validateUsage,
      );
      if (wrong.length) {
        dropped(
          "the usage",
          wrong,
          partId !== undefined ? { part: partId } : undefined,
        );
        diagnostics.length = 0;
      } else {
        const { parent: _, ...stored } = candidate;
        const id = this.addUsage(
          parent as string,
          stored as unknown as Usage,
          emit.shared,
          locations,
          head.content,
        );
        usageSubject = { part: parent as string, usage: id };
      }
    }
    const subjects = usageSubject
      ? [usageSubject]
      : partId !== undefined
        ? [{ part: partId }]
        : undefined;
    const about = subjects ?? head.content;
    for (const text of diagnostics)
      this.issue(
        {
          severity: "warning",
          category: "ambiguous",
          text: `${at}: ${text}.`,
          ...(subjects && { subjects }),
          provenance: { locations },
        },
        ["diagnostic", about, text],
      );
    for (const r of raised)
      this.issue(
        {
          severity: r.rule.template.severity,
          ...(r.rule.template.category !== undefined && {
            category: r.rule.template.category,
          }),
          text: r.text,
          ...(subjects && { subjects }),
          provenance: { locations },
        },
        ["rule", r.rule.key, about],
      );
    return true;
  }

  private addPart(
    id: string,
    fields: Record<string, unknown>,
    locations: SourceLocation[],
  ): void {
    const known = this.parts.get(id);
    if (!known) {
      this.parts.set(id, {
        part: fields as unknown as Part,
        base: false,
        locations: [...locations],
        seen: new Set(locations.map((l) => JSON.stringify(l))),
      });
      return;
    }
    for (const l of locations) {
      const k = JSON.stringify(l);
      if (!known.seen.has(k)) {
        known.seen.add(k);
        known.locations.push(l);
      }
    }
    complete(
      known.part as unknown as Record<string, unknown>,
      fields,
      "",
      (path, kept, other) => {
        const key = `${id}\0${path}\0${JSON.stringify(other)}`;
        if (this.reported.has(key)) return;
        this.reported.add(key);
        // A part declared by hand in the configuration has the last word, but what it hides is said.
        if (known.base)
          return this.overridden(
            id,
            path,
            kept,
            other,
            "the configuration",
            locations,
          );
        this.issue(
          {
            severity: "warning",
            category: "conflict",
            text: `Part ${id}: ${path.slice(1)} is ${JSON.stringify(kept)} at ${where(known.locations[0] ?? {})} and ${JSON.stringify(other)} at ${where(locations[0]!)}. The first value is kept.`,
            subjects: [{ part: id, field: path }],
            provenance: {
              locations: [...known.locations.slice(0, 1), ...locations],
            },
          },
          ["conflict", id, path, kept, other],
        );
      },
    );
  }

  /**
   * A value set by hand hides an imported one. The issue is identified by
   * the imported value: when the source changes it, a new issue opens.
   */
  private overridden(
    id: string,
    path: string,
    kept: unknown,
    imported: unknown,
    by: string,
    locations?: SourceLocation[],
  ): void {
    this.issue(
      {
        severity: "info",
        category: "conflict",
        text: `Part ${id}: ${path.slice(1)} is ${JSON.stringify(kept)}, set by ${by}; the import gives ${JSON.stringify(imported)}${locations?.[0] ? ` at ${where(locations[0])}` : ""}. To confirm.`,
        subjects: [{ part: id, field: path }],
        ...(locations?.length && { provenance: { locations } }),
      },
      ["override", id, path, imported],
    );
  }

  /** Applies an enrichment on the imported parts. */
  private enrich(input: SourceInput, enrichment: Enrichment): void {
    const by = `enrichment "${input.file}"`;
    for (const [id, patch] of Object.entries(enrichment.parts)) {
      const known = this.parts.get(id);
      if (!known) {
        this.findings.push({
          severity: "warning",
          code: "enrichment-unused",
          message: `${by}: part "${id}" is not in the import (renamed or removed in the source?); its values are not used`,
        });
        continue;
      }
      const apply = (
        target: Record<string, unknown>,
        values: Record<string, unknown>,
        path: string,
      ) => {
        for (const [k, v] of Object.entries(values)) {
          const at = `${path}${pointer(k)}`;
          const current = target[k];
          if (isObject(current) && isObject(v)) apply(current, v, at);
          else {
            if (current !== undefined && !same(current, v))
              this.overridden(id, at, v, current, by, known.locations);
            target[k] = structuredClone(v);
          }
        }
      };
      apply(
        known.part as unknown as Record<string, unknown>,
        patch as Record<string, unknown>,
        "",
      );
    }
  }

  /** Returns the id under which the usage is stored. */
  private addUsage(
    parent: string,
    usage: Usage,
    shared: boolean,
    locations: SourceLocation[],
    content: string,
  ): string {
    let list = this.usages.get(parent);
    if (!list) this.usages.set(parent, (list = new Map()));
    const known = list.get(usage.id);
    if (!known) {
      list.set(usage.id, { usage, shared, locations: [...locations] });
      return usage.id;
    }
    if (shared && known.shared) {
      if (!same(known.usage, usage))
        this.issue(
          {
            severity: "error",
            category: "conflict",
            text: `Usage ${usage.id} of ${parent} is ${JSON.stringify(known.usage)} at ${where(known.locations[0] ?? {})} and ${JSON.stringify(usage)} at ${where(locations[0]!)}. The first is kept.`,
            subjects: [{ part: parent, usage: usage.id }],
            provenance: {
              locations: [...known.locations.slice(0, 1), ...locations],
            },
          },
          ["shared-conflict", parent, usage.id, usage],
        );
      return usage.id;
    }
    let n = 2;
    while (list.has(`${usage.id}:${n}`)) n++;
    const id = `${usage.id}:${n}`;
    list.set(id, {
      usage: { ...usage, id },
      shared,
      locations: [...locations],
    });
    this.issue(
      {
        severity: "error",
        category: "conflict",
        text: `${where(locations[0]!)} gives the usage id "${usage.id}" in ${parent}, already given at ${known.locations[0] ? where(known.locations[0]) : "a usage declared in the configuration"}. It is stored as "${id}", which depends on row order: give each row a distinct id.`,
        subjects: [{ part: parent, usage: id }],
        provenance: {
          locations: [...known.locations.slice(0, 1), ...locations],
        },
      },
      ["duplicate-usage", parent, usage.id, content],
    );
    return id;
  }

  // ---- The document -----------------------------------------------------------

  /**
   * Ids of the issues: `import-` and a digest of what the issue is about,
   * so that it stays the same from one revision to the next. The status
   * and answers of the previous revision's issue of the same id are kept.
   */
  private issueList(): Issue[] {
    const baseIssues = this.base.issues ?? [];
    const taken = new Set(baseIssues.map((i) => i.id));
    const issues: Issue[] = [...baseIssues];
    for (const { issue, key } of this.issues) {
      const stem = `import-${sha256(key).slice(0, 12)}`;
      let id = stem;
      for (let n = 2; taken.has(id); n++) id = `${stem}-${n}`;
      taken.add(id);
      issues.push({ id, ...issue });
    }

    const previous = this.options.previous;
    if (!previous) return issues;
    if (previous.id !== this.base.id)
      this.findings.push({
        severity: "warning",
        code: "previous",
        message: `the previous document is another BOM (${previous.id}); its answers are carried by issue id all the same`,
      });
    const before = new Map((previous.issues ?? []).map((i) => [i.id, i]));
    const answered = (i: Issue) =>
      (i.status !== undefined && i.status !== "open") ||
      (i.answers?.length ?? 0) > 0;
    let carried = 0;
    const out = issues.map((issue) => {
      const old = before.get(issue.id);
      before.delete(issue.id);
      if (!old || !answered(old)) return issue;
      carried++;
      const answers = [...(issue.answers ?? [])];
      for (const a of old.answers ?? [])
        if (!answers.some((b) => same(a, b))) answers.push(a);
      return {
        ...issue,
        ...(old.status !== undefined && { status: old.status }),
        ...(old.raisedBy !== undefined &&
          issue.raisedBy === undefined && { raisedBy: old.raisedBy }),
        ...(old.raisedAt !== undefined &&
          issue.raisedAt === undefined && { raisedAt: old.raisedAt }),
        ...(answers.length > 0 && { answers }),
      };
    });
    if (carried)
      this.findings.push({
        severity: "info",
        code: "previous",
        message: `the status and answers of ${carried} issue(s) are carried from the previous revision`,
      });
    for (const old of before.values())
      if (answered(old))
        this.findings.push({
          severity: "info",
          code: "previous",
          message: `issue ${old.id} of the previous revision (${old.status ?? "answered"}) is no longer raised: ${old.text}`,
        });
    return out;
  }

  private assemble(): BomDocument | undefined {
    let failed = false;
    const error = (code: string, message: string) => {
      failed = true;
      this.findings.push({ severity: "error", code, message });
    };

    const parts: Record<string, Part> = {};
    for (const [id, entry] of this.parts) {
      const { provenance: _, ...rest } = entry.part;
      const usages = [...(this.usages.get(id)?.values() ?? [])].map((u) =>
        u.locations.length
          ? { ...u.usage, provenance: { locations: u.locations } }
          : u.usage,
      );
      parts[id] = {
        ...rest,
        ...(usages.length && { usages }),
        ...(entry.locations.length && {
          provenance: { locations: entry.locations },
        }),
      };
    }
    for (const [parent, list] of this.usages)
      if (!this.parts.has(parent))
        error(
          "unknown-parent",
          `usages are emitted in "${parent}" (first at ${where([...list.values()][0]?.locations[0] ?? {})}), but no part has that id: declare it in "document.parts" or emit it`,
        );

    const documents: Record<string, DocumentFile> = { ...this.base.documents };
    const file = (
      id: string,
      input: SourceInput,
      declared: { name?: string; type?: DocumentFile["type"]; uri?: string },
    ) => {
      if (documents[id])
        error(
          "config",
          `"${id}" is both an input of the import and a document of "document.documents"`,
        );
      const type =
        mediaType(input.file) ??
        (input.file.toLowerCase().endsWith(".json")
          ? "application/json"
          : undefined);
      documents[id] = {
        name: declared.name ?? input.file.replace(/^.*[\\/]/, ""),
        type: declared.type ?? "other",
        ...(type !== undefined && { mediaType: type }),
        ...(declared.uri !== undefined && { uri: declared.uri }),
        sha256: sha256(input.bytes),
        size: input.bytes.length,
      };
    };
    for (const [id, declared] of Object.entries(this.config.sources))
      file(
        id,
        this.sources.find((s) => s.id === id)!,
        declared,
      );
    for (const e of this.enrichments) file(e.input.id, e.input, {});

    // Organizations created by $org() are kept only if a part refers to them.
    const referenced = new Set<string>();
    for (const p of Object.values(parts)) {
      p.identifiers?.forEach((x) => referenced.add(x.issuer));
      p.manufacturerParts?.forEach((m) => referenced.add(m.manufacturer));
      p.supplierParts?.forEach((s) => referenced.add(s.supplier));
    }
    const organizations = Object.fromEntries(
      Object.entries(this.organizations).filter(
        ([id]) => !this.createdOrganizations.has(id) || referenced.has(id),
      ),
    );

    const issues = this.issueList();
    const b = this.base;
    const revision = this.options.revision ?? b.revision;
    const doc: BomDocument = {
      kind: "bom",
      specVersion: SPEC_VERSION,
      id: b.id,
      ...(revision !== undefined && { revision }),
      ...(b.name !== undefined && { name: b.name }),
      ...(b.issuedAt !== undefined && { issuedAt: b.issuedAt }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.approvals !== undefined && { approvals: b.approvals }),
      ...(b.owner !== undefined && { owner: b.owner }),
      products: b.products,
      parts,
      documents,
      ...(Object.keys(organizations).length > 0 && { organizations }),
      ...(b.options !== undefined && { options: b.options }),
      ...(b.imports !== undefined && { imports: b.imports }),
      ...(b.requires !== undefined && { requires: b.requires }),
      generator: {
        tool: TOOL,
        version: TOOL_VERSION,
        config: {
          ...(this.config.name !== undefined && { name: this.config.name }),
          ...(this.config.version !== undefined && {
            version: this.config.version,
          }),
          ...(this.options.configSha256 !== undefined && {
            sha256: this.options.configSha256,
          }),
        },
        sources: [
          ...Object.keys(this.config.sources),
          ...this.enrichments.map((e) => e.input.id),
        ],
      },
      ...(b.notes !== undefined && { notes: b.notes }),
      ...(issues.length > 0 && { issues }),
      ...(b.extensions !== undefined && { extensions: b.extensions }),
    };

    const structure = validateStructure(doc);
    if (!structure.success)
      for (const e of structure.errors)
        error(
          "structure",
          `the configuration produces an invalid document at ${e.path.replace(/^\$input/, "")}: expected ${e.expected}, got ${JSON.stringify(e.value)}`,
        );
    if (failed) return undefined;

    if (doc.imports)
      this.findings.push({
        severity: "info",
        code: "not-checked",
        message:
          "the document imports other BOMs: run `bomkit validate` on the written file",
      });
    else
      for (const f of checkAll({ file: "", doc, imports: new Map() }))
        this.findings.push({
          severity: f.severity,
          code: `check:${f.code}`,
          message: `${f.path}: ${f.message}`,
        });
    return doc;
  }
}
