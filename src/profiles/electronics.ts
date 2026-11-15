// Profile "electronics": the characteristics used to describe electronic
// and electromechanical parts for purchasing and assembly.

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
  /** Electrical resistance, with a supported resistance unit. */
  resistance?: Measure<ResistanceUnit>;
  /** Capacitance, with a supported capacitance unit. */
  capacitance?: Measure<CapacitanceUnit>;
  /** Inductance, with a supported inductance unit. */
  inductance?: Measure<InductanceUnit>;
  /** Frequency, with a supported frequency unit. */
  frequency?: Measure<FrequencyUnit>;
  /** Dielectric class as stated by the source; no built-in list of classes. */
  dielectric?: string;
  /** Package or case designation, such as "0603", "SOT-23" or "DIP-28". */
  package?: string;
  /** Mounting method as stated by the source; no built-in list of methods. */
  mounting?: string;
  /** Number of terminals or contacts. */
  pins?: Count & tags.Minimum<1>;
  /** Spacing between adjacent terminals or contacts, expressed as a length. */
  pitch?: Measure<LengthUnit>;
  /** Moisture sensitivity level as stated by the source, represented as text. */
  msl?: string;
}
