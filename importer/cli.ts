// bomkit importer, run as `bomkit import`:
//
//   bomkit import <config.json> <source>... [-o <out.bom.json>] [--revision <R>]
//                 [--previous <old.bom.json>] [--enrich [<id>=]<file.json>]...
//
// Sources are given as <id>=<file>, or in the order of the configuration's
// "sources", skipping those given by name. An enrichment's id is its file
// name, made distinct from the sources and documents, unless given as
// <id>=<file>. The document goes to the output file, or to standard output;
// the report goes to standard error. Exit status 1 means nothing was written.
//
// Run with: npm run bomkit -- import <config.json> <source>…

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { BomDocument } from "../src/index.js";
import { serialize } from "../tools/lib/canonical.js";
import { sha256File } from "../tools/lib/load.js";
import { validateStructure } from "../tools/lib/structure.js";
import { ConfigError } from "./src/expr.js";
import {
  ImportResult,
  parseConfig,
  runImport,
  slug,
  SourceInput,
} from "./src/import.js";
import { IMPORT_USAGE } from "./usage.js";

const NAMED = /^([A-Za-z0-9_.:+-]+)=(.+)$/;

export function printReport(result: ImportResult): void {
  for (const s of result.sheets) {
    const r = s.rows;
    const name = s.sheet !== undefined ? `${s.source} "${s.sheet}"` : s.source;
    console.error(
      `${name}: header at row ${s.headerRow}; ${r.item} item(s), ${r.continuation} continuation(s), ${r.section} section(s), ${r.skip} skipped, ${r.empty} empty`,
    );
    if (s.emitted.length > 1 || s.emitted[0] !== r.item)
      console.error(
        `${name}: items emitted by ${s.emitted.map((n, i) => `emit[${i}]: ${n}`).join(", ")}`,
      );
    if (s.unmappedColumns.length)
      console.error(
        `${name}: columns not read: ${s.unmappedColumns.map((c) => JSON.stringify(c)).join(", ")}`,
      );
  }
  for (const f of result.findings)
    console.error(`${f.severity} [${f.code}] ${f.message}`);
  if (!result.doc) return;
  const parts = Object.values(result.doc.parts);
  const issues = result.doc.issues ?? [];
  const count = (severity: string) =>
    issues.filter((i) => i.severity === severity).length;
  console.error(
    `${parts.length} part(s), ${parts.reduce((n, p) => n + (p.usages?.length ?? 0), 0)} usage(s); ` +
      `issues: ${count("error")} error(s), ${count("warning")} warning(s), ${count("info")} info`,
  );
}

/** Runs the import command; returns the exit status. */
export async function importCommand(argv: string[]): Promise<number> {
  const usage = (): number => {
    console.error(`usage: bomkit ${IMPORT_USAGE}`);
    return 2;
  };
  const files: string[] = [];
  const enrichFiles: string[] = [];
  let out: string | undefined,
    revision: string | undefined,
    previousFile: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const value = () => (i + 1 < argv.length ? argv[++i]! : undefined);
    if (
      a === "-o" ||
      a === "--output" ||
      a === "--revision" ||
      a === "--previous" ||
      a === "--enrich"
    ) {
      const v = value();
      if (v === undefined) return usage();
      if (a === "--revision") revision = v;
      else if (a === "--previous") previousFile = v;
      else if (a === "--enrich") enrichFiles.push(v);
      else out = v;
    } else if (a.startsWith("-")) return usage();
    else files.push(a);
  }
  const [configFile, ...sourceArgs] = files;
  if (configFile === undefined || sourceArgs.length === 0) return usage();

  let config;
  try {
    config = parseConfig(JSON.parse(readFileSync(configFile, "utf8")));
  } catch (e) {
    console.error(
      `${configFile}: ${e instanceof ConfigError ? e.message : (e as Error).message}`,
    );
    return 1;
  }
  const ids = Object.keys(config.sources);
  const given = new Map<string, string>();
  const positional: string[] = [];
  for (const arg of sourceArgs) {
    const named = NAMED.exec(arg);
    if (!named || !ids.includes(named[1]!)) positional.push(arg);
    else if (given.has(named[1]!)) {
      console.error(`${arg}: a file is already given for source "${named[1]}"`);
      return 1;
    } else given.set(named[1]!, named[2]!);
  }
  const free = ids.filter((id) => !given.has(id));
  if (positional.length > free.length) {
    console.error(
      `${positional[free.length]}: the configuration declares ${ids.length} source(s): ${ids.join(", ")}${given.size ? `; ${given.size} given by name` : ""}`,
    );
    return 1;
  }
  positional.forEach((file, i) => given.set(free[i]!, file));
  const sources: SourceInput[] = [...given].map(([id, file]) => ({
    id,
    file: basename(file),
    bytes: readFileSync(file),
  }));

  let previous: BomDocument | undefined;
  if (previousFile !== undefined) {
    const r = validateStructure(JSON.parse(readFileSync(previousFile, "utf8")));
    if (!r.success || (r.data as { kind?: string }).kind !== "bom") {
      console.error(
        `${previousFile}: not a valid BOM document (run bomkit validate on it)`,
      );
      return 1;
    }
    previous = r.data as BomDocument;
  }
  // A name given by hand is kept as it is: runImport reports a clash.
  const taken = new Set([
    ...ids,
    ...Object.keys(config.document.documents ?? {}),
  ]);
  const enrichments: SourceInput[] = [];
  for (const arg of enrichFiles) {
    const named = existsSync(arg) ? null : NAMED.exec(arg);
    const file = named ? named[2]! : arg;
    let id = named?.[1];
    if (id === undefined) {
      const stem = slug(basename(file).replace(/\.json$/i, "")) ?? "enrichment";
      id = stem;
      for (let n = 2; taken.has(id); n++) id = `${stem}-${n}`;
    } else if (enrichments.some((e) => e.id === id)) {
      console.error(`${arg}: an enrichment is already given the id "${id}"`);
      return 1;
    }
    taken.add(id);
    enrichments.push({ id, file: basename(file), bytes: readFileSync(file) });
  }

  const result = await runImport(config, sources, {
    revision,
    configSha256: sha256File(configFile),
    previous,
    enrichments,
  });
  printReport(result);
  if (!result.doc) return 1;
  const json = serialize(result.doc);
  if (out !== undefined) writeFileSync(out, json);
  else process.stdout.write(json);
  return 0;
}
