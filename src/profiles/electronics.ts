// Profile "electronics": the characteristics by which generic electronic
// and electromechanical components are specified ("22p 0603").
//
// Each key is a property of the IEC Common Data Dictionary, IEC 61360-4
// (code given as `0112/2///61360_4#…`; the README has the full table).

import type { tags } from "typia";
import { Count, Measure } from "../common.js";
import {
  CapacitanceUnit,
  FrequencyUnit,
  InductanceUnit,
  LengthUnit,
  ResistanceUnit,
} from "../units.js";

export interface ElectronicsProperties {
  /** IEC "resistance" (AAE119). A unit of the dimension of `Ohm`. */
  resistance?: Measure<ResistanceUnit>;
  /** IEC "capacitance" (AAE046). A unit of the dimension of `F`. */
  capacitance?: Measure<CapacitanceUnit>;
  /** IEC "inductance" (AAE517). A unit of the dimension of `H`. */
  inductance?: Measure<InductanceUnit>;
  /** IEC "frequency" (AAE029), "nominal frequency" (AFD014). A unit of the dimension of `Hz`. */
  frequency?: Measure<FrequencyUnit>;
  /** IEC "dielectric class (ceramic cap)" (AAE038), value list ASA035. X7R belongs to AAE037 instead. */
  dielectric?: "CL1" | "CL2";
  /**
   * Package or case, as its standard names it: IEC "standard package
   * code" (AAG070), "manufacturer package code" (AAG069), "size code EIA"
   * (AAF353): `"0603"`, `"SOT-23"`, `"DIP-28"`. Codes are not a closed list of package families.
   */
  package?: string;
  /** IEC "mounting method" (AAF343), with the values of its list (ASA214). */
  mounting?: "surfaceMounted" | "inserted" | "flangeMounted" | "studMounted";
  /** IEC "number of terminals" (AAD191), "number of contacts" (AAE359). */
  pins?: Count & tags.Minimum<1>;
  /** IEC "terminal pitch" (AAE024), "contact pitch" (AAJ039). A length. */
  pitch?: Measure<LengthUnit>;
  /** IEC "moisture sensitivity level" (AAD196), value list ASA018; the eight IPC/JEDEC J-STD-020 levels. */
  msl?: "1" | "2" | "2a" | "3" | "4" | "5" | "5a" | "6";
}
