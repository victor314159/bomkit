// Profile "wiring": purchasing characteristics of wires and cables.
// ETIM feature names, types and units were read in November 2026;
// the README records the source classes and IEC 60228 / IEC 60757 references.

import type { tags } from "typia";
import { Count, Measure } from "../common.js";
import { AreaUnit, ResistancePerLengthUnit } from "../units.js";

export interface WiringProperties {
  /** ETIM core count (EF001792), including any protective conductor. */
  cores?: Count & tags.Minimum<1>;
  /** ETIM nominal conductor section (EF000060). An area, conventionally mm2 (IEC 60228:2023, clause 3.2 and Tables 3–6). */
  crossSection?: Measure<AreaUnit>;
  /** ETIM presence of a protective conductor (EF007468). */
  protectiveEarth?: boolean;
  /** ETIM conductor category (EF001632): classes 1, 2, 5 and 6 (also IEC 60228:2023, clause 4). */
  conductorClass?: 1 | 2 | 5 | 6;
  /** ETIM conductor material (EF001622), complete list in EC003248 v3 (ETIM 10.0). */
  conductorMaterial?: "Aluminium" | "Copper" | "Other";
  /** ETIM core insulation material (EF000061), complete list in EC003248 v3 (ETIM 10.0). */
  insulationMaterial?:
    | "None"
    | "Ethylene tetrafluoroethylene (ETFE)"
    | "Fluorinated ethylene propylene (FEP)"
    | "Mica + crosslinked polyethylene (XLPE)"
    | "Rubber"
    | "Paper"
    | "Polyamide (PA)"
    | "Polyolefin"
    | "Polytetrafluoroethylene (PTFE)"
    | "Polyurethane (PUR)"
    | "Polyvinyl chloride (PVC)"
    | "Other";
  /** ETIM outer sheath material (EF001625), union of EC003248 v3 and EC000837 v9 (ETIM 10.0). */
  sheathMaterial?:
    | "None"
    | "Rubber"
    | "Polyamide (PA)"
    | "Polyethylene (PE)"
    | "Polyolefin"
    | "Polyurethane (PUR)"
    | "Polyvinyl chloride (PVC)"
    | "Other";
  /** ETIM identification method (EF000067), union of EC003248 v3 and EC000837 v9; not a colour code. */
  coreIdentification?:
    | "None"
    | "Coloured ribbon"
    | "Colour"
    | "Numbers"
    | "Colour and numbers"
    | "Other";
  /** ETIM presence of a screen (EF001791). */
  shielded?: boolean;
  /** ETIM conductor resistance per length at 20 degrees Celsius (EF013551), in Ohm/km. */
  conductorResistance?: Measure<ResistancePerLengthUnit>;
}
