// Review issues: problems found in a BOM that need an answer, typically
// raised by an importer or a reviewer and sent back to the BOM's owner.
// Notes state facts; issues ask questions and track their answers.

import type { tags } from "typia";
import {
  DocumentId,
  Id,
  IsoDateTime,
  JsonPointer,
  OrganizationRef,
  PartId,
  Provenance,
  UsageId,
} from "./common.js";

/**
 * What an issue is about. `usage` is a usage of `part`. `field` narrows it
 * to one value, as a JSON Pointer within that object
 * (`/properties/ratedVoltage`).
 */
export type IssueSubject =
  | { part: PartId; usage?: UsageId; field?: JsonPointer }
  | { document: DocumentId };

export type IssueSeverity =
  /** Blocks use of the BOM (buying, building) until resolved. */
  | "error"
  /** Must be answered, but work on the rest can go on. */
  | "warning"
  /** For confirmation: an assumption made while reading the source. */
  | "info";

export type IssueCategory =
  /** Information needed and absent (voltage rating, cable type…). */
  | "missing"
  /** Two sources, or two places of one source, disagree. */
  | "conflict"
  /** Present but open to several readings. */
  | "ambiguous"
  /** Interpreted by the importer; to confirm. */
  | "assumption"
  | (string & {});

export interface IssueAnswer {
  text: string & tags.MinLength<1>;
  by?: OrganizationRef;
  at?: IsoDateTime;
}

export interface Issue {
  /** Unique within the document. */
  id: Id;
  severity: IssueSeverity;
  category?: IssueCategory;
  text: string & tags.MinLength<1>;
  subjects?: IssueSubject[];
  /** Defaults to `open`. */
  status?: "open" | "answered" | "resolved" | "rejected";
  raisedBy?: OrganizationRef;
  raisedAt?: IsoDateTime;
  answers?: IssueAnswer[];
  /** Where in the source the problem shows. */
  provenance?: Provenance;
}
