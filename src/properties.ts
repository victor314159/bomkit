// Properties: the technical characteristics of a part.
//
// The core defines how a characteristic is written (measure, tolerance,
// range: see common.ts), the few characteristics every trade shares, and how
// to name the others. The vocabulary of each trade is a profile
// (src/profiles/), and all profiles have the same standing.

import type { tags } from "typia";
import { Measure, PropertyValue, Range } from "./common.js";
import {
  CurrentUnit,
  LengthUnit,
  MassUnit,
  PowerUnit,
  TemperatureUnit,
  VoltageUnit,
} from "./units.js";
import { ElectronicsProperties } from "./profiles/electronics.js";
import { ElectricalProperties } from "./profiles/electrical.js";
import { WiringProperties } from "./profiles/wiring.js";

/**
 * Characteristics that mean the same for a resistor, a contactor, a cable
 * and a bracket. Dimensions and mass are the quantities of ISO 80000-3 and
 * ISO 80000-4, in the supported units of their dimension (units.ts).
 */
export interface CoreProperties {
  /** Overall dimensions. */
  length?: Measure<LengthUnit>;
  width?: Measure<LengthUnit>;
  height?: Measure<LengthUnit>;
  diameter?: Measure<LengthUnit>;
  thickness?: Measure<LengthUnit>;
  /** Mass of one unit of the part (one piece, or one metre of a part counted in `m`). */
  mass?: Measure<MassUnit>;
  /** Colour designation. Open across trades; IEC 60757 also allows documented codes and combinations. */
  color?: string;
  /** Rated voltage, in `V`. */
  ratedVoltage?: Measure<VoltageUnit>;
  /** Rated current, in `A`. */
  ratedCurrent?: Measure<CurrentUnit>;
  /** Rated power, in `W`, or `V.A` for apparent power. */
  ratedPower?: Measure<PowerUnit>;
  /** Limits of the ambient temperature in operation, in `Cel`. */
  operatingTemperature?: Range<TemperatureUnit>;
}

/**
 * Dictionaries whose properties can be used as keys, by trade:
 * - `iec61360`: IEC 61360-4, electric and electronic components
 *   (`iec61360:AAE525`);
 * - `iec62683`: IEC 62683, low-voltage switchgear and controlgear
 *   (`iec62683:ACE444`);
 * - `etim`: ETIM features, electrotechnical products as distributors
 *   describe them (`etim:EF000008`);
 * - `eclass`: ECLASS properties (`eclass:02-AAO715`).
 */
export type Dictionary = "iec61360" | "iec62683" | "etim" | "eclass";

/**
 * A property named by the dictionary that defines it: `<dictionary>:<code>`.
 * The dictionary is the authority on its meaning, type and unit; this
 * specification only carries the value.
 */
export const DICTIONARY_KEY_PATTERN =
  "^((iec61360|iec62683):[A-Z]{3}[0-9A-Z]{3}|etim:EF[0-9]{6}|eclass:02-[A-Z]{3}[0-9]{3})$";
export type DictionaryKey = `${Dictionary}:${string}` &
  tags.Pattern<typeof DICTIONARY_KEY_PATTERN>;

/**
 * Technical characteristics of a part. A key is, in this order:
 * - a core key ({@link CoreProperties}), shared by every trade;
 * - a key of a profile, the short vocabulary of one trade
 *   ({@link ElectronicsProperties}, {@link ElectricalProperties}, {@link WiringProperties});
 * - a key of a recognized dictionary ({@link DictionaryKey});
 * - a key starting with `x-`, for what none of these defines, and for
 *   values that do not fit the defined type (a rating given as text).
 * A characteristic that has a core or profile key MUST use it.
 */
export type Properties = CoreProperties &
  ElectronicsProperties &
  ElectricalProperties &
  WiringProperties & { [key: `x-${string}`]: PropertyValue } & {
    [key: DictionaryKey]: PropertyValue;
  };
