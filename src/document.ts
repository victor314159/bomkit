// The BOM document: the root object of a `.bom.json` file.

import type { tags } from "typia";
import { Option } from "./applicability.js";
import {
  DocumentId,
  DocumentUri,
  Identifier,
  ImportAlias,
  IsoDateTime,
  MediaType,
  Note,
  OptionId,
  Organization,
  OrganizationId,
  OrganizationRef,
  PartId,
  PartRef,
  PrivateExtensions,
  Sha256,
  Uri,
} from "./common.js";
import { Issue } from "./issues.js";
import { SubcontractDocument } from "./modules/subcontract.js";
import { Part } from "./part.js";

export const SPEC_VERSION = "0.1";
export type SpecVersion = typeof SPEC_VERSION;

/** Modules defined by this specification. */
export type ModuleName = "subcontract";

export type DocumentType =
  | "datasheet"
  | "drawing"
  | "ecad"
  | "mcad"
  /** Gerbers, drill files, pick-and-place, cutting files… */
  | "fabrication"
  | "specification"
  | "instructions"
  | "image"
  | "certificate"
  | "software"
  /** Spreadsheets, exports and other files that are neither of the above. */
  | "other";

/**
 * A file referenced by the BOM. Files are linked, not embedded. At least
 * one of `uri` and `sha256` MUST be present; `sha256` makes the reference
 * verifiable and lets a package store files by content.
 */
export type DocumentFile = {
  name: string & tags.MinLength<1>;
  type: DocumentType;
  mediaType?: MediaType;
  /** Size in bytes. */
  size?: number & tags.Type<"uint64">;
  /** Document number and revision as issued by its owner. */
  identifiers?: Identifier[];
  notes?: Note[];
} & ({ uri: Uri; sha256?: Sha256 } | { uri?: undefined; sha256: Sha256 });

/**
 * Value given to an option of an imported document: a fixed value, or the
 * value of an option of the importing document.
 */
export type OptionBinding = string | boolean | { option: OptionId };

/** Another BOM document whose parts can be referenced as `"<alias>#<PartId>"`. */
export interface ImportedBom {
  uri: Uri;
  /** Expected {@link BomDocument.id}. */
  id?: DocumentUri;
  revision?: string;
  sha256?: Sha256;
  /**
   * Options of the imported document, keyed by their id there. A
   * configuration only names options of the document it is evaluated on;
   * options of an imported document get their value from here, else from
   * their `default`, else they cannot be evaluated.
   */
  options?: Record<OptionId, OptionBinding>;
}

/**
 * Release state of a BOM revision.
 * - `draft`: work in progress, may change without a new revision;
 * - `released`: frozen; any change makes a new revision;
 * - `obsolete`: withdrawn, kept for reference.
 */
export type ReleaseStatus = "draft" | "released" | "obsolete";

/** A sign-off of this revision: review, approval, release. */
export interface Approval {
  /** What was signed off, e.g. `"design"`, `"quality"`, `"release"`. */
  role?: string;
  /** Person, as named by the organization. */
  by: string & tags.MinLength<1>;
  organization?: OrganizationRef;
  at: IsoDateTime;
  notes?: Note[];
}

/** How this document was produced: the "recipe" that makes it reproducible. */
export interface Generator {
  tool: string & tags.MinLength<1>;
  version?: string;
  /** Mapping configuration used by an importer. */
  config?: { name?: string; version?: string; uri?: Uri; sha256?: Sha256 };
  /**
   * Files the content was extracted from (customer spreadsheet, ECAD
   * project…). Being a source is a role, not a document type: a schematic
   * keeps type `ecad` or `drawing` and is listed here.
   */
  sources?: DocumentId[];
}

export interface BomDocumentExtensions extends PrivateExtensions {
  subcontract?: SubcontractDocument;
}

/**
 * One revision of a BOM. Each revision is a separate document with the same
 * `id`; the difference between two revisions is a {@link ChangeSet}.
 */
export interface BomDocument {
  kind: "bom";
  specVersion: SpecVersion;
  /** Stable across revisions of the same BOM. */
  id: DocumentUri;
  /** Revision of this BOM, as named by its owner. */
  revision?: string;
  name?: string;
  issuedAt?: IsoDateTime;
  /** Defaults to `draft`. */
  status?: ReleaseStatus;
  approvals?: Approval[];
  /** Organization that owns the content (the design authority). */
  owner?: OrganizationRef;
  /** End items described by this document. */
  products: PartRef[] & tags.MinItems<1> & tags.UniqueItems;
  parts: Record<PartId, Part>;
  documents?: Record<DocumentId, DocumentFile>;
  /**
   * Organizations declared by this document. An organization of an
   * imported document is referred to as `"alias#orgId"` rather than
   * declared again.
   */
  organizations?: Record<OrganizationId, Organization>;
  /** Configuration choices referenced by applicability conditions. */
  options?: Record<OptionId, Option>;
  imports?: Record<ImportAlias, ImportedBom>;
  /**
   * Modules a consumer MUST understand to interpret this document
   * correctly. A consumer MUST reject a document requiring a module it
   * does not support.
   */
  requires?: ModuleName[] & tags.UniqueItems;
  generator?: Generator;
  notes?: Note[];
  /** Review issues found in this document. */
  issues?: Issue[];
  extensions?: BomDocumentExtensions;
}
