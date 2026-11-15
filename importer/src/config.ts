// The import configuration: how one family of source tables maps to bomkit.
//
// The skeleton is declarative. JSONata expressions (https://jsonata.org)
// appear only in leaves: conditions (`when`) and values. The same sources and
// configuration always produce the same BOM.
//
// Inside an expression:
// - a bare name is a column declared in `columns` (`qty`, `mpn`), or a
//   value of `derive`;
// - `$sheet` is the sheet name, `$row` the 1-based row number;
// - `$ctx.<key>` is a value set by a `section` row;
// - `$prev.<column>` is the previous non-empty row (row rules only);
// - `$rows.<column>` lists the values of all rows of an item (emit only);
// - `$nth(key)` counts the rows of the sheet with that key so far (derive only).
//
// Cell values are text, trimmed; an empty cell is absent (`$exists(x)` is false).

import type { tags } from "typia";
import type {
  BomDocument,
  DocumentId,
  DocumentType,
  IssueCategory,
  IssueSeverity,
  Part,
  PartId,
  Uri,
  Usage,
} from "../../src/index.js";

/** A JSONata expression. */
export type Expr = string & tags.MinLength<1>;

export const FIELD_NAME_PATTERN = "^[A-Za-z_][A-Za-z0-9_]*$";

/** Name of a column inside expressions. */
export type FieldName = string & tags.Pattern<typeof FIELD_NAME_PATTERN>;

/**
 * Shape of a bomkit value in which every string is an expression. A leaf
 * that evaluates to nothing is left out; so are empty arrays and objects.
 */
export type Template = Expr | Template[] | { [key: string]: Template };

/**
 * Header texts accepted for a column. Matching ignores case and extra
 * white space. A column is required unless `optional` is set.
 */
export type Column =
  string | string[] | { header: string | string[]; optional?: boolean };

/**
 * What a row is. The first rule whose `when` holds applies; a rule without
 * `when` always applies. When `rows` is given, a row matching no rule is an
 * error.
 * - `item`: starts a new item;
 * - `continuation`: belongs to the item above;
 * - `section`: sets `$ctx` values for the rows below;
 * - `skip`: ignored, and counted in the report.
 */
export interface RowRule {
  role: "item" | "continuation" | "section" | "skip";
  when?: Expr;
  /** For `section` rows: values merged into `$ctx`. */
  ctx?: Record<FieldName, Expr>;
}

type PartFields = Omit<Part, "usages" | "steps" | "provenance">;
type UsageFields = Omit<Usage, "id" | "provenance">;

/** A part to create or complete. Parts emitted several times are merged. */
export type PartTemplate = { id: Expr } & {
  [K in keyof PartFields]?: Template;
};

/** A usage to add to `parent`. `part` defaults to the part emitted with it. */
export type UsageTemplate = { parent: Expr; id: Expr } & {
  [K in keyof UsageFields]?: Template;
};

/**
 * A review issue raised by a rule. Its id is derived from `key` (or, without
 * it, from the `text` expression) and from what the issue is about, so that
 * the same issue keeps its id, and its answers, in the next revision.
 */
export interface IssueTemplate {
  severity: IssueSeverity;
  category?: IssueCategory;
  /** Expression giving the text. */
  text: Expr;
  /**
   * Stable name of the question, used for the issue id instead of `text`:
   * set it before an answered issue's text is reworded.
   */
  key?: string & tags.Pattern<"^[A-Za-z0-9_.:+=-]+$">;
}

/**
 * Applied on top of the emission when `when` holds, in order: values replace
 * those of the emission. This is where corrections live, so that they are
 * applied again when the next revision of the source is imported.
 */
export interface Rule {
  when: Expr;
  part?: { [K in keyof PartTemplate]?: Template };
  usage?: { [K in keyof UsageTemplate]?: Template };
  issue?: IssueTemplate;
}

/** What one item produces: a part, a usage of it, or both. */
export interface Emit {
  when?: Expr;
  part?: PartTemplate;
  usage?: UsageTemplate;
  /**
   * The usage is expected to be emitted by several items with the same
   * content (an assembly named on each of its rows): identical emissions
   * are merged. Without it, two items giving the same usage id are
   * reported as duplicates.
   */
  shared?: boolean;
  rules?: Rule[];
}

export interface Table {
  /** Source file, when the configuration declares several. */
  source?: DocumentId;
  /** Sheets to read: names, or a regular expression. Defaults to all. */
  sheets?: string[] | { match: string };
  /**
   * Header row, 1-based. By default the first row, among the first 50,
   * in which every required column is found.
   */
  headerRow?: number & tags.Type<"uint32"> & tags.Minimum<1>;
  /** CSV delimiter. By default the most frequent of `,` `;` and tab in the first line. */
  delimiter?: "," | ";" | "\t";
  columns: Record<FieldName, Column>;
  /**
   * Values computed for every row from its cells, in order, and used like
   * columns afterwards: a cleaned part number, a number read once.
   */
  derive?: Record<FieldName, Expr>;
  rows?: RowRule[];
  emit: Emit[] & tags.MinItems<1>;
}

/** A source file. Its digest and size are recorded by the importer. */
export interface Source {
  name?: string;
  type?: DocumentType;
  /** Where the file is published, if it is. */
  uri?: Uri;
}

/** Everything of the BOM document that does not come from the tables. */
export type BaseDocument = Omit<
  BomDocument,
  "kind" | "specVersion" | "generator" | "parts"
> & {
  /**
   * Parts declared by hand: the products, and anything the tables cannot
   * say. Their values take precedence over emitted ones; each emitted value
   * they hide is raised as an `info` issue.
   */
  parts?: Record<PartId, Part>;
};

export interface ImportConfig {
  /** URI of the JSON Schema, for editors. Ignored by the importer. */
  $schema?: string;
  kind: "importConfig";
  configVersion: "0.1";
  name?: string;
  version?: string;
  sources: Record<DocumentId, Source>;
  document: BaseDocument;
  tables: Table[] & tags.MinItems<1>;
}

/** The fields of a part that an enrichment can set. */
export type PartPatch = Partial<Omit<Part, "usages" | "steps" | "provenance">>;

/**
 * Values curated by hand for imported parts, kept apart from the
 * configuration: properties, documents, names. Each part must be one the
 * import produces. Values replace the imported ones (objects are merged key
 * by key); each imported value they hide is raised as an `info` issue, so a
 * change in the source still shows.
 */
export interface Enrichment {
  /** URI of the JSON Schema, for editors. Ignored by the importer. */
  $schema?: string;
  kind: "importEnrichment";
  configVersion: "0.1";
  parts: Record<PartId, PartPatch>;
}
