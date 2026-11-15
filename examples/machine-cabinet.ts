// SPDX-License-Identifier: GPL-2.0-only
// TDP (2014); QElectroTech contributors. See README.md for source scope.
// Adapted to bomkit by victor314159, 2026-11-15; see README.md.
// Licence text: LICENSES/GPL-2.0-only.txt
//
// Electrical equipment of a "250H" sharpening machine (affûteuse), from the
// real project published with QElectroTech (GPL-2.0):
// qelectrotech-source-mirror, examples/affuteuse_250h.qet, commit 2032ba7.
// Drawn in 2014 by "TDP"; 12 folios: power, control, safety (Preventa),
// operator box, fault signalling, three terminal strips, and a parts list.
//
// Two sources inside the same file disagree in places:
// - the parts list drawn on folio 12 ("nomenclature"), taken here as the BOM
//   of record;
// - the data attached to schematic symbols (manufacturer, reference, label).
// Every disagreement is kept as a note. Names are translated; the original
// labels are the designators.
//
// Shows: device tags, one device carrying two tags, accessories without
// tags, cables by length, sub-assemblies (cabinet, operator box), and the
// review warnings a subcontractor would send back to the customer.

import { BomDocument, Provenance } from "../src/index.js";

const tagged = (tags: string[]) => [{ scheme: "tag", values: tags }];

/** Location in the schematic folio and in the folio 12 parts list. */
const src = (folio: number, tag: string, inList = true): Provenance => ({
  locations: [
    { document: "qet", page: folio, element: tag },
    ...(inList ? [{ document: "qet", page: 12, element: tag }] : []),
  ],
});

export const machineCabinet: BomDocument = {
  kind: "bom",
  specVersion: "0.1",
  id: "urn:example:bom:affuteuse-250h",
  name: "Sharpening machine 250H, electrical equipment",
  issuedAt: "2014-06-27T00:00:00Z",
  owner: "tdp",
  products: ["elec-250h"],
  organizations: {
    tdp: { name: "TDP (schematic author)" },
    schneider: { name: "Schneider Electric", aliases: ["PREVENTA"] },
    siemens: { name: "Siemens", aliases: ["SIEMENS", "SIEMENS_SIRIUS"] },
    legrand: { name: "Legrand", aliases: ["LEGRAND", "LEGRAND_"] },
    socomec: { name: "Socomec", aliases: ["SOCOMEC"] },
    crouzet: { name: "Crouzet", aliases: ["CROUZET"] },
  },
  documents: {
    qet: {
      name: "affuteuse_250h.qet",
      type: "ecad",
      mediaType: "application/xml",
      uri: "https://github.com/qelectrotech/qelectrotech-source-mirror/blob/2032ba76ed7971c1fcd709592daa8f3f2d8bfe01/examples/affuteuse_250h.qet",
      sha256:
        "cf2e24aa6837bf85818716f81b1964b8fd82c6f897223d1c45da9beabb2989c7",
      size: 1219887,
    },
  },
  parts: {
    // ---- Product ----------------------------------------------------------
    "elec-250h": {
      kind: "custom",
      name: "Electrical equipment, sharpening machine 250H (retrofit)",
      documents: ["qet"],
      notes: [
        {
          kind: "info",
          text: "Motors (pump, carriage, spindle, spindle descent) and limit switches FC_D/FC_G appear in the schematic but not in the parts list: treated as existing machine equipment.",
        },
      ],
      usages: [
        { id: "cabinet", part: "cabinet", quantity: { value: 1 } },
        { id: "operator-box", part: "operator-box", quantity: { value: 1 } },
        {
          id: "ATU_CABLE",
          part: "rope-estop",
          quantity: { value: 1 },
          designators: tagged(["ATU_CABLE"]),
          provenance: src(4, "ATU_CABLE"),
        },
        {
          id: "ATU_BROCHE",
          part: "estop-head",
          quantity: { value: 1 },
          designators: tagged(["ATU_BROCHE"]),
          provenance: src(4, "ATU_BROCHE"),
          notes: [{ text: "Emergency stop on the spindle." }],
        },
        {
          id: "VERRINE",
          part: "signal-column",
          quantity: { value: 1 },
          designators: tagged(["VERRINE"]),
          provenance: src(4, "VERRINE"),
        },
        {
          id: "S2",
          part: "zb4bw36",
          quantity: { value: 1 },
          designators: tagged(["S2"]),
          provenance: src(4, "S2"),
          notes: [{ text: "Reset pushbutton (BP réarmement)." }],
        },
        {
          id: "DCY",
          part: "zb4ba2",
          quantity: { value: 1 },
          designators: tagged(["DCY"]),
          provenance: src(5, "DCY"),
        },
        {
          id: "BP",
          part: "zb4bw533",
          quantity: { value: 3 },
          designators: tagged(["G", "D", "MA"]),
          provenance: src(5, "BP_*"),
          notes: [
            {
              kind: "info",
              text: "Parts list gives tag 'BP_*' qty 3 (carriage travel, spindle start). Tags G, D, MA are the pushbuttons of folio 5; mapping inferred.",
            },
          ],
        },
        {
          id: "V1",
          part: "zbvb-m1",
          quantity: { value: 1 },
          designators: tagged(["V1"]),
          provenance: src(3, "V1"),
          notes: [{ text: "Power-on pilot light." }],
        },
        {
          id: "V2",
          part: "zvbv-b4",
          quantity: { value: 1 },
          designators: tagged(["V2"]),
          provenance: src(7, "V2"),
        },
        {
          id: "contact-no",
          part: "zb4z101",
          quantity: { value: 6 },
          provenance: src(5, "CORPS CONTACT_NO"),
          notes: [
            {
              text: "Contact bodies for the pushbutton heads; the source does not say which head gets which body.",
            },
          ],
        },
        {
          id: "contact-nc",
          part: "zb4z102",
          quantity: { value: 1 },
          provenance: src(5, "CORPS CONTACT_NC"),
        },
        {
          id: "W-supply",
          part: "cable-4g10",
          quantity: { value: 4, unit: "m" },
          designators: [{ scheme: "cable", values: ["alim machine"] }],
          provenance: src(8, "alim machine", false),
        },
        {
          id: "W-pump",
          part: "cable-4g1.5",
          quantity: { value: 1.5, unit: "m" },
          designators: [{ scheme: "cable", values: ["moteur_pompe"] }],
          provenance: src(8, "moteur_pompe", false),
        },
        {
          id: "W-carriage",
          part: "cable-4g1.5",
          quantity: { value: 1.5, unit: "m" },
          designators: [{ scheme: "cable", values: ["moteur_chariot"] }],
          provenance: src(8, "moteur_chariot", false),
        },
        {
          id: "W-spindle",
          part: "cable-4g6",
          quantity: { value: 1.5, unit: "m" },
          designators: [{ scheme: "cable", values: ["moteur_broche"] }],
          provenance: src(8, "moteur_broche", false),
        },
        {
          id: "W-operator-box",
          part: "cable-19g",
          quantity: { value: 2.5, unit: "m" },
          designators: [{ scheme: "cable", values: ["coffret cde"] }],
          provenance: src(10, "coffret cde", false),
        },
      ],
    },

    // ---- Cabinet ----------------------------------------------------------
    cabinet: {
      kind: "custom",
      name: "Control cabinet",
      usages: [
        {
          id: "D1",
          part: "ic60n-d32",
          quantity: { value: 1 },
          designators: tagged(["D1"]),
          provenance: src(2, "D1"),
        },
        {
          id: "D2",
          part: "ic60n-d1a",
          quantity: { value: 1 },
          designators: tagged(["D2"]),
          provenance: src(3, "D2"),
          notes: [
            { text: "Schematic reference 'C60ND1A', parts list 'IC60N D1A'." },
          ],
        },
        {
          id: "FU1",
          part: "fuse-holder-05828",
          quantity: { value: 1 },
          designators: tagged(["FU1"]),
          provenance: src(3, "FU1"),
        },
        {
          id: "T1",
          part: "transformer-42302",
          quantity: { value: 1 },
          designators: tagged(["T1"]),
          provenance: src(3, "T1"),
        },
        {
          id: "Q1",
          part: "gv2me05",
          quantity: { value: 1 },
          designators: tagged(["Q1"]),
          provenance: src(2, "Q1"),
          notes: [{ text: "Pump motor. Schematic reference 'GV2-ME5'." }],
        },
        {
          id: "Q2",
          part: "gv2me07",
          quantity: { value: 1 },
          designators: tagged(["Q2"]),
          provenance: src(2, "Q2"),
          notes: [
            { text: "Carriage travel motor. Schematic reference 'GV2-ME7'." },
          ],
        },
        {
          id: "Q3",
          part: "gv2me22",
          quantity: { value: 1 },
          designators: tagged(["Q3"]),
          provenance: src(2, "Q3"),
          notes: [{ text: "Spindle motor." }],
        },
        {
          id: "Q4",
          part: "gv2me06",
          quantity: { value: 1 },
          designators: tagged(["Q4"]),
          provenance: src(2, "Q4"),
          notes: [
            { text: "Spindle descent motor. Schematic reference 'GV2-ME6'." },
          ],
        },
        {
          id: "PPE",
          part: "3rt2015-1bb42",
          quantity: { value: 1 },
          designators: tagged(["PPE"]),
          provenance: src(5, "ppe"),
          notes: [
            {
              text: "Pump contactor. Tag is lowercase 'ppe' in the schematic.",
            },
          ],
        },
        {
          id: "DESC",
          part: "3rt2015-1bb42",
          quantity: { value: 1 },
          designators: tagged(["DESC"]),
          provenance: src(5, "desc"),
          notes: [{ text: "Spindle descent contactor." }],
        },
        {
          id: "BR",
          part: "3rt2026-1ab00",
          quantity: { value: 1 },
          designators: tagged(["BR"]),
          provenance: src(5, "br"),
          notes: [{ text: "Spindle contactor." }],
        },
        {
          id: "GA-DR",
          part: "3ra1315-8xb30-1ab0",
          quantity: { value: 1 },
          designators: tagged(["GA", "DR"]),
          provenance: src(5, "GA"),
        },
        {
          id: "DCY-relay",
          part: "ca2kn40b7",
          quantity: { value: 1 },
          designators: tagged(["DCY"]),
          provenance: src(5, "DCY"),
        },
        {
          id: "aux-3no",
          part: "3rh2911-1ha30",
          quantity: { value: 3 },
          provenance: src(5, "BLOC CONTACT 3 NO"),
        },
        {
          id: "aux-4no",
          part: "3rh1921-1fa40",
          quantity: { value: 2 },
          provenance: src(5, "BLOC CONTACT 4 NO"),
        },
        {
          id: "PR1",
          part: "xps-ac5121",
          quantity: { value: 1 },
          designators: tagged(["PR1"]),
          provenance: src(4, "XPS-AC"),
          notes: [
            {
              text: "Emergency stop monitoring module. Tagged 'XPS-AC' in the schematic, 'PR1' in the parts list.",
            },
          ],
        },
        {
          id: "X-power",
          part: "terminal",
          quantity: { value: 12 },
          designators: [
            {
              scheme: "tag",
              values: [
                "X-power:L1",
                "X-power:L2",
                "X-power:L3",
                "X-power:61",
                "X-power:62",
                "X-power:63",
                "X-power:81",
                "X-power:82",
                "X-power:83",
                "X-power:91",
                "X-power:92",
                "X-power:93",
              ],
            },
          ],
          provenance: { locations: [{ document: "qet", page: 8 }] },
          notes: [{ text: "Power terminal strip (bornier puissance)." }],
        },
        {
          id: "X-devices",
          part: "terminal",
          quantity: { value: 12 },
          designators: [
            {
              scheme: "tag",
              values: [
                "X-devices:5",
                "X-devices:7",
                "X-devices:9",
                "X-devices:19",
                "X-devices:20",
                "X-devices:21",
                "X-devices:22",
                "X-devices:23",
                "X-devices:31",
                "X-devices:32",
                "X-devices:33",
                "X-devices:50",
              ],
            },
          ],
          provenance: { locations: [{ document: "qet", page: 9 }] },
        },
        {
          id: "X-operator-box",
          part: "terminal",
          quantity: { value: 18 },
          designators: [
            {
              scheme: "tag",
              values: [
                "X-operator-box:1",
                "X-operator-box:2",
                "X-operator-box:5",
                "X-operator-box:7",
                "X-operator-box:8",
                "X-operator-box:13",
                "X-operator-box:38",
                "X-operator-box:40",
                "X-operator-box:42",
                "X-operator-box:43",
                "X-operator-box:44",
                "X-operator-box:45",
                "X-operator-box:65",
                "X-operator-box:66",
                "X-operator-box:94",
                "X-operator-box:95",
              ],
            },
          ],
          provenance: { locations: [{ document: "qet", page: 10 }] },
          notes: [
            {
              text: "Operator box strip (bornier pupitre); two terminals have no number and no designator.",
            },
          ],
        },
      ],
    },

    // ---- Operator box (folio 6, "coffret de commande") --------------------
    "operator-box": {
      kind: "custom",
      name: "Operator box",
      usages: [
        {
          id: "A1",
          part: "ammeter-r72a90",
          quantity: { value: 1 },
          designators: tagged(["A1"]),
          provenance: src(6, "A1"),
        },
        {
          id: "P1",
          part: "counter-ntr800d",
          quantity: { value: 1 },
          designators: tagged(["P1"]),
          provenance: src(6, "ntrd_800d"),
          notes: [
            {
              text: "Pass counter. Tagged 'ntrd_800d' in the schematic, 'P1' in the parts list.",
            },
          ],
        },
        {
          id: "AUTO-MANU",
          part: "zb4bd2",
          quantity: { value: 1 },
          designators: tagged(["AUTO/MANU"]),
          provenance: src(6, "AUTO/MANU"),
          notes: [{ text: "Selector with/without pass counter." }],
        },
      ],
    },

    // ---- Protection and power -------------------------------------------
    "ic60n-d32": {
      kind: "standard",
      name: "Circuit breaker iC60N, curve D, 32 A, 3P",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "IC60N D32" }],
      properties: {
        curve: "D",
        ratedCurrent: { value: 32, unit: "A" },
        poles: 3,
      },
    },
    "ic60n-d1a": {
      kind: "standard",
      name: "Circuit breaker iC60N, curve D, 1 A, 2P",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "IC60N D1A" }],
      properties: {
        curve: "D",
        ratedCurrent: { value: 1, unit: "A" },
        poles: 2,
      },
    },
    "fuse-holder-05828": {
      kind: "standard",
      name: "Fuse holder 10x38, 2P",
      manufacturerParts: [{ manufacturer: "legrand", mpn: "05828" }],
      properties: { fuseSize: "10x38 mm", poles: 2 },
      notes: [{ text: "Parts list type '05828 10x38-2'." }],
    },
    "transformer-42302": {
      kind: "standard",
      name: "Control transformer 230/400 V to 24 V, 63 VA",
      manufacturerParts: [{ manufacturer: "legrand", mpn: "42302" }],
      properties: {
        ratedPower: { value: 63, unit: "V.A" },
        secondaryVoltage: { min: 24, max: 24, unit: "V" },
      },
    },
    gv2me05: {
      kind: "standard",
      name: "Motor circuit breaker GV2, 0.63-1 A",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "GV2ME05" }],
      notes: [{ text: "Parts list type 'GV2-ME5_0.6-1A'." }],
    },
    gv2me06: {
      kind: "standard",
      name: "Motor circuit breaker GV2, 1-1.6 A",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "GV2ME06" }],
      notes: [{ text: "Parts list type 'GV2-ME06_1-1.6A'." }],
    },
    gv2me07: {
      kind: "standard",
      name: "Motor circuit breaker GV2, 1.6-2.5 A",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "GV2ME07" }],
      notes: [{ text: "Parts list type 'GV2-ME7_1.6-2.5A'." }],
    },
    gv2me22: {
      kind: "standard",
      name: "Motor circuit breaker GV2, 20-25 A",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "GV2ME22" }],
      notes: [{ text: "Parts list type 'GV2-ME22_20/25A'." }],
    },

    // ---- Control --------------------------------------------------------
    "3rt2015-1bb42": {
      kind: "standard",
      name: "Contactor SIRIUS 3RT2015-1BB42",
      manufacturerParts: [{ manufacturer: "siemens", mpn: "3RT2015-1BB42" }],
    },
    "3rt2026-1ab00": {
      kind: "standard",
      name: "Contactor SIRIUS 3RT2026-1AB00",
      manufacturerParts: [{ manufacturer: "siemens", mpn: "3RT2026-1AB00" }],
    },
    "3ra1315-8xb30-1ab0": {
      kind: "standard",
      name: "Reversing contactor assembly SIRIUS 3RA1315-8XB30-1AB0",
      manufacturerParts: [
        { manufacturer: "siemens", mpn: "3RA1315-8XB30-1AB0" },
      ],
    },
    ca2kn40b7: {
      kind: "standard",
      name: "Control relay, 4 NO",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "CA2KN40B7" }],
      notes: [{ text: "Parts list: 'RELAIS DCY'." }],
    },
    "3rh2911-1ha30": {
      kind: "standard",
      name: "Auxiliary contact block, 3 NO",
      manufacturerParts: [{ manufacturer: "siemens", mpn: "3RH2911-1HA30" }],
    },
    "3rh1921-1fa40": {
      kind: "standard",
      name: "Auxiliary contact block, 4 NO",
      manufacturerParts: [{ manufacturer: "siemens", mpn: "3RH1921-1FA40" }],
    },
    "xps-ac5121": {
      kind: "standard",
      name: "Emergency stop monitoring module, 24 V AC",
      manufacturerParts: [
        { manufacturer: "schneider", mpn: "XPS AC 5121 AC24V" },
      ],
      notes: [
        {
          text: "Manufacturer given as 'PREVENTA', the Schneider safety range.",
        },
      ],
    },
    terminal: {
      kind: "standard",
      name: "Terminal block (type not specified)",
    },

    // ---- Operator devices ----------------------------------------------
    "rope-estop": {
      kind: "standard",
      name: "Rope pull emergency stop switch",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "XY2CH13270" }],
    },
    "estop-head": {
      kind: "standard",
      name: "Emergency stop pushbutton",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZB4 B44" }],
    },
    "signal-column": {
      kind: "standard",
      name: "Signal column 24 V",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "XVB C34" }],
    },
    zb4bw36: {
      kind: "standard",
      name: "Illuminated pushbutton head (reset)",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZB4 BW36" }],
    },
    zb4ba2: {
      kind: "standard",
      name: "Pushbutton head (cycle start)",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZB4 BA2" }],
    },
    zb4bw533: {
      kind: "standard",
      name: "Illuminated pushbutton head",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZB4 BW533" }],
    },
    zb4bd2: {
      kind: "standard",
      name: "Selector switch head, 2 positions",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZB4-BD2" }],
    },
    zb4z101: {
      kind: "standard",
      name: "Contact body, 1 NO",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZB4 Z101" }],
    },
    zb4z102: {
      kind: "standard",
      name: "Contact body, 1 NC",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZB4 Z102" }],
    },
    "zbvb-m1": {
      kind: "standard",
      name: "Pilot light (power on)",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZBVB-M1" }],
    },
    "zvbv-b4": {
      kind: "standard",
      name: "Pilot light (fault)",
      manufacturerParts: [{ manufacturer: "schneider", mpn: "ZVBV-B4" }],
    },
    "ammeter-r72a90": {
      kind: "standard",
      name: "Analog ammeter 0-50 A",
      manufacturerParts: [{ manufacturer: "socomec", mpn: "R72A90-A" }],
    },
    "counter-ntr800d": {
      kind: "standard",
      name: "Pass counter",
      manufacturerParts: [{ manufacturer: "crouzet", mpn: "NTR 800 D" }],
      notes: [{ text: "Parts list type 'NTR_800D'." }],
    },

    // ---- Cables ---------------------------------------------------------
    "cable-4g1.5": {
      kind: "material",
      name: "Cable 4G1.5 mm²",
      unit: "m",
      properties: {
        cores: 4,
        crossSection: { value: 1.5, unit: "mm2" },
        protectiveEarth: true,
      },
    },
    "cable-4g6": {
      kind: "material",
      name: "Cable 4G6 mm²",
      unit: "m",
      properties: {
        cores: 4,
        crossSection: { value: 6, unit: "mm2" },
        protectiveEarth: true,
      },
    },
    "cable-4g10": {
      kind: "material",
      name: "Cable 4G10 mm²",
      unit: "m",
      properties: {
        cores: 4,
        crossSection: { value: 10, unit: "mm2" },
        protectiveEarth: true,
      },
    },
    "cable-19g": {
      kind: "material",
      name: "Control cable 19G",
      unit: "m",
      properties: { cores: 19, protectiveEarth: true },
    },
  },
  issues: [
    {
      id: "I1",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "elec-250h" }],
      text: "Locations are not filled in the source. Only folio 6 devices are placed in the operator box; S2, DCY, G, D, MA, V1, V2 and the signal column have no stated location.",
    },
    {
      id: "I2",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "elec-250h" }],
      text: "Folio 8 lists cables for pump, carriage, spindle and supply, none for the spindle descent motor (Q4).",
    },
    {
      id: "I3",
      severity: "warning",
      category: "conflict",
      subjects: [
        { part: "elec-250h", usage: "DCY" },
        { part: "cabinet", usage: "DCY-relay" },
      ],
      text: "Tag DCY is used both for this cycle-start pushbutton and for the cycle relay in the cabinet.",
    },
    {
      id: "I4",
      severity: "warning",
      category: "conflict",
      subjects: [{ part: "elec-250h", usage: "V2" }],
      text: "Parts list: V2 = fault pilot light, folio 7. Schematic: V2 is an illuminated pushbutton on folio 4, and the folio 7 light has no tag.",
    },
    {
      id: "I5",
      severity: "warning",
      category: "conflict",
      subjects: [{ part: "elec-250h", usage: "W-supply" }],
      text: "Folio 2 writes '4G110 mm² 4m', folio 8 '4G10'; 4G10 assumed.",
    },
    {
      id: "I6",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "cabinet", usage: "FU1" }],
      text: "Schematic comment 'protection secondaire 4A gl': the fuse cartridges are not in the parts list.",
    },
    {
      id: "I7",
      severity: "info",
      category: "assumption",
      subjects: [{ part: "cabinet", usage: "GA-DR" }],
      text: "One reversing contactor assembly for carriage left (GA) and right (DR): the parts list gives GA qty 1 and DR qty 0. The schematic gives each coil reference 3RT1315-8XB30-1AB0.",
    },
    {
      id: "I8",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "cabinet", usage: "X-devices" }],
      text: "Field devices strip (bornier organes): 22 and 32 appear twice and 20 is drawn as a double-deck terminal. Counted once each.",
    },
    {
      id: "I9",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "ic60n-d32" }],
      text: "'IC60N D32' is a range designation, not an order reference. Poles taken from the 3-pole symbol.",
    },
    {
      id: "I10",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "ic60n-d1a" }],
      text: "Range designation, not an order reference. Poles taken from the 2-pole symbol.",
    },
    {
      id: "I11",
      severity: "warning",
      category: "conflict",
      subjects: [{ part: "transformer-42302" }],
      text: "Parts list says '63KVA'; the schematic comment says '63VA'. 63 VA assumed.",
    },
    {
      id: "I12",
      severity: "error",
      category: "missing",
      subjects: [{ part: "terminal" }],
      text: "Terminals are drawn but not in the parts list: no type, section or manufacturer.",
    },
    {
      id: "I13",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "ammeter-r72a90" }],
      text: "Parts list: 'AMPEREMETRE 0-50A -250 /5'. The ratio is unclear, and current transformer TI (folio 2) is not in the parts list.",
    },
    {
      id: "I14",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "cable-4g1.5" }],
      text: "Cable type (e.g. rubber or PVC sheathed) not specified.",
    },
    {
      id: "I15",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "cable-4g6" }],
      text: "Cable type not specified.",
    },
    {
      id: "I16",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "cable-4g10" }],
      text: "Cable type not specified.",
    },
    {
      id: "I17",
      severity: "warning",
      category: "conflict",
      subjects: [{ part: "cable-19g" }],
      text: "Cross-section conflict: folio 2 says 19G1,5 mm², folio 10 says 19G1. Cable type not specified.",
    },
    {
      id: "I18",
      severity: "info",
      category: "assumption",
      subjects: [
        { part: "cabinet", usage: "X-power" },
        { part: "cabinet", usage: "X-devices" },
        { part: "cabinet", usage: "X-operator-box" },
      ],
      text: "Terminal strips have no tag in the source; X-power, X-devices and X-operator-box are provisional strip names used to scope terminal numbers.",
    },
  ],
  generator: { tool: "manual transcription", sources: ["qet"] },
};
