// Builds the JSON Schemas (draft 2020-12) from the TypeScript types in src/,
// with typia. Written to generated/schema/ by `npm run schema`.
//
// typia emits OpenAPI-style output ("#/components/schemas/…"). It is turned
// into standalone 2020-12 schemas, with two fix-ups for what typia cannot
// express in JSON Schema (its runtime validators do check them):
// - private keys (`x-${string}` index signatures, in extensions and in
//   `Properties`): typia emits `additionalProperties`, replaced by
//   `patternProperties: { "^x-": … }` and `additionalProperties: false`;
// - keys of Record<Id, …> maps (typia names them `RecordId…`): `propertyNames`
//   with the pattern of the `Id` definition; likewise for the column names of
//   an import configuration (`RecordFieldName…`).

import { readFileSync } from "node:fs";
import typia from "typia";
import {
  Enrichment,
  FIELD_NAME_PATTERN,
  ImportConfig,
} from "../../importer/src/config.js";
import {
  BomDocument,
  BuyingBom,
  ChangeSet,
  DICTIONARY_KEY_PATTERN,
} from "../../src/index.js";

// A schema is identified by where its release publishes it: the assets of
// the GitHub release of this version.
const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string; repository: { url: string } };
const BASE = `${pkg.repository.url.replace(/\.git$/, "")}/releases/download/v${pkg.version}/`;

export type Json = { [key: string]: unknown };

/** Keys of `Properties` beyond the core ones: private, or named by a dictionary (see `DictionaryKey` in src/properties.ts). */
const PROPERTY_KEYS = `^x-|${DICTIONARY_KEY_PATTERN}`;

function standalone(
  unit: { components: unknown; schema: unknown },
  file: string,
  title: string,
  description: string,
): Json {
  const defs = ((unit.components as Json).schemas ?? {}) as Json;
  const idPattern = (defs.Id as Json).pattern;
  const fix = (node: unknown, defName?: string): unknown => {
    if (Array.isArray(node)) return node.map((n) => fix(n));
    if (!node || typeof node !== "object") return node;
    const out: Json = {};
    for (const [k, v] of Object.entries(node as Json)) {
      if (k === "$ref" && typeof v === "string")
        out[k] = v.replace("#/components/schemas/", "#/$defs/");
      else out[k] = fix(v);
    }
    const ap = out.additionalProperties;
    if (
      out.type === "object" &&
      ap &&
      typeof ap === "object" &&
      Object.keys(ap).length === 0
    ) {
      out.patternProperties = { "^x-": {} };
      out.additionalProperties = false;
    }
    // `Properties`: the index signatures are for `x-` keys and for keys
    // of a dictionary (`etim:EF000008`) only.
    if (defName === "Properties") {
      out.patternProperties = { [PROPERTY_KEYS]: out.additionalProperties };
      out.additionalProperties = false;
    }
    if (defName?.startsWith("RecordId"))
      out.propertyNames = { pattern: idPattern };
    if (defName?.startsWith("RecordFieldName"))
      out.propertyNames = { pattern: FIELD_NAME_PATTERN };
    return out;
  };
  const $defs: Json = {};
  for (const name of Object.keys(defs).sort())
    $defs[name] = fix(defs[name], name);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: BASE + file,
    title,
    description,
    ...(fix(unit.schema) as Json),
    $defs,
  };
}

/** File name in generated/schema/ → schema. */
export function buildSchemas(): Record<string, Json> {
  return {
    "bom.schema.json": standalone(
      typia.json.schema<BomDocument>(),
      "bom.schema.json",
      "bomkit BOM document",
      "One revision of a bill of materials (.bom.json).",
    ),
    "change-set.schema.json": standalone(
      typia.json.schema<ChangeSet>(),
      "change-set.schema.json",
      "bomkit change set",
      "The difference between two revisions of a BOM document (.change.json).",
    ),
    "buying-bom.schema.json": standalone(
      typia.json.schema<BuyingBom>(),
      "buying-bom.schema.json",
      "bomkit buying BOM",
      "Derived view: what must be procured to build N units of a product.",
    ),
    "import-config.schema.json": standalone(
      typia.json.schema<ImportConfig>(),
      "import-config.schema.json",
      "bomkit import configuration",
      "How a family of CSV or Excel tables maps to a bomkit BOM document (see importer/README.md).",
    ),
    "import-enrichment.schema.json": standalone(
      typia.json.schema<Enrichment>(),
      "import-enrichment.schema.json",
      "bomkit import enrichment",
      "Values curated by hand for the parts of an import, kept apart from its configuration.",
    ),
  };
}
