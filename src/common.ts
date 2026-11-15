// Shared primitives used across the specification.
//
// Constraints are written as typia tags (https://typia.io/docs/validators/tags/):
// they are type-level only, and are compiled into both the JSON Schemas
// (`npm run schema`) and the runtime validators of the reference tool. Constraints that span several objects (references that must resolve,
// designator counts…) cannot be expressed this way: they are checked by
// `bomkit validate` and listed in the README.

import type { tags } from "typia";

/**
 * Identifier of an object inside one BOM document (part, usage, document,
 * organization, option, step, issue).
 *
 * Ids MUST be stable across revisions of the same BOM: the same physical
 * thing keeps the same id. Importers SHOULD derive ids from natural keys
 * (customer part number, designator, find number…) rather than generating
 * random ones, otherwise revisions cannot be compared.
 *
 * Allowed characters: ASCII letters, digits, `-`, `_`, `.`, `:`, and `+`, `=`
 * so that IEC 81346 designations (`=A1+K2-Q3`) can be used as ids. `#` and `/`
 * are reserved (see {@link PartRef} and occurrence paths).
 */
export type Id = string & tags.Pattern<"^[A-Za-z0-9_.:+=-]+$">;

export type PartId = Id;
export type UsageId = Id;
export type DocumentId = Id;
export type OrganizationId = Id;
export type OptionId = Id;
export type StepId = Id;

/** Alias under which another BOM document is imported. Same characters as an {@link Id}. */
export type ImportAlias = Id;

/**
 * Identifier of a whole BOM or change-set document: an absolute URI, stable
 * across revisions. Use `urn:uuid:<uuid>` for a UUID.
 */
export type DocumentUri = string & tags.Format<"uri">;

/**
 * Reference to an object that may live in another BOM document:
 * - `"<Id>"` refers to an object of the same BOM document;
 * - `"<importAlias>#<Id>"` refers to an object of another BOM document
 *   declared in {@link BomDocument.imports};
 * - `"<alias>#<alias>#<Id>"` goes through several imports: the second alias
 *   is declared by the document the first one imports, and so on. Usages
 *   normally refer to their direct imports only; chains are mostly for
 *   derived views, which name parts from the root document.
 */
export type Ref = string &
  tags.Pattern<"^([A-Za-z0-9_.:+=-]+#)*[A-Za-z0-9_.:+=-]+$">;

/** Reference to a part, local or imported (`"alias#partId"`). */
export type PartRef = Ref;

/**
 * Reference to an organization, local or imported (`"alias#orgId"`). Referring
 * to an imported organization, instead of declaring it again, states that it
 * is the same organization.
 */
export type OrganizationRef = Ref;

/** ISO 8601 date, e.g. `2026-10-13`. */
export type IsoDate = string & tags.Format<"date">;
/** ISO 8601 date-time, e.g. `2026-10-13T09:30:00Z`. */
export type IsoDateTime = string & tags.Format<"date-time">;
/** Lowercase hex SHA-256 digest of a file's bytes. */
export type Sha256 = string & tags.Pattern<"^[0-9a-f]{64}$">;
/** Absolute URI, or a path relative to the BOM document's location. */
export type Uri = string & tags.Format<"uri-reference">;
/** JSON Pointer (RFC 6901), e.g. `/properties/ratedVoltage`. */
export type JsonPointer = string & tags.Pattern<"^(/([^~/]|~[01])*)*$">;
/** IANA media type, e.g. `application/pdf`. */
export type MediaType = string &
  tags.Pattern<"^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+(;.*)?$">;

/**
 * Unit of measure as a case-sensitive UCUM code (https://ucum.org).
 * `"1"` means pieces ("each", "pcs", "EA"). Examples: `"m"`, `"mm"`, `"kg"`,
 * `"g"`, `"L"`, `"mL"`, `"m2"`.
 */
export type Unit = string & tags.MinLength<1>;

/**
 * How a quantity scales with the number of units built.
 * - `perUnit`: consumed by every unit of the parent (the normal case).
 * - `perLot`: needed once per production lot, regardless of lot size
 *   (stencil, fixture, tooling, setup scrap).
 * - `asRequired`: consumed in a quantity that is not defined by the BOM
 *   (glue, solder, cable ties, "AR" in spreadsheets). `value`, if present,
 *   is an estimate per unit.
 */
export type QuantityBasis = "perUnit" | "perLot" | "asRequired";

/** A non-negative amount. */
export type Amount = number & tags.Minimum<0>;

/** A non-negative whole-number count. The explicit bound also applies in JSON Schema. */
export type Count = number & tags.Type<"uint32"> & tags.Maximum<4294967295>;

/** Quantity of a part used by a parent. `unit` defaults to the part's unit, then `"1"`. */
export type Quantity =
  | { basis?: "perUnit" | "perLot"; value: Amount; unit?: Unit }
  | { basis: "asRequired"; value?: Amount; unit?: Unit };

/** A company or other body that issues part numbers or makes parts. */
export interface Organization {
  name: string & tags.MinLength<1>;
  /** Other spellings found in source data ("TI", "Texas Instr."). */
  aliases?: string[];
  website?: string & tags.Format<"uri">;
  /**
   * Registry codes such as CAGE, DUNS, VAT. Two organizations declared in
   * different documents are the same when they share a code.
   */
  codes?: {
    scheme: string & tags.MinLength<1>;
    value: string & tags.MinLength<1>;
  }[];
}

/**
 * A number assigned to a part or document by an organization: customer part
 * number, internal part number, drawing number, NSN, GTIN…
 * Manufacturer part numbers of catalog items go in
 * {@link ManufacturerPart} instead.
 */
export interface Identifier {
  issuer: OrganizationRef;
  value: string & tags.MinLength<1>;
  revision?: string;
  /**
   * Defaults to `partNumber`. `standard` is a standard-part number defined
   * by a standards body or a design authority (ISO 4762 M3x10, NAS6604-12,
   * ABS0365-08): any source qualified to that standard may supply it.
   * Other known values: `drawingNumber`, `gtin`, `nsn`.
   */
  type?:
    | "partNumber"
    | "standard"
    | "drawingNumber"
    | "gtin"
    | "nsn"
    | (string & {});
}

/** A deviation, either the same both ways (`5`) or different above and below. */
export type Deviation = Amount | { plus: Amount; minus: Amount };

/**
 * Tolerance on a nominal value: relative, in percent of the value
 * (`{ percent: 5 }` for ±5 %, `{ percent: { plus: 80, minus: 20 } }` for
 * +80/−20 %), or absolute, in the unit of the value (`{ absolute: 0.1 }`).
 * Parts per million are percent: 50 ppm is `{ percent: 0.005 }`.
 */
export type Tolerance =
  | { percent: Deviation; absolute?: undefined }
  | { absolute: Deviation; percent?: undefined };

/**
 * A nominal value with its unit: `{ value: 10, unit: "kOhm", tolerance: { percent: 1 } }`.
 * `U` restricts the unit for core/profile properties; the default remains open for dictionary/private values.
 */
export interface Measure<U extends Unit = Unit> {
  value: number;
  unit: U;
  tolerance?: Tolerance;
}

/**
 * Limits rather than a nominal value (`min` and/or `max`, inclusive):
 * operating temperature, input voltage…
 */
export type Range<U extends Unit = Unit> =
  | { min: number; max?: number; unit: U }
  | { min?: undefined; max: number; unit: U };

/** Typed property value. Numbers with a physical meaning carry their unit. */
export type PropertyValue = string | number | boolean | Measure | Range;

/** A fact worth knowing. Questions that need an answer are issues. */
export interface Note {
  text: string & tags.MinLength<1>;
  kind?: "info" | "instruction";
}

/**
 * Where a value came from in a source file: spreadsheet (sheet, row,
 * column), PDF (page) or CAD file (element).
 */
export interface SourceLocation {
  /** The source file, declared in {@link BomDocument.documents}. */
  document: DocumentId;
  /**
   * Named element inside a structured file: part name in an ECAD/MCAD
   * file (`"RN2"`), device tag in an EPLAN project, id in an XML/JSON file.
   */
  element?: string;
  sheet?: string;
  /** 1-based row number. */
  row?: number & tags.Type<"uint32"> & tags.Minimum<1>;
  /** Column letter(s), e.g. `"H"`. */
  column?: string & tags.Pattern<"^[A-Z]+$">;
  /**
   * The text as it stands in the source, before any interpretation
   * (`"10k 1% 0603"`, `"2,5 mm²"`): a reviewer can check what the importer
   * understood without opening the file.
   */
  text?: string;
  /** 1-based page number. */
  page?: number & tags.Type<"uint32"> & tags.Minimum<1>;
}

/**
 * Traceability back to the source data. Strongly recommended for imported
 * BOMs: it lets a reviewer check any value against the customer's file.
 */
export interface Provenance {
  locations: SourceLocation[] & tags.MinItems<1>;
}

/**
 * Extensions are namespaced. Keys starting with `x-` are private and need no
 * registration. Other keys are reserved for modules defined by this
 * specification.
 */
export type PrivateExtensions = { [key: `x-${string}`]: unknown };
