// Applicability (a.k.a. effectivity): when a usage applies.
//
// Applicability is part of the core because ignoring it silently produces
// wrong quantities. A consumer that cannot evaluate a condition MUST report
// it and MUST NOT count or drop the usage on its own.

import type { tags } from "typia";
import { IsoDate, OptionId } from "./common.js";

/**
 * A configuration choice of the product: a variant, an option, a market.
 * Without `values` the option is boolean (selected or not).
 * `default` is used when no value is given by the configuration.
 */
export type Option = {
  name: string & tags.MinLength<1>;
  description?: string;
} & (
  | { values?: undefined; default?: boolean }
  | {
      values: (string & tags.MinLength<1>)[] &
        tags.MinItems<1> &
        tags.UniqueItems;
      /** Must belong to `values` (checked against the declared choices). */
      default?: string;
    }
);

/** Numeric serial bound; explicit lists may also contain non-numeric serials. */
export type SerialBound = string & tags.Pattern<"^[0-9]+$">;

/**
 * Serial numbers of the product being built: a range (`from` and/or `to`, inclusive) or
 * an explicit `list`. Ranges compare numeric serials as numbers; non-numeric
 * serials MUST use `list`, as their ordering is ambiguous.
 */
export type SerialRange =
  | { from: SerialBound; to?: SerialBound; list?: undefined }
  | { from?: undefined; to: SerialBound; list?: undefined }
  | { from?: undefined; to?: undefined; list: string[] & tags.MinItems<1> };

/** Build date range, `from` inclusive, `to` exclusive. At least one bound is given. */
export type DateRange =
  { from: IsoDate; to?: IsoDate } | { from?: undefined; to: IsoDate };

/**
 * Boolean condition on the configuration being built. A usage without
 * applicability always applies.
 */
export type Applicability =
  /** Option selected (boolean option) or equal to `equals`. */
  | { option: OptionId; equals?: string }
  | { serial: SerialRange }
  | { date: DateRange }
  /** Production lot identifiers. */
  | { lot: (string & tags.MinLength<1>)[] & tags.MinItems<1> }
  | { all: Applicability[] & tags.MinItems<1> }
  | { any: Applicability[] & tags.MinItems<1> }
  | { not: Applicability };
