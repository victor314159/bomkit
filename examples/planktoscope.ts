// SPDX-License-Identifier: CERN-OHL-S-2.0
// PlanktoScope contributors; hardware BOM at commit cd77777.
// Adapted to bomkit by victor314159, 2026-11-15; see README.md.
// Licence text: LICENSES/CERN-OHL-S-2.0.txt
// Source location: https://github.com/victor314159/bomkit/blob/main/examples/planktoscope.ts
//
// PlanktoScope, an open-source plankton imaging instrument: the BOM as
// published in the curious.bio fork (hardware/bom.csv, commit cd77777,
// November 2022; hardware under CERN-OHL-S-2.0).
//
// The CSV has seven columns: #, Part/BOM Name, BOM Qty, Designators,
// Manufacturer, MPN, Part. Rows are reproduced as found.
//
// Shows: fasteners identified by standard (DIN 912, ISO 7380-2, DIN 562),
// distributor catalog numbers listed as manufacturer part numbers, custom
// parts made by the project, find-number-like line labels, and what is
// missing to actually buy everything.

import { BomDocument, Provenance } from "../src/index.js";

const row = (line: number): Provenance => ({
  locations: [{ document: "bom", row: line }],
});
const label = (value: string) => [{ scheme: "findNumber", values: [value] }];
const HAT =
  "https://code.curious.bio/curious.bio/planktoscope/src/commit/cd7777708531889f8f3cbe368a70baa97c6959f2/hardware/hat/";

export const planktoscope: BomDocument = {
  kind: "bom",
  specVersion: "0.1",
  id: "urn:example:bom:planktoscope",
  revision: "cd77777",
  name: "PlanktoScope",
  issuedAt: "2022-11-11T17:18:48+01:00",
  owner: "planktoscope",
  products: ["planktoscope"],
  organizations: {
    planktoscope: {
      name: "PlanktoScope project",
      aliases: ["planktoscope"],
      website: "https://www.planktoscope.org",
    },
    pontonz: { name: "PontonZ" },
    iso: { name: "ISO" },
    din: { name: "DIN (Deutsches Institut für Normung)" },
    bafasa: { name: "BafaSa" },
    tectake: { name: "Tectake" },
    cmscientific: { name: "CM Scientific" },
    fascomp: { name: "Fascomp" },
    darwin: { name: "Darwin Microfluidics" },
    kamoer: { name: "Kamoer" },
    motorkingdom: { name: "Motor Kindom Store", aliases: ["Motor Kingdom"] },
    seeed: { name: "Seeed Studio" },
    fulekan: { name: "Fulekan" },
    adafruit: { name: "Adafruit Industries" },
    sandisk: { name: "SanDisk" },
    switchcraft: { name: "Switchcraft" },
    bitefu: { name: "BITEFU" },
    raspberrypi: { name: "Raspberry Pi" },
    stontronics: { name: "Stontronics" },
    first4magnets: { name: "First4magnets" },
  },
  documents: {
    bom: {
      name: "bom.csv",
      type: "other",
      mediaType: "text/csv",
      uri: "https://code.curious.bio/curious.bio/planktoscope/src/commit/cd7777708531889f8f3cbe368a70baa97c6959f2/hardware/bom.csv",
      sha256:
        "0e9906568fbcea7cceffb1c2db5debafd803b4e4c8e002ca93ec6b96b64a733f",
      size: 3140,
    },
    "hat-sch": {
      name: "PlanktoscopeHat-v1.0-fab.sch",
      type: "ecad",
      uri: HAT + "PlanktoscopeHat-v1.0-fab.sch",
    },
    "hat-brd": {
      name: "PlanktoscopeHat-v1.0-fab.brd",
      type: "ecad",
      uri: HAT + "PlanktoscopeHat-v1.0-fab.brd",
    },
  },
  parts: {
    planktoscope: {
      kind: "custom",
      name: "PlanktoScope",
      usages: [
        { id: "1", part: "case", quantity: { value: 1 }, provenance: row(2) },
        {
          id: "2",
          part: "capillary",
          quantity: { value: 1 },
          provenance: row(3),
        },
        {
          id: "3",
          part: "standoff-6",
          quantity: { value: 4 },
          designators: label("A1"),
          provenance: row(4),
        },
        {
          id: "4",
          part: "standoff-15",
          quantity: { value: 4 },
          designators: label("A2"),
          provenance: row(5),
        },
        {
          id: "5",
          part: "standoff-16",
          quantity: { value: 4 },
          designators: label("A3"),
          provenance: row(6),
        },
        {
          id: "6",
          part: "din912-m2.5x5",
          quantity: { value: 8 },
          designators: label("A4"),
          provenance: row(7),
        },
        {
          id: "7",
          part: "din912-m2.5x10",
          quantity: { value: 7 },
          designators: label("A5"),
          provenance: row(8),
        },
        {
          id: "8",
          part: "iso7380-2-m3x12",
          quantity: { value: 32 },
          designators: label("A6"),
          provenance: row(9),
        },
        {
          id: "9",
          part: "adhesive-pad",
          quantity: { value: 4 },
          designators: label("A7"),
          provenance: row(10),
        },
        {
          id: "10",
          part: "luer-female",
          quantity: { value: 2 },
          designators: label("D1"),
          provenance: row(11),
        },
        {
          id: "11",
          part: "luer-male",
          quantity: { value: 1 },
          designators: label("D3"),
          provenance: row(12),
        },
        {
          id: "12",
          part: "tube-3",
          quantity: { value: 1 },
          designators: label("D4"),
          provenance: row(13),
        },
        {
          id: "13",
          part: "tube-4",
          quantity: { value: 1 },
          designators: label("D5"),
          provenance: row(14),
        },
        {
          id: "14",
          part: "bubbler",
          quantity: { value: 1 },
          designators: label("E1"),
          provenance: row(15),
        },
        {
          id: "15",
          part: "pump",
          quantity: { value: 1 },
          designators: label("F1"),
          provenance: row(16),
        },
        {
          id: "16",
          part: "flowcell",
          quantity: { value: 3 },
          designators: label("F4"),
          provenance: row(17),
        },
        {
          id: "17",
          part: "linear-stepper",
          quantity: { value: 2 },
          designators: label("G1"),
          provenance: row(18),
        },
        {
          id: "18",
          part: "heatsink",
          quantity: { value: 1 },
          designators: label("H1"),
          provenance: row(19),
        },
        {
          id: "19",
          part: "hat",
          quantity: { value: 1 },
          designators: label("I1"),
          provenance: row(20),
        },
        {
          id: "20",
          part: "lens-25",
          quantity: { value: 1 },
          designators: label("J1"),
          provenance: row(21),
        },
        {
          id: "21",
          part: "lens-ring",
          quantity: { value: 2 },
          designators: label("J2"),
          provenance: row(22),
        },
        {
          id: "22",
          part: "lens-16",
          quantity: { value: 1 },
          designators: label("J3"),
          provenance: row(23),
        },
        {
          id: "23",
          part: "led",
          quantity: { value: 1 },
          designators: label("J4"),
          provenance: row(24),
        },
        {
          id: "24",
          part: "sd-card",
          quantity: { value: 1 },
          designators: label("K1"),
          provenance: row(25),
        },
        {
          id: "25",
          part: "led-wires",
          quantity: { value: 1 },
          designators: label("K2"),
          provenance: row(26),
        },
        {
          id: "26",
          part: "dc-jack",
          quantity: { value: 1 },
          designators: label("K3"),
          provenance: row(27),
        },
        {
          id: "27",
          part: "falcon-tube",
          quantity: { value: 2 },
          designators: label("M1"),
          provenance: row(28),
        },
        {
          id: "28",
          part: "syringe",
          quantity: { value: 1 },
          designators: label("M2"),
          provenance: row(29),
        },
        {
          id: "29",
          part: "structure",
          quantity: { value: 1 },
          designators: label("S"),
          provenance: row(30),
        },
        {
          id: "30",
          part: "rpi4",
          quantity: { value: 1 },
          designators: label("X1"),
          provenance: row(31),
        },
        {
          id: "31",
          part: "hq-camera",
          quantity: { value: 1 },
          designators: label("X4"),
          provenance: row(32),
        },
        {
          id: "32",
          part: "power-adapter",
          quantity: { value: 1 },
          designators: label("X5"),
          provenance: row(33),
        },
        {
          id: "33",
          part: "din562-m3",
          quantity: { value: 32 },
          designators: label("XXX"),
          provenance: row(34),
        },
        {
          id: "34",
          part: "magnet",
          quantity: { value: 30 },
          designators: label("XXX1"),
          provenance: row(35),
        },
      ],
    },

    // ---- Standard fasteners: identified by their standard ---------------
    "din912-m2.5x5": {
      kind: "standard",
      name: "Socket head cap screw DIN 912 M2.5x5, stainless A2",
      identifiers: [
        { issuer: "din", value: "DIN 912 M2.5x5 A2", type: "standard" },
      ],
      manufacturerParts: [{ manufacturer: "bafasa", mpn: "CHI2.505" }],
      properties: {
        "x-thread": "M2.5",
        length: { value: 5, unit: "mm" },
        "x-material": "A2 stainless steel",
      },
      notes: [{ text: "Source name: 'M2.5X5 INOX A2 CHC DIN 912'." }],
    },
    "din912-m2.5x10": {
      kind: "standard",
      name: "Socket head cap screw DIN 912 M2.5x10, stainless A2",
      identifiers: [
        { issuer: "din", value: "DIN 912 M2.5x10 A2", type: "standard" },
      ],
      manufacturerParts: [{ manufacturer: "bafasa", mpn: "CHI2.510" }],
      properties: {
        "x-thread": "M2.5",
        length: { value: 10, unit: "mm" },
        "x-material": "A2 stainless steel",
      },
    },
    "iso7380-2-m3x12": {
      kind: "standard",
      name: "Flanged button head screw ISO 7380-2 M3x12, stainless A2",
      identifiers: [
        { issuer: "iso", value: "ISO 7380-2 M3x12 A2", type: "standard" },
      ],
      manufacturerParts: [{ manufacturer: "bafasa", mpn: "BHCEI03012" }],
      properties: {
        "x-thread": "M3",
        length: { value: 12, unit: "mm" },
        "x-material": "A2 stainless steel",
      },
      notes: [{ text: "Source name: 'M3X12 INOX A2 BHC BASE ISO 7380-2'." }],
    },
    "din562-m3": {
      kind: "standard",
      name: "Square nut DIN 562 M3 (5.5 x 1.8 mm), stainless A2",
      identifiers: [
        { issuer: "din", value: "DIN 562 M3 A2", type: "standard" },
      ],
      manufacturerParts: [{ manufacturer: "bafasa", mpn: "562I3" }],
      properties: {
        "x-thread": "M3",
        width: { value: 5.5, unit: "mm" },
        thickness: { value: 1.8, unit: "mm" },
        "x-material": "A2 stainless steel",
      },
    },

    // ---- Catalog parts ----------------------------------------------------
    case: {
      kind: "standard",
      name: "Case Tectake Type 2",
      manufacturerParts: [{ manufacturer: "tectake", mpn: "402870" }],
    },
    capillary: {
      kind: "standard",
      name: "Hollow rectangular capillary 0.30 x 3.00 mm ID",
      manufacturerParts: [{ manufacturer: "cmscientific", mpn: "3530-050" }],
    },
    "standoff-6": {
      kind: "standard",
      name: "Standoff M2.5 x 0.45, 6 mm",
      manufacturerParts: [{ manufacturer: "fascomp", mpn: "FM2101-2545-SS" }],
    },
    "standoff-15": {
      kind: "standard",
      name: "Standoff M2.5 x 0.45, 15 mm",
      manufacturerParts: [{ manufacturer: "fascomp", mpn: "FM2110-2545-SS" }],
    },
    "standoff-16": {
      kind: "standard",
      name: "Standoff M2.5 x 0.45, 16 mm",
      manufacturerParts: [{ manufacturer: "fascomp", mpn: "FM2111-2545-SS" }],
    },
    "adhesive-pad": { kind: "standard", name: "Silicone adhesive pads" },
    "luer-female": {
      kind: "standard",
      name: 'Barbed to female Luer adapter 1/16"',
      supplierParts: [{ supplier: "darwin", sku: "CIL-P-854" }],
    },
    "luer-male": {
      kind: "standard",
      name: 'Barbed to male Luer adapter 1/16"',
      supplierParts: [{ supplier: "darwin", sku: "CIL-P-850" }],
    },
    bubbler: { kind: "standard", name: "Mini bubbling USB" },
    pump: {
      kind: "standard",
      name: "Peristaltic pump KAS B12 SF, tubing ID 1.5 OD 3.5",
      manufacturerParts: [{ manufacturer: "kamoer", mpn: "KAS B12 SF" }],
    },
    "linear-stepper": {
      kind: "standard",
      name: "Reinforced linear stepper motor",
      manufacturerParts: [{ manufacturer: "motorkingdom", mpn: "SUS303" }],
    },
    heatsink: {
      kind: "standard",
      name: "Heat sink kit for Raspberry Pi 4B",
      manufacturerParts: [{ manufacturer: "seeed", mpn: "110991327" }],
    },
    "lens-25": {
      kind: "standard",
      name: 'M12 lens 25 mm 5 MP 1/2"',
      manufacturerParts: [
        { manufacturer: "fulekan", mpn: "Lens_25MM_5MP_1/2" },
      ],
    },
    "lens-ring": {
      kind: "standard",
      name: "M12 lens locking ring",
      properties: { "x-thread": "M12" },
      notes: [{ text: "Manufacturer Fulekan given, no part number." }],
    },
    "lens-16": {
      kind: "standard",
      name: 'M12 lens 16 mm 5 MP 1/2.5"',
      manufacturerParts: [
        { manufacturer: "fulekan", mpn: "Lens_16MM_5MP_1/2.5" },
      ],
    },
    led: {
      kind: "standard",
      name: "LED",
      manufacturerParts: [{ manufacturer: "adafruit", mpn: "754" }],
    },
    "sd-card": {
      kind: "standard",
      name: "SD card 128 GB",
      manufacturerParts: [
        { manufacturer: "sandisk", mpn: "SDSQXA1-128G-GN6MA" },
      ],
    },
    "dc-jack": {
      kind: "standard",
      name: "DC power jack 2.1 mm, front panel mount",
      manufacturerParts: [{ manufacturer: "switchcraft", mpn: "721AFMS" }],
    },
    "falcon-tube": {
      kind: "standard",
      name: "Falcon tube 50 ml",
      manufacturerParts: [{ manufacturer: "bitefu", mpn: "bitefu006" }],
    },
    syringe: {
      kind: "standard",
      name: "BD Luer-Lock disposable syringe 20 ml",
      supplierParts: [{ supplier: "darwin", sku: "CO-07944-16" }],
    },
    rpi4: {
      kind: "standard",
      name: "Raspberry Pi 4 Model B 4 GB",
      manufacturerParts: [
        { manufacturer: "raspberrypi", mpn: "RPI4-MODBP-4GB" },
      ],
    },
    "hq-camera": {
      kind: "standard",
      name: "Raspberry Pi HQ Camera",
      manufacturerParts: [{ manufacturer: "raspberrypi", mpn: "SC0261" }],
    },
    "power-adapter": {
      kind: "standard",
      name: "AC adaptor 12 V 4 A, 2.1 mm",
      manufacturerParts: [{ manufacturer: "stontronics", mpn: "SW3126B" }],
    },
    magnet: {
      kind: "standard",
      name: "Neodymium disc magnet 5 x 5 mm",
      manufacturerParts: [{ manufacturer: "first4magnets", mpn: "F641-25" }],
    },

    // ---- Made by the project --------------------------------------------
    "tube-3": {
      kind: "custom",
      name: "Tube n°3",
      identifiers: [{ issuer: "pontonz", value: "Tube n°3" }],
    },
    "tube-4": {
      kind: "custom",
      name: "Tube n°4",
      identifiers: [{ issuer: "pontonz", value: "Tube n°4" }],
    },
    flowcell: {
      kind: "custom",
      name: "Flow cell 300 µm",
      identifiers: [{ issuer: "planktoscope", value: "FlowCell 300um" }],
    },
    hat: {
      kind: "custom",
      name: "PlanktoScope HAT",
      identifiers: [{ issuer: "planktoscope", value: "Custom HAT" }],
      documents: ["hat-sch", "hat-brd"],
    },
    "led-wires": {
      kind: "custom",
      name: "LED to HAT wires",
      identifiers: [{ issuer: "planktoscope", value: "LED to HAT wires" }],
    },
    structure: {
      kind: "custom",
      name: "Structure V2.5",
      identifiers: [
        { issuer: "pontonz", value: "Structure V2.5", revision: "2.5" },
      ],
    },
  },
  issues: [
    {
      id: "I1",
      severity: "error",
      category: "missing",
      subjects: [{ part: "adhesive-pad" }, { part: "bubbler" }],
      text: "No manufacturer, part number or specification: these parts cannot be bought as listed.",
    },
    {
      id: "I2",
      severity: "warning",
      category: "conflict",
      subjects: [{ part: "linear-stepper" }],
      text: "The MPN column says 'SUS303', which is a stainless steel grade, not a part number.",
    },
    {
      id: "I3",
      severity: "info",
      category: "assumption",
      subjects: [
        { part: "luer-female" },
        { part: "luer-male" },
        { part: "syringe" },
      ],
      text: "Darwin Microfluidics is listed as manufacturer, but it is a distributor: its numbers are recorded as catalog numbers (supplierParts).",
    },
    {
      id: "I4",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "hat" }],
      text: "'Custom HAT' gives no version; design files exist for v0.1, v0.2 and v1.0. Linked to v1.0.",
    },
    {
      id: "I5",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "tube-3" }, { part: "tube-4" }, { part: "led-wires" }],
      text: "No length, material or drawing given for the tubes and the LED wiring.",
    },
    {
      id: "I6",
      severity: "info",
      category: "ambiguous",
      subjects: [
        { part: "planktoscope", usage: "33" },
        { part: "planktoscope", usage: "34" },
      ],
      text: "Designators 'XXX' and 'XXX1' look like placeholders.",
    },
  ],
  generator: { tool: "manual transcription", sources: ["bom"] },
};
