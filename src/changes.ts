// Change sets: the difference between two revisions of a BOM document,
// optionally carried through an engineering change process.

import type { tags } from "typia";
import { Applicability } from "./applicability.js";
import {
  DocumentUri,
  IsoDateTime,
  JsonPointer,
  Note,
  OrganizationRef,
  PartId,
  PrivateExtensions,
  Sha256,
  UsageId,
} from "./common.js";
import { Generator, SpecVersion } from "./document.js";

/** Points at one exact revision of a BOM document. */
export interface BomVersionRef {
  id: DocumentUri;
  revision?: string;
  /** Digest of the serialized document, to make the reference exact. */
  sha256?: Sha256;
}

/** A modified field, addressed by a JSON Pointer relative to the object. */
export interface FieldChange {
  path: JsonPointer;
  before?: unknown;
  after?: unknown;
}

/**
 * One difference. Parts and parents are named by their id in the `to`
 * revision (after {@link ChangeSet.identityMatches}), except removed ones,
 * which only have an id in `from`.
 *
 * `provenance` is not compared: the row a value was read from is
 * traceability, not content, and shifts whenever the source is re-exported.
 */
export type Change =
  /**
   * Fields of the document itself: `name`, `owner`, `products`,
   * `documents`, `organizations`, `options`, `imports`, `requires`,
   * `notes`, `extensions`. A new revision of an imported document shows
   * here, as `/imports/<alias>/revision`. Release data (`revision`,
   * `status`, `approvals`, `issuedAt`, `generator`) and `issues` are not
   * content and are not compared.
   */
  | { op: "documentModified"; fields: FieldChange[] & tags.MinItems<1> }
  | { op: "partAdded"; part: PartId }
  | { op: "partRemoved"; part: PartId }
  | {
      op: "partModified";
      part: PartId;
      fields: FieldChange[] & tags.MinItems<1>;
    }
  | { op: "usageAdded"; parent: PartId; usage: UsageId }
  | { op: "usageRemoved"; parent: PartId; usage: UsageId }
  | {
      op: "usageModified";
      parent: PartId;
      usage: UsageId;
      fields: FieldChange[] & tags.MinItems<1>;
    }
  | {
      op: "usageMoved";
      /** Id in the old parent. */
      usage: UsageId;
      fromParent: PartId;
      toParent: PartId;
      /** Id in the new parent, if it changed. */
      newUsage?: UsageId;
    };

/** A usage, named by the part that lists it. */
export interface UsageKey {
  parent: PartId;
  usage: UsageId;
}

/**
 * Ids are supposed to be stable, but source data does not always allow it.
 * When a part or a usage got a different id in the new revision, the match
 * is recorded here before computing changes, with how it was established.
 *
 * `from` is an id of the `from` revision, `to` of the `to` revision: two
 * part ids, or two usages. A usage match whose parents differ (other than
 * by a part match) is a move.
 */
export type IdentityMatch = (
  { from: PartId; to: PartId } | { from: UsageKey; to: UsageKey }
) & {
  method: "identifier" | "manual" | "heuristic";
  /** For heuristic (e.g. AI-proposed) matches. */
  confidence?: number & tags.Minimum<0> & tags.Maximum<1>;
  confirmed?: boolean;
};

export interface ChangeSet {
  kind: "changeSet";
  specVersion: SpecVersion;
  id: DocumentUri;
  from: BomVersionRef;
  to: BomVersionRef;
  /** ECO / ECN number from its issuer. */
  reference?: string;
  issuer?: OrganizationRef;
  reason?: string;
  status?: "proposed" | "accepted" | "rejected" | "implemented";
  /**
   * Cut-over: the configurations (serials, lots, dates) built to the `to`
   * revision rather than to `from`. It selects between whole revisions and
   * is not copied into the usages of either. See "Revisions and
   * effectivity" in the README.
   */
  applicability?: Applicability;
  identityMatches?: IdentityMatch[];
  changes: Change[];
  createdAt?: IsoDateTime;
  generator?: Generator;
  notes?: Note[];
  extensions?: PrivateExtensions;
}
