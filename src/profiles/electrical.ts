// Profile "electrical": purchasing characteristics of switchgear,
// contactors, relays, terminal blocks and control transformers.
// ETIM feature names, types and units were read in November 2026;
// the README records the source classes and versions for each mapping.

import type { tags } from "typia";
import { Count, Range } from "../common.js";
import { AreaUnit, VoltageUnit } from "../units.js";

export interface ElectricalProperties {
  /** ETIM total pole count for MCBs (EF008618); class-specific pole count (EF001391, fuse holders). */
  poles?: Count & tags.Minimum<1>;
  /** ETIM release characteristic (EF000889), complete value list in EC000042 v9 (ETIM 10.0). */
  curve?:
    | "A"
    | "B"
    | "C"
    | "Cs"
    | "D"
    | "E"
    | "F"
    | "G"
    | "K"
    | "KM"
    | "MA"
    | "S"
    | "Z"
    | "Other";
  /** ETIM compatible fuse size (EF008316), complete value list in EC002705 v6 (ETIM 10.0). */
  fuseSize?:
    | "8.5x23 mm"
    | "8.5x31.5 mm"
    | "8x40 mm"
    | "10x38 mm"
    | "10x85 mm"
    | "11x79 mm"
    | "14x51 mm"
    | "17.5x63.5 mm"
    | "22x58 mm"
    | "27x60 mm"
    | "Other";
  /** ETIM first secondary voltage (EF007472), in V. A fixed rating has equal bounds. */
  secondaryVoltage?: Range<VoltageUnit>;
  /** ETIM NO contacts: main contacts (EF001374), or relay contacts (EF008256). */
  normallyOpenContacts?: Count;
  /** ETIM NC contacts: main contacts (EF001375), or relay contacts (EF008255). */
  normallyClosedContacts?: Count;
  /** ETIM change-over relay contacts (EF008257). Count separately from NO and NC. */
  changeoverContacts?: Count;
  /** ETIM auxiliary NO contacts (EF001376). */
  auxiliaryNormallyOpenContacts?: Count;
  /** ETIM auxiliary NC contacts (EF001377). */
  auxiliaryNormallyClosedContacts?: Count;
  /** ETIM terminal block level count (EF002659). */
  levels?: Count & tags.Minimum<1>;
  /** ETIM connectable solid-core conductor section (EF007337), in mm2. */
  solidConductorCrossSection?: Range<AreaUnit>;
}
