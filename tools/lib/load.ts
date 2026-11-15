// Loading a BOM document and the documents it imports, and resolving
// references (`"id"` or `"alias#id"`) across them.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BomDocument, Organization, Part } from "../../src/index.js";
import { StructureError, validateStructure } from "./structure.js";

export interface Finding {
  severity: "error" | "warning" | "info";
  /** Stable code, e.g. `unresolved-part`. */
  code: string;
  file: string;
  /** Where in the document, as a JSON Pointer. */
  path: string;
  message: string;
}

export interface LoadedBom {
  file: string;
  doc: BomDocument;
  /** Loaded imports by alias. Missing when the import could not be loaded. */
  imports: Map<string, LoadedBom>;
}

export interface LoadResult {
  bom?: LoadedBom;
  findings: Finding[];
}

export function structureFindings(
  file: string,
  errors: StructureError[],
): Finding[] {
  return errors.map((e) => ({
    severity: "error",
    code: "structure",
    file,
    path: e.path.replace(/^\$input/, ""),
    message: `expected ${e.expected}, got ${JSON.stringify(e.value)}`,
  }));
}

export function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** JSON Pointer from path segments. */
export function pointer(...segments: (string | number)[]): string {
  return segments
    .map((s) => "/" + String(s).replace(/~/g, "~0").replace(/\//g, "~1"))
    .join("");
}

function localPath(uri: string, base: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) {
    return uri.startsWith("file:") ? fileURLToPath(uri) : undefined;
  }
  return resolve(dirname(base), uri);
}

/**
 * Reads and structurally validates a BOM file, then its imports, recursively.
 * Structural errors stop the load of that file; problems with imports are
 * reported and leave the alias unloaded.
 */
export function loadBomFile(
  file: string,
  cache = new Map<string, LoadedBom>(),
  stack: string[] = [],
): LoadResult {
  const abs = resolve(file);
  const cached = cache.get(abs);
  if (cached) return { bom: cached, findings: [] };
  const findings: Finding[] = [];
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    findings.push({
      severity: "error",
      code: "unreadable",
      file: abs,
      path: "",
      message: (e as Error).message,
    });
    return { findings };
  }
  const structure = validateStructure(input);
  if (!structure.success)
    return { findings: structureFindings(abs, structure.errors) };
  if (structure.data.kind !== "bom") {
    findings.push({
      severity: "error",
      code: "not-a-bom",
      file: abs,
      path: "/kind",
      message: `expected a BOM document, got ${structure.data.kind}`,
    });
    return { findings };
  }
  const bom: LoadedBom = { file: abs, doc: structure.data, imports: new Map() };
  cache.set(abs, bom);
  for (const [alias, imp] of Object.entries(bom.doc.imports ?? {})) {
    const at = pointer("imports", alias);
    const target = localPath(imp.uri, abs);
    if (!target) {
      findings.push({
        severity: "warning",
        code: "import-not-loaded",
        file: abs,
        path: at,
        message: `remote import ${imp.uri} is not loaded; references to "${alias}#…" are not checked`,
      });
      continue;
    }
    if (stack.includes(target) || target === abs) {
      findings.push({
        severity: "error",
        code: "import-cycle",
        file: abs,
        path: at,
        message: `import cycle through ${imp.uri}`,
      });
      continue;
    }
    const sub = loadBomFile(target, cache, [...stack, abs]);
    findings.push(...sub.findings);
    if (!sub.bom) {
      findings.push({
        severity: "error",
        code: "import-failed",
        file: abs,
        path: at,
        message: `could not load ${imp.uri}`,
      });
      continue;
    }
    if (imp.id !== undefined && imp.id !== sub.bom.doc.id) {
      findings.push({
        severity: "error",
        code: "import-id",
        file: abs,
        path: at,
        message: `expected document ${imp.id}, found ${sub.bom.doc.id}`,
      });
    }
    if (imp.revision !== undefined && imp.revision !== sub.bom.doc.revision) {
      findings.push({
        severity: "warning",
        code: "import-revision",
        file: abs,
        path: at,
        message: `expected revision ${imp.revision}, found ${sub.bom.doc.revision ?? "(none)"}`,
      });
    }
    if (imp.sha256 !== undefined && imp.sha256 !== sha256File(target)) {
      findings.push({
        severity: "error",
        code: "import-digest",
        file: abs,
        path: at,
        message: `sha256 of ${imp.uri} does not match`,
      });
    }
    bom.imports.set(alias, sub.bom);
  }
  return { bom, findings };
}

export type Resolved<T> =
  | { ok: true; bom: LoadedBom; id: string; value: T }
  /** `unchecked`: the reference points into an import that was not loaded. */
  | { ok: false; unchecked: boolean; reason: string };

function resolveRef<T>(
  bom: LoadedBom,
  ref: string,
  pick: (doc: BomDocument) => Record<string, T> | undefined,
  what: string,
): Resolved<T> {
  const aliases = ref.split("#");
  const id = aliases.pop()!;
  let target = bom;
  for (const alias of aliases) {
    if (!target.doc.imports?.[alias])
      return {
        ok: false,
        unchecked: false,
        reason: `import alias "${alias}" is not declared`,
      };
    const sub = target.imports.get(alias);
    if (!sub)
      return {
        ok: false,
        unchecked: true,
        reason: `import "${alias}" is not loaded`,
      };
    target = sub;
  }
  const value = pick(target.doc)?.[id];
  if (value === undefined)
    return {
      ok: false,
      unchecked: false,
      reason: `${what} "${ref}" does not exist`,
    };
  return { ok: true, bom: target, id, value };
}

export const resolvePart = (bom: LoadedBom, ref: string) =>
  resolveRef<Part>(bom, ref, (d) => d.parts, "part");
export const resolveOrganization = (bom: LoadedBom, ref: string) =>
  resolveRef<Organization>(bom, ref, (d) => d.organizations, "organization");
