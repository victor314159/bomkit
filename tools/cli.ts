// bomkit reference tool.
//
//   bomkit validate <file>...              structure (typia) + semantic checks
//   bomkit buy <file> [--product P] [--qty N] [--option K=V]... [--serial S] [--lot L] [--date D]
//   bomkit diff <old> <new> [--matches F] [--html file.html] change set as JSON or HTML
//   bomkit import <config> <source>...     CSV and Excel tables to a BOM document (see importer/README.md)
//   bomkit html <file> [--output file.html] standalone HTML viewer (stdout by default)
//
// Run with: npm run bomkit -- <command> …

import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import typia from "typia";
import { IMPORT_USAGE } from "../importer/usage.js";
import { BomkitDocument, Configuration, IdentityMatch } from "../src/index.js";
import { BuyOptions, buyingBom } from "./lib/buy.js";
import { serialize } from "./lib/canonical.js";
import { checkAll } from "./lib/check.js";
import { diff } from "./lib/diff.js";
import { renderDiffHtml } from "./lib/diff-html.js";
import { renderHtml } from "./lib/html.js";
import {
  Finding,
  LoadedBom,
  loadBomFile,
  sha256File,
  structureFindings,
} from "./lib/load.js";
import { validateStructure } from "./lib/structure.js";

function print(findings: Finding[]) {
  for (const f of findings) {
    console.error(
      `${relative(process.cwd(), f.file)}${f.path ? " " + f.path : ""}: ${f.severity} [${f.code}] ${f.message}`,
    );
  }
}

function load(file: string) {
  const { bom, findings } = loadBomFile(file);
  if (!bom) {
    print(findings);
    process.exit(1);
  }
  return { bom, findings };
}

function validate(files: string[]): number {
  let errors = 0;
  const checked = new Set<string>();
  for (const file of files) {
    let input: unknown;
    try {
      input = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      console.error(`${file}: error [unreadable] ${(e as Error).message}`);
      errors++;
      continue;
    }
    let findings: Finding[];
    if ((input as { kind?: string })?.kind === "bom") {
      const loaded = loadBomFile(file);
      findings = [
        ...loaded.findings,
        ...(loaded.bom ? checkAll(loaded.bom, checked) : []),
      ];
    } else {
      const r = validateStructure(input);
      findings = r.success ? [] : structureFindings(file, r.errors);
    }
    print(findings);
    const n = findings.filter((f) => f.severity === "error").length;
    errors += n;
    console.error(
      `${file}: ${n ? `${n} error(s)` : "valid"}, ${findings.filter((f) => f.severity === "warning").length} warning(s)`,
    );
  }
  return errors ? 1 : 0;
}

function parseFlags(args: string[]) {
  const flags: Record<string, string[]> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) (flags[a.slice(2)] ??= []).push(args[++i] ?? "");
    else rest.push(a);
  }
  return { flags, rest };
}

/** Writes a document the tool computed, after checking it against its own schema. */
function emit(doc: BomkitDocument): number {
  const r = validateStructure(doc);
  if (!r.success) {
    for (const e of r.errors)
      console.error(
        `error [structure] ${e.path}: expected ${e.expected}, got ${JSON.stringify(e.value)}`,
      );
    return 1;
  }
  process.stdout.write(serialize(doc));
  return 0;
}

const BUY_FLAGS = ["product", "qty", "option", "serial", "lot", "date"];
const KNOWN_FLAGS = {
  buy: BUY_FLAGS,
  diff: ["matches", "html"],
  html: ["output", ...BUY_FLAGS],
};

function checkFlags(
  command: keyof typeof KNOWN_FLAGS,
  flags: Record<string, string[]>,
) {
  for (const f of Object.keys(flags))
    if (!KNOWN_FLAGS[command].includes(f))
      throw new Error(`unknown option --${f}`);
}

function buy(args: string[]): number {
  const { flags, rest } = parseFlags(args);
  checkFlags("buy", flags);
  const { bom } = load(rest[0]!);
  return emit(buyingBom(bom, buyOptions(bom, flags)));
}

function buyOptions(
  bom: LoadedBom,
  flags: Record<string, string[]>,
): BuyOptions {
  const configuration: Configuration = {};
  for (const kv of flags.option ?? []) {
    const eq = kv.indexOf("=");
    const k = eq < 0 ? kv : kv.slice(0, eq);
    const v = eq < 0 ? "true" : kv.slice(eq + 1);
    const option = bom.doc.options?.[k];
    if (!option) throw new Error(`option "${k}" is not declared`);
    if (option.values) {
      if (!option.values.includes(v))
        throw new Error(
          `"${v}" is not a value of option "${k}" (${option.values.join(", ")})`,
        );
      (configuration.options ??= {})[k] = v;
    } else {
      if (v !== "true" && v !== "false")
        throw new Error(
          `option "${k}" is boolean: give ${k}=true or ${k}=false`,
        );
      (configuration.options ??= {})[k] = v === "true";
    }
  }
  if (flags.serial) configuration.serial = flags.serial[0]!;
  if (flags.lot) configuration.lot = flags.lot[0]!;
  if (flags.date) configuration.date = flags.date[0]!;
  return {
    product: flags.product?.[0],
    buildQuantity: Number(flags.qty?.[0] ?? 1),
    configuration: Object.keys(configuration).length
      ? configuration
      : undefined,
  };
}

function diffCmd(args: string[]): number {
  const { flags, rest } = parseFlags(args);
  checkFlags("diff", flags);
  if (rest.length !== 2) throw new Error("diff takes two files: <old> <new>");
  if (flags.html && (flags.html.length !== 1 || !flags.html[0]))
    throw new Error("--html takes one filename");
  const from = load(rest[0]!);
  const to = load(rest[1]!);
  const a = from.bom;
  const b = to.bom;
  if (a.doc.id !== b.doc.id)
    console.error(
      `warning: comparing two different BOMs (${a.doc.id}, ${b.doc.id})`,
    );
  const identityMatches = flags.matches
    ? typia.json.assertParse<IdentityMatch[]>(
        readFileSync(flags.matches[0]!, "utf8"),
      )
    : undefined;
  const result = diff(a.doc, b.doc, {
    identityMatches,
    sha256: { from: sha256File(a.file), to: sha256File(b.file) },
  });
  if (flags.html) {
    const findings = [...from.findings, ...to.findings];
    print(findings);
    if (findings.some((f) => f.severity === "error")) return 1;
    writeFileSync(flags.html[0]!, renderDiffHtml(a, b, result, findings));
    return 0;
  }
  return emit(result);
}

function html(args: string[]): number {
  const { flags, rest } = parseFlags(args);
  checkFlags("html", flags);
  if (rest.length !== 1)
    throw new Error("html takes one BOM file: <file> [--output file.html]");
  if (flags.output && (flags.output.length !== 1 || !flags.output[0]))
    throw new Error("--output takes one filename");
  const { bom, findings } = load(rest[0]!);
  print(findings);
  if (findings.some((f) => f.severity === "error")) return 1;
  const output = renderHtml(bom, findings, buyOptions(bom, flags));
  if (flags.output) writeFileSync(flags.output[0]!, output);
  else process.stdout.write(output);
  return 0;
}

const [command, ...args] = process.argv.slice(2);
// The importer and its dependencies are loaded only by the command that uses them.
const importCmd = async (args: string[]) =>
  (await import("../importer/cli.js")).importCommand(args);
const commands: Record<string, (args: string[]) => number | Promise<number>> = {
  validate,
  buy,
  diff: diffCmd,
  import: importCmd,
  html,
};
const run = command ? commands[command] : undefined;
if (!run || !args.length) {
  console.error(
    "usage: bomkit validate <file>... | buy <file> [--product P] [--qty N] [--option K=V] [--serial S] [--lot L] [--date D] | diff <old> <new> [--matches F] [--html file.html] | html <file> [--output file.html] | " +
      IMPORT_USAGE,
  );
  process.exit(2);
}
// Setting the exit code, rather than exiting, lets a document written to a
// pipe be flushed: on macOS, writes to a pipe are asynchronous.
try {
  process.exitCode = await run(args);
} catch (e) {
  console.error(`error: ${(e as Error).message}`);
  process.exitCode = 1;
}
