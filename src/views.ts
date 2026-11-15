// Derived views. They are computed from a BOM document and never edited by
// hand; the format exists so that tools can exchange and diff them.

import type { tags } from "typia";
import {
  Count,
  IsoDate,
  OptionId,
  OrganizationRef,
  PartRef,
  Unit,
  UsageId,
} from "./common.js";
import { BomVersionRef } from "./changes.js";
import { ManufacturerPart, PartKind, SupplierPart } from "./part.js";

/** The configuration a view was computed for. */
export interface Configuration {
  options?: Record<OptionId, string | boolean>;
  serial?: string;
  lot?: string;
  date?: IsoDate;
}

/** One place a part occurs in the product, as usage ids walked from the product. */
export interface Occurrence {
  path: UsageId[];
  /** Quantity per product unit at this occurrence, after multiplication. */
  quantity?: number;
  /** Values of all the usage's designator sets, whatever their scheme. */
  designators?: string[];
}

export interface BuyingLine {
  part: PartRef;
  kind: PartKind;
  name: string;
  manufacturerParts?: ManufacturerPart[];
  supplierParts?: SupplierPart[];
  unit: Unit;
  /**
   * For each listed supplier part sold by packs (`packSize` > 1): how many
   * packs cover `totalQuantity`, i.e. `ceil(totalQuantity / packSize)`.
   * Which one is ordered is the buyer's choice.
   */
  packs?: {
    supplier: OrganizationRef;
    sku: string;
    packSize: number;
    count: number & tags.Type<"uint32">;
  }[];
  /** Sum of per-unit quantities, multiplied along the path. */
  quantityPerUnit: number;
  /** Sum of per-lot quantities. */
  quantityPerLot: number;
  /** Some occurrence is "as required"; the total excludes it. */
  asRequired?: boolean;
  /**
   * Loss allowance of the part ({@link Scrap}), for this build:
   * `needed × rate + perLot`, where `needed` is
   * `quantityPerUnit × buildQuantity + quantityPerLot`. Rounded up to whole
   * pieces for parts counted in pieces. Absent when there is none.
   */
  scrapQuantity?: number;
  /** quantityPerUnit × buildQuantity + quantityPerLot + scrapQuantity. */
  totalQuantity: number;
  occurrences: Occurrence[];
}

/**
 * Flattened, merged list of what must be procured to build
 * `buildQuantity` units of `product` in a given configuration.
 */
export interface BuyingBom {
  kind: "buyingBom";
  source: BomVersionRef;
  product: PartRef;
  buildQuantity: Count & tags.Minimum<1>;
  configuration?: Configuration;
  lines: BuyingLine[];
  /**
   * Occurrences left out of `lines`: conditions that could not be
   * evaluated, incomplete parts that cannot be bought.
   */
  unresolved?: { path: UsageId[]; reason: string }[];
}
