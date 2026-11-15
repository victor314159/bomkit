// Parts (what a thing is) and usages (what an assembly contains).

import type { tags } from "typia";
import { Applicability } from "./applicability.js";
import {
  Amount,
  DocumentId,
  Identifier,
  Note,
  OrganizationRef,
  PartRef,
  PrivateExtensions,
  Provenance,
  Quantity,
  Unit,
  UsageId,
} from "./common.js";
import { SubcontractPart, SubcontractUsage } from "./modules/subcontract.js";
import { Properties } from "./properties.js";
import { Step } from "./process.js";

/**
 * How a part is identified and procured. This is the only distinction the
 * core makes between parts; resistors, contactors, brackets and wings are
 * all parts.
 *
 * - `standard`: off-the-shelf item, identified by any of:
 *   - manufacturer part numbers (`manufacturerParts`);
 *   - supplier catalog numbers (`supplierParts`), for items sold under the
 *     supplier's own reference (McMaster-Carr, Misumi, RS…);
 *   - a standard-part number (an identifier of type `standard`: ISO, DIN,
 *     NAS, MS, Airbus ABS…);
 *   - structured `properties`, for generic parts specified by value and
 *     package (passives, headers…): any part meeting them may be bought,
 *     within the substitution policy.
 *   A standard part with none of these is *incomplete*: it is valid in a
 *   document (real sources contain such parts), but it cannot be bought, and
 *   tools MUST report it (see `unresolved` in the buying BOM).
 * - `custom`: made to a specification owned by someone (drawing, ECAD,
 *   MCAD). Identified by the owner's part number + revision + documents.
 *   Made in-house or quoted by a supplier against its documents.
 * - `material`: bulk material bought by length, area, mass or volume and
 *   consumed in arbitrary quantities (wire, tube, plate, glue, solder paste).
 * - `software`: firmware, PLC program, FPGA bitstream… loaded onto another
 *   part. Never bought; its binary is a document.
 *
 * Whether a part is an assembly is not a kind: any part with usages is one.
 */
export type PartKind = "standard" | "custom" | "material" | "software";

/**
 * Approval status of an orderable reference. Defaults to `approved`.
 * - `preferred`: to be used when available;
 * - `approved`: may be used; several approved entries are alternates;
 * - `notApproved`: considered and rejected, recorded so it is not proposed again.
 *
 * The order of entries in a list carries no meaning: only the status does.
 */
export type ApprovalStatus = "preferred" | "approved" | "notApproved";

/**
 * Production status of a manufacturer part, as known when the document was
 * issued (it changes over time; tools that track it live may override it).
 * - `active`: in production;
 * - `nrnd`: not recommended for new designs;
 * - `lastTimeBuy`: end of life announced, last orders being taken;
 * - `obsolete`: no longer made.
 */
export type MarketLifecycle = "active" | "nrnd" | "lastTimeBuy" | "obsolete";

/** One orderable reference of a standard or material part. */
export interface ManufacturerPart {
  manufacturer: OrganizationRef;
  mpn: string & tags.MinLength<1>;
  status?: ApprovalStatus;
  lifecycle?: MarketLifecycle;
  /** Datasheets and other documents specific to this reference. */
  documents?: DocumentId[];
  notes?: Note[];
}

/**
 * One orderable reference in a supplier's catalog, when the supplier sells
 * the item under its own reference rather than (or as well as) the
 * manufacturer's.
 */
export interface SupplierPart {
  supplier: OrganizationRef;
  /** Catalog number, e.g. McMaster-Carr `92290A060`. */
  sku: string & tags.MinLength<1>;
  /**
   * Units of the part (in the part's `unit`) in one orderable item, when
   * sold by packs or lengths: 25 for a 25-pack of screws, 2 for DIN rail
   * sold in 2 m bars. Defaults to 1. Usage quantities always count units
   * of the part, never packs; a buying BOM rounds up to whole packs.
   */
  packSize?: number & tags.ExclusiveMinimum<0>;
  status?: ApprovalStatus;
  documents?: DocumentId[];
  notes?: Note[];
}

/**
 * Category of a part. Informational: it drives views, checks and search,
 * never semantics. Known systems: `free`, `eclass`, `unspsc`, `iec81346-2`.
 */
export interface Classification {
  system: "free" | "eclass" | "unspsc" | "iec81346-2" | (string & {});
  code: string & tags.MinLength<1>;
  label?: string;
}

/**
 * Whether a part with usages is built or bought as a whole.
 * - `make`: built; its usages are expanded in the buying BOM.
 * - `buy`: bought as a whole even though it has usages (a subcontracted
 *   sub-assembly, a COTS module whose content is documented); it is a
 *   buying line itself and its usages are not expanded.
 * Default: `make` for parts with usages, `buy` otherwise.
 */
export type MakeOrBuy = "make" | "buy";

/**
 * Loss allowance: what must be procured beyond what the product contains,
 * because the process loses some (pick-and-place attrition, cut-offs, setup
 * pieces). It belongs to the part, wherever it is used. A buying BOM adds
 * it to the quantity needed; the BOM's quantities never include it.
 */
export interface Scrap {
  /** Share of the needed quantity that is lost: `0.02` for 2 %. */
  rate?: number & tags.Minimum<0>;
  /**
   * Lost once per production lot whatever its size, in the part's unit:
   * the leader of a reel, the pieces used to set a machine up.
   */
  perLot?: Amount;
}

export interface PartExtensions extends PrivateExtensions {
  subcontract?: SubcontractPart;
}

/**
 * Something a product is made of, or the product itself.
 *
 * A part keeps its id across revisions of the BOM as long as it stays
 * interchangeable (same form, fit and function). Its revision is carried by
 * its `identifiers`. A change that breaks interchangeability makes a new
 * part, with a new id (and, normally, a new part number).
 */
export interface Part {
  kind: PartKind;
  /** Short human-readable designation, e.g. "Resistor 10k 0402 1%". */
  name: string & tags.MinLength<1>;
  description?: string;
  /** Owner, customer and internal part numbers. */
  identifiers?: Identifier[];
  /** For `standard` and `material` parts. */
  manufacturerParts?: ManufacturerPart[];
  /** For `standard` and `material` parts sold under a catalog number. */
  supplierParts?: SupplierPart[];
  category?: Classification[];
  /** Unit the part is counted and bought in. Defaults to `"1"` (pieces). */
  unit?: Unit;
  /**
   * Material and finish as specified on a drawing, for `custom` parts.
   * When the raw stock must be planned and bought, also add a usage of a
   * `material` part.
   */
  material?: string;
  finish?: string[];
  /**
   * Technical characteristics: `{ resistance: { value: 10, unit: "kOhm" } }`.
   * For generic standard parts they are the identity, so every value a
   * buyer needs must be here, not only in `name`. See {@link Properties}
   * for the keys.
   */
  properties?: Properties;
  documents?: DocumentId[];
  /** Content of the part when it is an assembly, in display order. */
  usages?: Usage[];
  /**
   * A grouping that is never built or stocked as such (kit, logical
   * group). Viewers may show it; quantity roll-ups pass through it.
   */
  phantom?: boolean;
  /** Only meaningful for parts with usages. See {@link MakeOrBuy}. */
  makeOrBuy?: MakeOrBuy;
  /** Only meaningful for parts that are bought. See {@link Scrap}. */
  scrap?: Scrap;
  /** Assembly instructions. Only meaningful when the part has usages. */
  steps?: Step[];
  notes?: Note[];
  provenance?: Provenance;
  extensions?: PartExtensions;
}

/**
 * - `refdes`: electronic reference designators (`R12`, `U3`). One value per
 *   piece: for a discrete per-unit usage the number of values equals the
 *   quantity.
 * - `iec81346`: formal reference designations (`=A1+K2-Q3`).
 * - `tag`: device or equipment tag as written in the source, without the
 *   formal IEC 81346 syntax (`Q1`, `PPE`, `KA1`).
 * - `cable`: cable or wire tag (`W12`, `moteur_pompe`).
 * - `findNumber`: item/balloon number on a drawing.
 * - `position`: any other location text (slot, rail, zone).
 *
 * Outside `refdes`, one device may carry several values (a reversing
 * contactor tagged both `GA` and `DR`), so their count is not tied to the
 * quantity.
 *
 * Terminals, pins and connector contacts are designated within their device
 * as `<device>:<terminal>`, as in IEC 81346 (`X1:5`, `-X1:5`, `J3:2`).
 * Values are unique within a parent and scheme.
 */
export type DesignatorScheme =
  | "refdes"
  | "iec81346"
  | "tag"
  | "cable"
  | "findNumber"
  | "position"
  | (string & {});

/**
 * Positions of a usage in one scheme. The order of `values` carries no
 * meaning. A usage placed on both sides of a board has one set per side.
 */
export interface DesignatorSet {
  scheme: DesignatorScheme;
  values: (string & tags.MinLength<1>)[] & tags.MinItems<1> & tags.UniqueItems;
  /** Side of the board or panel the positions are on (assembly quoting counts placements per side). */
  side?: "top" | "bottom";
}

export interface UsageExtensions extends PrivateExtensions {
  subcontract?: SubcontractUsage;
}

/**
 * Another part accepted at the position of a usage, in place of its `part`:
 * a screw of another length, three hurricane nuts instead of one goRail nut.
 * The builder or buyer chooses; the product is the same either way.
 *
 * This differs from:
 * - alternate manufacturer parts (`Part.manufacturerParts`), which are other
 *   sources of the *same* part, valid wherever the part is used;
 * - options and applicability, which select between *different* products
 *   (variants) and are fixed by the configuration being built.
 */
export interface UsageAlternate {
  part: PartRef;
  /** Quantity when this alternate is used. Defaults to the usage's quantity. */
  quantity?: Quantity;
  /** When the alternate is accepted (e.g. only until a date). Absent = always. */
  applicability?: Applicability;
  notes?: Note[];
  provenance?: Provenance;
}

/**
 * One line of an assembly: "this parent contains `quantity` of `part`
 * at `designators`". A usage belongs to the part that lists it.
 */
export interface Usage {
  /**
   * Unique within the parent part and stable across revisions. Importers
   * SHOULD derive it from a designator or find number when available.
   */
  id: UsageId;
  /** The preferred part at this position. */
  part: PartRef;
  quantity: Quantity;
  /**
   * Other parts accepted here, in order of preference. Quantity roll-ups
   * and buying BOMs use `part` unless told otherwise.
   */
  alternates?: UsageAlternate[];
  designators?: DesignatorSet[];
  /** `false` = do not place / not fitted. Defaults to `true`. */
  fitted?: boolean;
  /** When this usage applies. Absent = always. */
  applicability?: Applicability;
  notes?: Note[];
  provenance?: Provenance;
  extensions?: UsageExtensions;
}
