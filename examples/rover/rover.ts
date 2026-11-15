// SPDX-License-Identifier: Apache-2.0
// Copyright 2018 California Institute of Technology. Government Sponsorship Acknowledged.
// Adapted to bomkit by victor314159, 2026-11-15; see ../README.md.
// Licence text: ../LICENSES/Apache-2.0.txt
//
// NASA JPL Open Source Rover, mechanical parts list (Apache-2.0):
// github.com/nasa-jpl/open-source-rover, parts_list/parts_list.csv and
// parts_list/screws.md at commit 6b2c5a9 (August 2026).
// Generated from the CSV by a script, then reviewed: this is what an
// importer produces. The control board comes from its own BOM file.
//
// Shows: sub-assemblies used several times, parts shared between them,
// catalog items sold in packs (packSize), quantities converted from packs to
// pieces, a part imported from another BOM document, and the conflicts
// found between the two source files.

import { BomDocument, Provenance, SupplierPart } from "../../src/index.js";

const gb = (sku: string, packSize?: number): SupplierPart[] => [
  packSize
    ? { supplier: "gobilda", sku, packSize }
    : { supplier: "gobilda", sku },
];
const row = (line: number): Provenance => ({
  locations: [{ document: "parts-list", row: line }],
});
const tally = (line: number): Provenance => ({
  locations: [{ document: "screws", row: line }],
});

export const rover: BomDocument = {
  kind: "bom",
  specVersion: "0.1",
  id: "urn:example:bom:jpl-osr",
  revision: "6b2c5a9",
  name: "JPL Open Source Rover",
  issuedAt: "2026-08-05T00:00:00Z",
  owner: "jpl",
  products: ["rover"],
  imports: {
    cb: {
      uri: "control-board.bom.json",
      id: "urn:example:bom:jpl-osr-control-board",
      revision: "2.0.3",
    },
  },
  organizations: {
    jpl: { name: "NASA Jet Propulsion Laboratory", aliases: ["JPL"] },
    gobilda: { name: "goBILDA", website: "https://www.gobilda.com" },
  },
  documents: {
    "parts-list": {
      name: "parts_list.csv",
      type: "other",
      mediaType: "text/csv",
      uri: "https://github.com/nasa-jpl/open-source-rover/blob/6b2c5a9c13f311e549aeddcfd11248b834bf0fd2/parts_list/parts_list.csv",
      sha256:
        "325e00b30f1f3bd914cc07de9a2b89eb81ccdeee3b32535cb7b7ae524a5f915e",
    },
    screws: {
      name: "screws.md",
      type: "other",
      mediaType: "text/markdown",
      uri: "https://github.com/nasa-jpl/open-source-rover/blob/6b2c5a9c13f311e549aeddcfd11248b834bf0fd2/parts_list/screws.md",
    },
  },
  parts: {
    rover: {
      kind: "custom",
      name: "Open Source Rover",
      notes: [
        {
          text: "Battery, Raspberry Pi and other electronics outside the control board (parts_list/extra_parts.md) are not included in this example.",
        },
      ],
      usages: [
        { id: "drive-wheel", part: "drive-wheel", quantity: { value: 6 } },
        { id: "corner", part: "corner", quantity: { value: 4 } },
        { id: "rocker-bogie", part: "rocker-bogie", quantity: { value: 2 } },
        { id: "body", part: "body", quantity: { value: 1 } },
        {
          id: "control-board",
          part: "cb#control-board",
          quantity: { value: 1 },
        },
        {
          id: "button-m4x6",
          part: "gb-2802-0004-0006",
          quantity: { value: 10 },
          provenance: tally(43),
        },
        {
          id: "button-m4x10",
          part: "gb-2802-0004-0010",
          quantity: { value: 70 },
          provenance: tally(44),
        },
        {
          id: "button-m4x16",
          part: "gb-2802-0004-0016",
          quantity: { value: 34 },
          provenance: tally(45),
        },
        {
          id: "socket-m4x8",
          part: "gb-2800-0004-0008",
          quantity: { value: 30 },
          provenance: tally(46),
        },
        {
          id: "socket-m4x10",
          part: "gb-2800-0004-0010",
          quantity: { value: 46 },
          provenance: tally(47),
        },
        {
          id: "socket-m4x12",
          part: "gb-2800-0004-0012",
          quantity: { value: 20 },
          provenance: tally(48),
        },
        {
          id: "socket-m4x16",
          part: "gb-2800-0004-0016",
          quantity: { value: 46 },
          provenance: tally(49),
        },
        {
          id: "socket-m4x20",
          part: "gb-2800-0004-0020",
          quantity: { value: 12 },
          provenance: tally(50),
        },
        {
          id: "2805-0004-0108",
          part: "gb-2805-0004-0108",
          quantity: { value: 25 },
          provenance: row(49),
        },
        {
          id: "2911-0014-0001",
          part: "gb-2911-0014-0001",
          quantity: { value: 12 },
          provenance: row(50),
        },
        {
          id: "2801-0004-0008",
          part: "gb-2801-0004-0008",
          quantity: { value: 25 },
          provenance: row(51),
        },
        {
          id: "2811-0004-0007",
          part: "gb-2811-0004-0007",
          quantity: { value: 100 },
          provenance: row(52),
        },
        {
          id: "2812-0004-0007",
          part: "gb-2812-0004-0007",
          quantity: { value: 25 },
          provenance: row(53),
        },
      ],
    },
    "drive-wheel": {
      kind: "custom",
      name: "Drive wheel assembly",
      usages: [
        {
          id: "3616-0014-0144",
          part: "gb-3616-0014-0144",
          quantity: { value: 1 },
          provenance: row(2),
        },
        {
          id: "1401-0043-0036",
          part: "gb-1401-0043-0036",
          quantity: { value: 1 },
          provenance: row(3),
        },
        {
          id: "5203-2402-0027",
          part: "gb-5203-2402-0027",
          quantity: { value: 1 },
          provenance: row(4),
        },
        {
          id: "1310-0016-4008",
          part: "gb-1310-0016-4008",
          quantity: { value: 1 },
          provenance: row(5),
        },
        {
          id: "1120-0002-0072",
          part: "gb-1120-0002-0072",
          quantity: { value: 1 },
          provenance: row(6),
        },
      ],
    },
    corner: {
      kind: "custom",
      name: "Corner assembly",
      usages: [
        {
          id: "1109-0024-0144",
          part: "gb-1109-0024-0144",
          quantity: { value: 1 },
          provenance: row(7),
        },
        {
          id: "1121-0004-0120",
          part: "gb-1121-0004-0120",
          quantity: { value: 1 },
          provenance: row(8),
        },
      ],
    },
    "rocker-bogie": {
      kind: "custom",
      name: "Rocker-bogie assembly",
      usages: [
        {
          id: "1120-0001-0048",
          part: "gb-1120-0001-0048",
          quantity: { value: 1 },
          provenance: row(9),
        },
        {
          id: "3202-0001-2501",
          part: "gb-3202-0001-2501",
          quantity: { value: 2 },
          provenance: row(10),
        },
        {
          id: "2000-0025-0002",
          part: "gb-2000-0025-0002",
          quantity: { value: 2 },
          provenance: row(11),
        },
        {
          id: "1309-0016-0008",
          part: "gb-1309-0016-0008",
          quantity: { value: 1 },
          provenance: row(12),
        },
        {
          id: "1611-0514-0008",
          part: "gb-1611-0514-0008",
          quantity: { value: 2 },
          provenance: row(13),
        },
        {
          id: "1504-0032-0020",
          part: "gb-1504-0032-0020",
          quantity: { value: 2 },
          provenance: row(14),
        },
        {
          id: "2100-0008-0050",
          part: "gb-2100-0008-0050",
          quantity: { value: 1 },
          provenance: row(15),
        },
        {
          id: "1102-0003-0024",
          part: "gb-1102-0003-0024",
          quantity: { value: 4 },
          provenance: row(16),
        },
        {
          id: "1221-0032-0002",
          part: "gb-1221-0032-0002",
          quantity: { value: 2 },
          provenance: row(17),
        },
        {
          id: "1126-0001-0001",
          part: "gb-1126-0001-0001",
          quantity: { value: 2 },
          provenance: row(18),
        },
        {
          id: "1116-0024-0040",
          part: "gb-1116-0024-0040",
          quantity: { value: 2 },
          provenance: row(19),
        },
        {
          id: "1111-0003-0001",
          part: "gb-1111-0003-0001",
          quantity: { value: 1 },
          provenance: row(20),
        },
        {
          id: "1118-0024-0096",
          part: "gb-1118-0024-0096",
          quantity: { value: 3 },
          provenance: row(21),
        },
        {
          id: "1118-0024-0288",
          part: "gb-1118-0024-0288",
          quantity: { value: 1 },
          provenance: row(22),
        },
        {
          id: "1111-0001-0001",
          part: "gb-1111-0001-0001",
          quantity: { value: 2 },
          provenance: row(23),
        },
        {
          id: "1137-0001-0001",
          part: "gb-1137-0001-0001",
          quantity: { value: 1 },
          provenance: row(24),
        },
        {
          id: "1916-0014-0072",
          part: "gb-1916-0014-0072",
          quantity: { value: 2 },
          provenance: row(25),
        },
        {
          id: "1522-0010-0060",
          part: "gb-1522-0010-0060",
          quantity: { value: 2 },
          provenance: row(26),
        },
        {
          id: "1522-0010-0040",
          part: "gb-1522-0010-0040",
          quantity: { value: 2 },
          provenance: row(27),
        },
        {
          id: "2805-0004-0038",
          part: "gb-2805-0004-0038",
          quantity: { value: 2 },
          alternates: [
            {
              part: "gb-2805-0004-0108",
              quantity: { value: 6 },
              notes: [
                {
                  text: "Three hurricane nuts per control arm, for builders without the goRail nut (introduced July 2026). From mechanical/rocker_bogie/README.md.",
                },
              ],
            },
          ],
          provenance: row(28),
        },
      ],
    },
    body: {
      kind: "custom",
      name: "Body assembly",
      usages: [
        {
          id: "1118-0024-0120",
          part: "gb-1118-0024-0120",
          quantity: { value: 2 },
          provenance: row(29),
        },
        {
          id: "1120-0002-0072",
          part: "gb-1120-0002-0072",
          quantity: { value: 2 },
          provenance: row(30),
        },
        {
          id: "1604-0043-0032",
          part: "gb-1604-0043-0032",
          quantity: { value: 4 },
          provenance: row(31),
        },
        {
          id: "1506-0032-0006",
          part: "gb-1506-0032-0006",
          quantity: { value: 6 },
          provenance: row(32),
        },
        {
          id: "1106-0029-0232",
          part: "gb-1106-0029-0232",
          quantity: { value: 7 },
          provenance: row(33),
        },
        {
          id: "1106-0041-0328",
          part: "gb-1106-0041-0328",
          quantity: { value: 4 },
          provenance: row(34),
        },
        {
          id: "1106-0012-0096",
          part: "gb-1106-0012-0096",
          quantity: { value: 8 },
          provenance: row(35),
        },
        {
          id: "1101-0041-0328",
          part: "gb-1101-0041-0328",
          quantity: { value: 1 },
          provenance: row(36),
        },
        {
          id: "1102-0007-0056",
          part: "gb-1102-0007-0056",
          quantity: { value: 4 },
          provenance: row(37),
        },
        {
          id: "1205-0001-0004",
          part: "gb-1205-0001-0004",
          quantity: { value: 4 },
          provenance: row(38),
        },
        {
          id: "1203-0001-0001",
          part: "gb-1203-0001-0001",
          quantity: { value: 4 },
          provenance: row(39),
        },
        {
          id: "2808-0004-0050",
          part: "gb-2808-0004-0050",
          quantity: { value: 2 },
          provenance: row(40),
        },
        {
          id: "2913-0004-0241",
          part: "gb-2913-0004-0241",
          quantity: { value: 4 },
          provenance: row(41),
        },
        {
          id: "1608-0001-0001",
          part: "gb-1608-0001-0001",
          quantity: { value: 1 },
          provenance: row(42),
        },
        {
          id: "2902-0003-0001",
          part: "gb-2902-0003-0001",
          quantity: { value: 4 },
          provenance: row(43),
        },
        {
          id: "1501-0006-0080",
          part: "gb-1501-0006-0080",
          quantity: { value: 8 },
          provenance: row(44),
        },
        {
          id: "1501-0006-0220",
          part: "gb-1501-0006-0220",
          quantity: { value: 8 },
          provenance: row(45),
        },
        {
          id: "1500-0010-0006",
          part: "gb-1500-0010-0006",
          quantity: { value: 12 },
          provenance: row(46),
        },
        {
          id: "1116-0024-0040",
          part: "gb-1116-0024-0040",
          quantity: { value: 4 },
          provenance: row(47),
        },
        {
          id: "1102-0002-0016",
          part: "gb-1102-0002-0016",
          quantity: { value: 4 },
          provenance: row(48),
        },
      ],
    },
    "gb-1101-0041-0328": {
      kind: "standard",
      name: "1101 Series U-Beam (41 Hole, 328mm Length)",
      supplierParts: gb("1101-0041-0328"),
    },
    "gb-1102-0002-0016": {
      kind: "standard",
      name: "1102 Series Flat Beam (2 Hole, 16mm Length)",
      supplierParts: gb("1102-0002-0016", 2),
    },
    "gb-1102-0003-0024": {
      kind: "standard",
      name: "1102 Series Flat Beam (3 Hole, 24mm Length)",
      supplierParts: gb("1102-0003-0024", 2),
    },
    "gb-1102-0007-0056": {
      kind: "standard",
      name: "1102 Series Flat Beam (7 Hole, 56mm Length)",
      supplierParts: gb("1102-0007-0056", 2),
    },
    "gb-1106-0012-0096": {
      kind: "standard",
      name: "1106 Series Square Beam (12 Hole, 96mm Length)",
      supplierParts: gb("1106-0012-0096"),
    },
    "gb-1106-0029-0232": {
      kind: "standard",
      name: "1106 Series Square Beam (29 Hole, 232mm Length)",
      supplierParts: gb("1106-0029-0232"),
    },
    "gb-1106-0041-0328": {
      kind: "standard",
      name: "1106 Series Square Beam (41 Hole, 328mm Length)",
      supplierParts: gb("1106-0041-0328"),
    },
    "gb-1109-0024-0144": {
      kind: "standard",
      name: "1109 Series goRAIL (144mm Length)",
      supplierParts: gb("1109-0024-0144"),
    },
    "gb-1111-0001-0001": {
      kind: "standard",
      name: "1111 Series Angle Pattern Bracket (1-1)",
      supplierParts: gb("1111-0001-0001"),
    },
    "gb-1111-0003-0001": {
      kind: "standard",
      name: "1111 Series Angle Pattern Bracket (3-1)",
      supplierParts: gb("1111-0003-0001"),
    },
    "gb-1116-0024-0040": {
      kind: "standard",
      name: "1116 Series Grid Plate (3 x 5 Hole, 24 x 40mm)",
      supplierParts: gb("1116-0024-0040"),
    },
    "gb-1118-0024-0096": {
      kind: "standard",
      name: "1118 Series Open goRAIL (96mm Length)",
      supplierParts: gb("1118-0024-0096"),
    },
    "gb-1118-0024-0120": {
      kind: "standard",
      name: "1118 Series Open goRAIL (120mm Length)",
      supplierParts: gb("1118-0024-0120"),
    },
    "gb-1118-0024-0288": {
      kind: "standard",
      name: "1118 Series Open goRAIL (288mm Length)",
      supplierParts: gb("1118-0024-0288"),
    },
    "gb-1120-0001-0048": {
      kind: "standard",
      name: "1120 Series U-Channel (1 Hole, 48mm Length)",
      supplierParts: gb("1120-0001-0048"),
    },
    "gb-1120-0002-0072": {
      kind: "standard",
      name: "1120 Series U-Channel (2 Hole, 72mm Length)",
      supplierParts: gb("1120-0002-0072"),
    },
    "gb-1121-0004-0120": {
      kind: "standard",
      name: "1121 Series Low-Side U-Channel (4 Hole, 120mm Length)",
      supplierParts: gb("1121-0004-0120"),
    },
    "gb-1126-0001-0001": {
      kind: "standard",
      name: "1126 Series Steel Flat Bracket (1-1)",
      supplierParts: gb("1126-0001-0001", 2),
    },
    "gb-1137-0001-0001": {
      kind: "standard",
      name: "1137 Series Steel Flat Grid Bracket (1-1)",
      supplierParts: gb("1137-0001-0001", 2),
    },
    "gb-1203-0001-0001": {
      kind: "standard",
      name: "1203 Series Block Mount (1-1)",
      supplierParts: gb("1203-0001-0001", 4),
    },
    "gb-1205-0001-0004": {
      kind: "standard",
      name: "1205 Series Dual Block Mount (1-4)",
      supplierParts: gb("1205-0001-0004", 2),
    },
    "gb-1221-0032-0002": {
      kind: "standard",
      name: "1221 Series 2-Side, 2-Post Pattern Mount (32-2)",
      supplierParts: gb("1221-0032-0002"),
    },
    "gb-1309-0016-0008": {
      kind: "standard",
      name: "1309 Series Sonic Hub (8mm Bore)",
      supplierParts: gb("1309-0016-0008"),
    },
    "gb-1310-0016-4008": {
      kind: "standard",
      name: "1310 Series Hyper Hub (8mm REX™ Bore)",
      supplierParts: gb("1310-0016-4008"),
    },
    "gb-1401-0043-0036": {
      kind: "standard",
      name: "1401 Series 2-Side, 2-Post Clamping Mount (43mm Width, 36mm Bore)",
      supplierParts: gb("1401-0043-0036"),
    },
    "gb-1500-0010-0006": {
      kind: "standard",
      name: "1500 Series Plastic Spacer (6mm ID x 8mm OD, 1mm Thickness)",
      supplierParts: gb("1500-0010-0006", 12),
    },
    "gb-1501-0006-0080": {
      kind: "standard",
      name: "1501 Series M4 x 0.7mm Standoff (6mm OD, 8mm Length)",
      supplierParts: gb("1501-0006-0080", 4),
    },
    "gb-1501-0006-0220": {
      kind: "standard",
      name: "1501 Series M4 x 0.7mm Standoff (6mm OD, 22mm Length)",
      supplierParts: gb("1501-0006-0220", 4),
    },
    "gb-1504-0032-0020": {
      kind: "standard",
      name: "1504 Series 32mm OD Pattern Spacer (2mm Length)",
      supplierParts: gb("1504-0032-0020"),
    },
    "gb-1506-0032-0006": {
      kind: "standard",
      name: "1506 Series 32mm ID Spacer (36mm OD, 6mm Length)",
      supplierParts: gb("1506-0032-0006", 2),
    },
    "gb-1522-0010-0040": {
      kind: "standard",
      name: "1522 Series 8mm ID Spacer (10mm OD, 4mm Length)",
      supplierParts: gb("1522-0010-0040", 4),
    },
    "gb-1522-0010-0060": {
      kind: "standard",
      name: "1522 Series 8mm ID Spacer (10mm OD, 6mm Length)",
      supplierParts: gb("1522-0010-0060", 4),
    },
    "gb-1604-0043-0032": {
      kind: "standard",
      name: "1604 Series 2-Side, 2-Post Pillow Block (32mm Bore)",
      supplierParts: gb("1604-0043-0032"),
    },
    "gb-1608-0001-0001": {
      kind: "standard",
      name: "Idler Bearing-Hub (32mm OD, 16mm Height)",
      supplierParts: gb("1608-0001-0001"),
    },
    "gb-1611-0514-0008": {
      kind: "standard",
      name: "1611 Series Flanged Ball Bearing (8mm ID x 14mm OD, 5mm Thickness)",
      supplierParts: gb("1611-0514-0008", 2),
    },
    "gb-1916-0014-0072": {
      kind: "standard",
      name: "Plastic Hub-Mount Control Arm (72mm Length)",
      supplierParts: gb("1916-0014-0072"),
    },
    "gb-2000-0025-0002": {
      kind: "standard",
      name: "2000 Series Dual Mode Servo (25-2, Torque)",
      supplierParts: gb("2000-0025-0002"),
    },
    "gb-2100-0008-0050": {
      kind: "standard",
      name: "2100 Series Stainless Steel Round Shaft (8mm Diameter, 50mm Length)",
      supplierParts: gb("2100-0008-0050"),
    },
    "gb-2800-0004-0008": {
      kind: "standard",
      name: "M4x8 Socket Screw",
      supplierParts: gb("2800-0004-0008", 25),
    },
    "gb-2800-0004-0010": {
      kind: "standard",
      name: "M4x10 Socket Screw",
      supplierParts: gb("2800-0004-0010", 25),
    },
    "gb-2800-0004-0012": {
      kind: "standard",
      name: "M4x12 Socket Screw",
      supplierParts: gb("2800-0004-0012", 25),
    },
    "gb-2800-0004-0016": {
      kind: "standard",
      name: "M4x16 Socket Screw",
      supplierParts: gb("2800-0004-0016", 25),
    },
    "gb-2800-0004-0020": {
      kind: "standard",
      name: "M4x20 Socket Screw",
      supplierParts: gb("2800-0004-0020", 25),
    },
    "gb-2801-0004-0008": {
      kind: "standard",
      name: "Zinc Plates Steel Washer (M4 x 8mm OD)",
      supplierParts: gb("2801-0004-0008", 25),
    },
    "gb-2802-0004-0006": {
      kind: "standard",
      name: "M4x6 Button Screw",
      supplierParts: gb("2802-0004-0006", 25),
    },
    "gb-2802-0004-0010": {
      kind: "standard",
      name: "M4x10 Button Screw",
      supplierParts: gb("2802-0004-0010", 25),
    },
    "gb-2802-0004-0016": {
      kind: "standard",
      name: "M4x16 Button Screw",
      supplierParts: gb("2802-0004-0016", 25),
    },
    "gb-2805-0004-0038": {
      kind: "standard",
      name: "goRAIL® Nut (5 Hole)",
      supplierParts: gb("2805-0004-0038", 2),
    },
    "gb-2805-0004-0108": {
      kind: "standard",
      name: "Hurricane Nut for goRAIL",
      supplierParts: gb("2805-0004-0108", 25),
    },
    "gb-2808-0004-0050": {
      kind: "standard",
      name: "2808 Series Stainless Steel Threaded Rod (M4 x 0.7mm, 50mm Length)",
      supplierParts: gb("2808-0004-0050", 2),
    },
    "gb-2811-0004-0007": {
      kind: "standard",
      name: "Zinc Plates Steel Hex Nut (M4 x 7)",
      supplierParts: gb("2811-0004-0007", 25),
    },
    "gb-2812-0004-0007": {
      kind: "standard",
      name: "Zinc Plates Steel Locknut (M4 x 7)",
      supplierParts: gb("2812-0004-0007", 25),
    },
    "gb-2902-0003-0001": {
      kind: "standard",
      name: "Plastic Hinge",
      supplierParts: gb("2902-0003-0001", 2),
    },
    "gb-2911-0014-0001": {
      kind: "standard",
      name: "Plastic Grommet (14-1)",
      supplierParts: gb("2911-0014-0001", 12),
    },
    "gb-2913-0004-0241": {
      kind: "standard",
      name: "2913 Series Steel Ball Linkage (Female M4 x 0.7mm, 24.1mm Length)",
      supplierParts: gb("2913-0004-0241", 2),
    },
    "gb-3202-0001-2501": {
      kind: "standard",
      name: "ServoBlock™ (Standard Size, 25 Tooth Spline, Hub Shaft)",
      supplierParts: gb("3202-0001-2501"),
    },
    "gb-3616-0014-0144": {
      kind: "standard",
      name: "Wasteland Wheel (144mm Diameter, 52mm Width)",
      supplierParts: gb("3616-0014-0144"),
    },
    "gb-5203-2402-0027": {
      kind: "standard",
      name: "5203 Series Yellow Jacket Planetary Gear Motor (26.9:1 Ratio, 24mm Length 8mm REX™ Shaft, 223 RPM, 3.3 - 5V Encoder)",
      supplierParts: gb("5203-2402-0027"),
    },
  },
  issues: [
    {
      id: "I1",
      severity: "warning",
      category: "conflict",
      subjects: [{ part: "rover", usage: "2811-0004-0007" }],
      text: "M4 hex nuts: parts_list.csv orders 2 packs with assembly multiplier 2 (4 x 25-packs), screws.md says 2 x 25-packs. Quantity taken from the parts list.",
    },
    {
      id: "I2",
      severity: "warning",
      category: "conflict",
      subjects: [{ part: "rover", usage: "socket-m4x10" }],
      text: "Socket M4x10: screws.md asks for 46 (4 x 25-packs to order), parts_list.csv orders 3 x 25-packs = 75. Required count taken from screws.md.",
    },
    {
      id: "I3",
      severity: "info",
      category: "conflict",
      subjects: [{ part: "rover", usage: "button-m4x6" }],
      text: "Button M4x6: 10 required (14 if all 'either' positions use button heads), which fits one 25-pack; both parts_list.csv and screws.md order 2.",
    },
    {
      id: "I4",
      severity: "info",
      category: "ambiguous",
      subjects: [{ part: "rover" }],
      text: "Screws are listed by total per type and length (screws.md), not per sub-assembly. Many positions accept either a button or a socket head, or two lengths ('**16** or 18'); the bold choice is the one counted. These per-position alternates cannot be recorded as usage alternates because the source gives only totals per type and length.",
    },
  ],
  generator: {
    tool: "gen_rover.py (example importer)",
    sources: ["parts-list", "screws"],
  },
};
