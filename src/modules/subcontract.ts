// Module "subcontract": data a subcontract manufacturer needs on top of the
// neutral product description. Customer part numbers are NOT here: they are
// plain identifiers whose issuer is the customer organization. Make-or-buy is
// not here either: it is a property of the part (`Part.makeOrBuy`).

import { OrganizationRef } from "../common.js";

/**
 * Who procures the part.
 * - `subcontractor`: bought by the subcontractor (turnkey).
 * - `customer`: supplied by the customer (consigned).
 * - `subcontractorCustomerTerms`: bought by the subcontractor under the
 *   customer's negotiated prices or contracts.
 */
export type Supply =
  "subcontractor" | "customer" | "subcontractorCustomerTerms";

/**
 * Which orderable references the subcontractor may buy.
 * - `equivalent`: any part meeting the specification.
 * - `approvedOnly`: only references with status `preferred` or `approved`.
 * - `preferredOnly`: only references with status `preferred`. A part with
 *   this policy and no preferred reference cannot be bought: tools report it.
 */
export type Substitution = "equivalent" | "approvedOnly" | "preferredOnly";

export interface SubcontractDocument {
  customer: OrganizationRef;
  subcontractor: OrganizationRef;
  /** Customer project, order or quote reference. */
  reference?: string;
  /** Defaults applied to every part unless overridden. */
  supply?: Supply;
  substitution?: Substitution;
}

export interface SubcontractPart {
  supply?: Supply;
  substitution?: Substitution;
}

/** Overrides at one position, e.g. a critical part that must not be substituted. */
export interface SubcontractUsage {
  supply?: Supply;
  substitution?: Substitution;
}
