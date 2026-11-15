// SPDX-License-Identifier: CERN-OHL-S-2.0
// Copyright Portland State Aerospace Society 2018-2021.
// Adapted to bomkit by victor314159, 2026-11-15; see README.md.
// Licence text: LICENSES/CERN-OHL-S-2.0.txt
// Source location: https://github.com/victor314159/bomkit/blob/main/examples/cubesat-frames.ts
//
// OreSat CubeSat frame sets, from the real spreadsheet published by the
// Portland State Aerospace Society (CERN-OHL-S-2.0):
// oresat-structure, Frames/build/framesBOM.xlsx, commit c08159e (2022).
// OreSat0 flew in March 2022.
//
// The spreadsheet has one sheet per frame size (1U, 1.5U, 2U, 3U) with three
// columns: PART NUMBER, DESCRIPTION, QTY. Part numbers mix CAD file names
// ("1U_Frame", "short") and McMaster-Carr catalog numbers. Rows are
// reproduced as found; everything inferred is marked in notes.
//
// Shows: several products sharing parts in one document, custom machined
// parts with drawings and STEP models, catalog fasteners, a CAD stand-in for
// a flight part, and identity traps that an importer must resolve.

import { BomDocument, DocumentFile } from "../src/index.js";

const REPO = "https://github.com/oresat/oresat-structure/blob/master/";

/** Drawing (PDF) and model (STEP) of a part, from Frames/build. */
function drawings(base: string, pdf: string, step?: string) {
  const docs: Record<string, DocumentFile> = {
    [`${base}-pdf`]: {
      name: `${base} drawing`,
      type: "drawing",
      mediaType: "application/pdf",
      uri: REPO + pdf,
    },
  };
  if (step)
    docs[`${base}-step`] = {
      name: `${base} model`,
      type: "mcad",
      mediaType: "model/step",
      uri: REPO + step,
    };
  return docs;
}

const fromSheet = (sheet: string, row: number) => ({
  locations: [{ document: "frames-bom", sheet, row }],
});

export const cubesatFrames: BomDocument = {
  kind: "bom",
  specVersion: "0.1",
  id: "urn:example:bom:oresat-frames",
  name: "OreSat frame sets 1U, 1.5U, 2U, 3U",
  issuedAt: "2022-01-16T21:58:55Z",
  owner: "psas",
  products: ["frames-1u", "frames-1.5u", "frames-2u", "frames-3u"],
  organizations: {
    psas: {
      name: "Portland State Aerospace Society",
      aliases: ["PSAS", "OreSat"],
      website: "https://www.oresat.org",
    },
    mcmaster: { name: "McMaster-Carr", website: "https://www.mcmaster.com" },
  },
  documents: {
    "frames-bom": {
      name: "framesBOM.xlsx",
      type: "other",
      mediaType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uri: "https://github.com/oresat/oresat-structure/blob/c08159efe210101d7ea1123d4e0838270f017f5c/Frames/build/framesBOM.xlsx",
      sha256:
        "56e3be262b3d18892aa80873d5e82de5e66c6d538f502b32b8c9dd08516b96b0",
      size: 19273,
    },
    ...drawings(
      "1U_Y",
      "Frames/build/1U/1U_Y.pdf",
      "Frames/build/1U/1U_Y.STEP",
    ),
    ...drawings(
      "1U_plusX",
      "Frames/build/1U/1U_plusX.pdf",
      "Frames/build/1U/1U_plusX.STEP",
    ),
    ...drawings(
      "1U_minusX",
      "Frames/build/1U/1U_minusX.pdf",
      "Frames/build/1U/1U_minusX.STEP",
    ),
    ...drawings(
      "1.5U_Y",
      "Frames/build/1.5U/1.5U_Y.pdf",
      "Frames/build/1.5U/1.5U_Y.STEP",
    ),
    ...drawings(
      "1.5U_plusX",
      "Frames/build/1.5U/1.5U_plusX.pdf",
      "Frames/build/1.5U/1.5U_plusX.STEP",
    ),
    ...drawings(
      "1.5U_minusX",
      "Frames/build/1.5U/1.5U_minusX.pdf",
      "Frames/build/1.5U/1.5U_minusX.STEP",
    ),
    ...drawings("2U_Y", "Frames/build/2U/2U_Y.pdf"),
    ...drawings("2U_plusX", "Frames/build/2U/2U_plusX.pdf"),
    ...drawings("2U_minusX", "Frames/build/2U/2U_minusX.pdf"),
    ...drawings(
      "3U_Y",
      "Frames/build/3U/3U_Y.pdf",
      "Frames/build/3U/3U_Y.STEP",
    ),
    ...drawings(
      "3U_plusX",
      "Frames/build/3U/3U_plusX.pdf",
      "Frames/build/3U/3U_plusX.STEP",
    ),
    ...drawings(
      "3U_minusX",
      "Frames/build/3U/3U_minusX.pdf",
      "Frames/build/3U/3U_minusX.STEP",
    ),
    ...drawings(
      "CardWedge",
      "Frames/build/CardWedge.PDF",
      "Frames/build/CardWedge.STEP",
    ),
    ...drawings(
      "CardWedgePosX",
      "Frames/build/CardWedgePosX.PDF",
      "Frames/build/CardWedgePosX.STEP",
    ),
    ...drawings(
      "CardWedgePosXCutout",
      "Frames/build/CardWedgePosXCutout.PDF",
      "Frames/build/CardWedgePosXCutout.STEP",
    ),
    ...drawings(
      "CardWedgeWithCutout",
      "Frames/build/CardWedgeWithCutout.PDF",
      "Frames/build/CardWedgeWithCutout.STEP",
    ),
    ...drawings(
      "CardWedgeTriangle",
      "Frames/build/CardWedgeTriangle.PDF",
      "Frames/build/CardWedgeTriangle.STEP",
    ),
    ...drawings(
      "CardWedgeTriangleShort",
      "Frames/build/CardWedgeTriangleShort.PDF",
      "Frames/build/CardWedgeTriangleShort.STEP",
    ),
    ...drawings(
      "CardWedgeTriangleStarTracker",
      "Frames/build/CardWedgeTriangleStarTracker.pdf",
      "Frames/build/CardWedgeTriangleStarTracker.STEP",
    ),
  },
  parts: {
    // ---- Products: one frame set per size --------------------------------
    "frames-1u": {
      kind: "custom",
      name: "OreSat 1U frame set",
      identifiers: [{ issuer: "psas", value: "1U_Frames" }],
      usages: [
        {
          id: "Y",
          part: "frame-1u-y",
          quantity: { value: 2 },
          provenance: fromSheet("1U", 2),
        },
        {
          id: "+X",
          part: "frame-1u-plusx",
          quantity: { value: 1 },
          provenance: fromSheet("1U", 3),
        },
        {
          id: "-X",
          part: "frame-1u-minusx",
          quantity: { value: 1 },
          provenance: fromSheet("1U", 4),
        },
        {
          id: "wedge",
          part: "wedge",
          quantity: { value: 14 },
          provenance: fromSheet("1U", 5),
        },
        {
          id: "wedge+x",
          part: "wedge-plusx",
          quantity: { value: 5 },
          provenance: fromSheet("1U", 6),
        },
        {
          id: "triangle",
          part: "triangle",
          quantity: { value: 19 },
          provenance: fromSheet("1U", 7),
        },
        {
          id: "triangle-st",
          part: "triangle-startracker",
          quantity: { value: 2 },
          provenance: fromSheet("1U", 8),
        },
        {
          id: "wedge+x-st",
          part: "wedge-plusx-startracker",
          quantity: { value: 2 },
          provenance: fromSheet("1U", 9),
        },
        {
          id: "92095A451",
          part: "mcm-92095A451",
          quantity: { value: 63 },
          provenance: fromSheet("1U", 10),
        },
        {
          id: "dowel",
          part: "mcm-93600A061",
          quantity: { value: 8 },
          provenance: fromSheet("1U", 11),
        },
        {
          id: "shcs",
          part: "mcm-92290A060",
          quantity: { value: 8 },
          provenance: fromSheet("1U", 12),
        },
        {
          id: "insert",
          part: "mcm-91630A221",
          quantity: { value: 8 },
          provenance: fromSheet("1U", 13),
        },
        {
          id: "spring",
          part: "separation-spring",
          quantity: { value: 4 },
          provenance: fromSheet("1U", 14),
        },
      ],
    },
    "frames-1.5u": {
      kind: "custom",
      name: "OreSat 1.5U frame set",
      identifiers: [{ issuer: "psas", value: "1.5U_Frames" }],
      usages: [
        {
          id: "Y",
          part: "frame-1.5u-y",
          quantity: { value: 2 },
          provenance: fromSheet("1.5U", 2),
        },
        {
          id: "+X",
          part: "frame-1.5u-plusx",
          quantity: { value: 1 },
          provenance: fromSheet("1.5U", 3),
        },
        {
          id: "-X",
          part: "frame-1.5u-minusx",
          quantity: { value: 1 },
          provenance: fromSheet("1.5U", 4),
        },
        {
          id: "flat-torx",
          part: "mcm-92703A159",
          quantity: { value: 10 },
          provenance: fromSheet("1.5U", 5),
        },
        {
          id: "shcs",
          part: "mcm-92290A060",
          quantity: { value: 8 },
          provenance: fromSheet("1.5U", 6),
        },
        {
          id: "insert",
          part: "mcm-91630A221",
          quantity: { value: 8 },
          provenance: fromSheet("1.5U", 7),
        },
        {
          id: "dowel",
          part: "mcm-93600A061",
          quantity: { value: 8 },
          provenance: fromSheet("1.5U", 8),
        },
        {
          id: "button",
          part: "mcm-90910A920",
          quantity: { value: 69 },
          provenance: fromSheet("1.5U", 9),
        },
        {
          id: "wedge+x-cut",
          part: "wedge-plusx-cut",
          quantity: { value: 1 },
          provenance: fromSheet("1.5U", 10),
        },
        {
          id: "wedge+x",
          part: "wedge-plusx",
          quantity: { value: 5 },
          provenance: fromSheet("1.5U", 11),
        },
        {
          id: "wedge+x-st",
          part: "wedge-plusx-startracker",
          quantity: { value: 2 },
          provenance: fromSheet("1.5U", 12),
        },
        {
          id: "triangle",
          part: "triangle",
          quantity: { value: 19 },
          provenance: fromSheet("1.5U", 13),
        },
        {
          id: "triangle-short",
          part: "triangle-short",
          quantity: { value: 6 },
          provenance: fromSheet("1.5U", 14),
        },
        {
          id: "triangle-st",
          part: "triangle-startracker",
          quantity: { value: 2 },
          provenance: fromSheet("1.5U", 15),
        },
        {
          id: "wedge",
          part: "wedge",
          quantity: { value: 14 },
          provenance: fromSheet("1.5U", 16),
        },
        {
          id: "wedge-y-cut",
          part: "wedge-y-cut",
          quantity: { value: 2 },
          provenance: fromSheet("1.5U", 17),
        },
        {
          id: "spring",
          part: "separation-spring",
          quantity: { value: 4 },
          provenance: fromSheet("1.5U", 18),
        },
      ],
    },
    "frames-2u": {
      kind: "custom",
      name: "OreSat 2U frame set",
      identifiers: [{ issuer: "psas", value: "2U_Frames" }],
      usages: [
        {
          id: "+X",
          part: "frame-2u-plusx",
          quantity: { value: 1 },
          provenance: fromSheet("2U", 2),
        },
        {
          id: "-X",
          part: "frame-2u-minusx",
          quantity: { value: 1 },
          provenance: fromSheet("2U", 3),
        },
        {
          id: "Y",
          part: "frame-2u-y",
          quantity: { value: 2 },
          provenance: fromSheet("2U", 4),
        },
        {
          id: "button",
          part: "mcm-90910A920",
          quantity: { value: 111 },
          provenance: fromSheet("2U", 5),
        },
        {
          id: "dowel",
          part: "mcm-93600A061",
          quantity: { value: 8 },
          provenance: fromSheet("2U", 6),
        },
        {
          id: "shcs",
          part: "mcm-92290A060",
          quantity: { value: 16 },
          provenance: fromSheet("2U", 7),
        },
        {
          id: "spring",
          part: "separation-spring",
          quantity: { value: 4 },
          provenance: fromSheet("2U", 8),
        },
        {
          id: "flat-torx",
          part: "mcm-92703A159",
          quantity: { value: 10 },
          provenance: fromSheet("2U", 9),
        },
        {
          id: "insert",
          part: "mcm-91630A221",
          quantity: { value: 16 },
          provenance: fromSheet("2U", 10),
        },
        {
          id: "wedge",
          part: "wedge",
          quantity: { value: 24 },
          provenance: fromSheet("2U", 11),
        },
        {
          id: "wedge-y-cut",
          part: "wedge-y-cut",
          quantity: { value: 2 },
          provenance: fromSheet("2U", 12),
        },
        {
          id: "wedge+x",
          part: "wedge-plusx",
          quantity: { value: 9 },
          provenance: fromSheet("2U", 13),
        },
        {
          id: "wedge+x-cut",
          part: "wedge-plusx-cut",
          quantity: { value: 1 },
          provenance: fromSheet("2U", 14),
        },
        {
          id: "triangle",
          part: "triangle",
          quantity: { value: 32 },
          provenance: fromSheet("2U", 15),
        },
        {
          id: "triangle-short",
          part: "triangle-short",
          quantity: { value: 6 },
          provenance: fromSheet("2U", 16),
        },
        {
          id: "triangle-st",
          part: "triangle-startracker",
          quantity: { value: 3 },
          provenance: fromSheet("2U", 17),
        },
        {
          id: "wedge+x-st",
          part: "wedge-plusx-startracker",
          quantity: { value: 3 },
          provenance: fromSheet("2U", 18),
        },
      ],
    },
    "frames-3u": {
      kind: "custom",
      name: "OreSat 3U frame set",
      identifiers: [{ issuer: "psas", value: "3U_Frames" }],
      usages: [
        {
          id: "spring",
          part: "separation-spring",
          quantity: { value: 4 },
          provenance: fromSheet("3U", 2),
        },
        {
          id: "dowel",
          part: "mcm-93600A061",
          quantity: { value: 8 },
          provenance: fromSheet("3U", 3),
        },
        {
          id: "shcs",
          part: "mcm-92290A060",
          quantity: { value: 24 },
          provenance: fromSheet("3U", 4),
        },
        {
          id: "+X",
          part: "frame-3u-plusx",
          quantity: { value: 1 },
          provenance: fromSheet("3U", 5),
        },
        {
          id: "-X",
          part: "frame-3u-minusx",
          quantity: { value: 1 },
          provenance: fromSheet("3U", 6),
        },
        {
          id: "Y",
          part: "frame-3u-y",
          quantity: { value: 2 },
          provenance: fromSheet("3U", 7),
        },
        {
          id: "wedge",
          part: "wedge",
          quantity: { value: 56 },
          provenance: fromSheet("3U", 8),
        },
        {
          id: "triangle",
          part: "triangle",
          quantity: { value: 63 },
          provenance: fromSheet("3U", 9),
        },
        {
          id: "wedge-y-cut",
          part: "wedge-y-cut",
          quantity: { value: 4 },
          provenance: fromSheet("3U", 10),
        },
        {
          id: "triangle-short",
          part: "triangle-short",
          quantity: { value: 12 },
          provenance: fromSheet("3U", 11),
        },
        {
          id: "button",
          part: "mcm-90910A920",
          quantity: { value: 219 },
          provenance: fromSheet("3U", 12),
        },
        {
          id: "wedge+x",
          part: "wedge-plusx",
          quantity: { value: 7 },
          provenance: fromSheet("3U", 13),
        },
        {
          id: "wedge+x-cut",
          part: "wedge-plusx-cut",
          quantity: { value: 4 },
          provenance: fromSheet("3U", 14),
        },
        {
          id: "wedge+x-st",
          part: "wedge-plusx-startracker",
          quantity: { value: 4 },
          provenance: fromSheet("3U", 15),
        },
        {
          id: "triangle-st",
          part: "triangle-startracker",
          quantity: { value: 4 },
          provenance: fromSheet("3U", 16),
        },
        {
          id: "flat-torx",
          part: "mcm-92703A159",
          quantity: { value: 10 },
          provenance: fromSheet("3U", 17),
        },
      ],
    },

    // ---- Frames: three parts per size, all sharing one source number -----
    "frame-1u-y": {
      kind: "custom",
      name: "1U Y frame",
      identifiers: [{ issuer: "psas", value: "1U_Frame" }],
      documents: ["1U_Y-pdf", "1U_Y-step"],
      notes: [
        {
          kind: "info",
          text: "Source number 1U_Frame is shared by the Y, +X and -X frames; the description tells them apart.",
        },
      ],
    },
    "frame-1u-plusx": {
      kind: "custom",
      name: "1U +X frame",
      identifiers: [{ issuer: "psas", value: "1U_Frame" }],
      documents: ["1U_plusX-pdf", "1U_plusX-step"],
    },
    "frame-1u-minusx": {
      kind: "custom",
      name: "1U -X frame",
      identifiers: [{ issuer: "psas", value: "1U_Frame" }],
      documents: ["1U_minusX-pdf", "1U_minusX-step"],
    },
    "frame-1.5u-y": {
      kind: "custom",
      name: "1.5U Y frame",
      identifiers: [{ issuer: "psas", value: "1.5U_Frame" }],
      documents: ["1.5U_Y-pdf", "1.5U_Y-step"],
    },
    "frame-1.5u-plusx": {
      kind: "custom",
      name: "1.5U +X frame",
      identifiers: [{ issuer: "psas", value: "1.5U_Frame" }],
      documents: ["1.5U_plusX-pdf", "1.5U_plusX-step"],
    },
    "frame-1.5u-minusx": {
      kind: "custom",
      name: "1.5U -X frame",
      identifiers: [{ issuer: "psas", value: "1.5U_Frame" }],
      documents: ["1.5U_minusX-pdf", "1.5U_minusX-step"],
    },
    "frame-2u-y": {
      kind: "custom",
      name: "2U Y frame",
      identifiers: [{ issuer: "psas", value: "2U_Frame" }],
      documents: ["2U_Y-pdf"],
    },
    "frame-2u-plusx": {
      kind: "custom",
      name: "2U +X frame",
      identifiers: [{ issuer: "psas", value: "2U_Frame" }],
      documents: ["2U_plusX-pdf"],
    },
    "frame-2u-minusx": {
      kind: "custom",
      name: "2U -X frame",
      identifiers: [{ issuer: "psas", value: "2U_Frame" }],
      documents: ["2U_minusX-pdf"],
    },
    "frame-3u-y": {
      kind: "custom",
      name: "3U Y frame",
      identifiers: [{ issuer: "psas", value: "3U_Frame" }],
      documents: ["3U_Y-pdf", "3U_Y-step"],
    },
    "frame-3u-plusx": {
      kind: "custom",
      name: "3U +X frame",
      identifiers: [{ issuer: "psas", value: "3U_Frame" }],
      documents: ["3U_plusX-pdf", "3U_plusX-step"],
    },
    "frame-3u-minusx": {
      kind: "custom",
      name: "3U -X frame",
      identifiers: [{ issuer: "psas", value: "3U_Frame" }],
      documents: ["3U_minusX-pdf", "3U_minusX-step"],
    },

    // ---- Card wedges: shared by all sizes ----------------------------------
    wedge: {
      kind: "custom",
      name: "Full length card wedge",
      identifiers: [{ issuer: "psas", value: "OreSat_CardWedge" }],
      documents: ["CardWedge-pdf", "CardWedge-step"],
    },
    "wedge-plusx": {
      kind: "custom",
      name: "+X card wedge",
      identifiers: [{ issuer: "psas", value: "+Xframe" }],
      documents: ["CardWedgePosX-pdf", "CardWedgePosX-step"],
      notes: [
        {
          kind: "info",
          text: "Drawing matched by name (CardWedgePosX); inferred.",
        },
      ],
    },
    "wedge-plusx-cut": {
      kind: "custom",
      name: "+X card wedge, cut",
      identifiers: [{ issuer: "psas", value: "+Xframecut" }],
      documents: ["CardWedgePosXCutout-pdf", "CardWedgePosXCutout-step"],
      notes: [
        {
          kind: "info",
          text: "Drawing matched by name (CardWedgePosXCutout); inferred.",
        },
      ],
    },
    "wedge-y-cut": {
      kind: "custom",
      name: "Y card wedge, cut",
      identifiers: [{ issuer: "psas", value: "WithCutout" }],
      documents: ["CardWedgeWithCutout-pdf", "CardWedgeWithCutout-step"],
      notes: [
        {
          kind: "info",
          text: "Drawing matched by name (CardWedgeWithCutout); inferred.",
        },
      ],
    },
    "wedge-plusx-startracker": {
      kind: "custom",
      name: "+X star tracker card wedge",
      identifiers: [{ issuer: "psas", value: "startrackerwedge" }],
    },
    triangle: {
      kind: "custom",
      name: "Full length card wedge triangle",
      identifiers: [{ issuer: "psas", value: "OreSat_CardWedgeTriangle" }],
      documents: ["CardWedgeTriangle-pdf", "CardWedgeTriangle-step"],
    },
    "triangle-short": {
      kind: "custom",
      name: "Short card wedge triangle",
      identifiers: [{ issuer: "psas", value: "short" }],
      documents: ["CardWedgeTriangleShort-pdf", "CardWedgeTriangleShort-step"],
      notes: [
        {
          kind: "info",
          text: "Drawing matched by name (CardWedgeTriangleShort); inferred.",
        },
      ],
    },
    "triangle-startracker": {
      kind: "custom",
      name: "Star tracker card wedge triangle",
      identifiers: [{ issuer: "psas", value: "StarTrackerWedge" }],
      documents: [
        "CardWedgeTriangleStarTracker-pdf",
        "CardWedgeTriangleStarTracker-step",
      ],
    },

    // ---- Catalog hardware, bought by McMaster-Carr catalog number ----------
    "mcm-90910A920": {
      kind: "standard",
      name: "Button head Torx screw M2 x 0.4 x 4 mm",
      supplierParts: [{ supplier: "mcmaster", sku: "90910A920" }],
      category: [{ system: "free", code: "screw" }],
      properties: {
        "x-thread": "M2x0.4",
        length: { value: 4, unit: "mm" },
        "x-head": "button",
        "x-drive": "Torx",
      },
      notes: [
        {
          kind: "info",
          text: "Torx drive from the CAD file name '90910A920_Button Head Torx Screws.SLDPRT'.",
        },
      ],
    },
    "mcm-92095A451": {
      kind: "standard",
      name: "McMaster-Carr 92095A451 (no description in source)",
      supplierParts: [{ supplier: "mcmaster", sku: "92095A451" }],
    },
    "mcm-93600A061": {
      kind: "standard",
      name: "Dowel pin M1.5 x 6 mm",
      supplierParts: [{ supplier: "mcmaster", sku: "93600A061" }],
      category: [{ system: "free", code: "dowel pin" }],
      properties: {
        diameter: { value: 1.5, unit: "mm" },
        length: { value: 6, unit: "mm" },
      },
    },
    "mcm-92290A060": {
      kind: "standard",
      name: "Socket head screw M2.5 x 0.45 x 10 mm",
      supplierParts: [{ supplier: "mcmaster", sku: "92290A060" }],
      category: [{ system: "free", code: "screw" }],
      properties: {
        "x-thread": "M2.5x0.45",
        length: { value: 10, unit: "mm" },
        "x-head": "socket",
      },
    },
    "mcm-92703A159": {
      kind: "standard",
      name: "Torx flat head screw M2.5 x 0.45 x 8 mm",
      supplierParts: [{ supplier: "mcmaster", sku: "92703A159" }],
      category: [{ system: "free", code: "screw" }],
      properties: {
        "x-thread": "M2.5x0.45",
        length: { value: 8, unit: "mm" },
        "x-head": "flat",
        "x-drive": "Torx",
      },
    },
    "mcm-91630A221": {
      kind: "standard",
      name: "Helical insert, screw-locking, tangless, M2.5 x 0.45 x 2.5 mm",
      supplierParts: [{ supplier: "mcmaster", sku: "91630A221" }],
      category: [{ system: "free", code: "thread insert" }],
      properties: {
        "x-thread": "M2.5x0.45",
        length: { value: 2.5, unit: "mm" },
        "x-type": "screw-locking tangless",
      },
    },
    "separation-spring": {
      kind: "standard",
      name: "CubeSat separation spring (Cal Poly CubeSat specification)",
      category: [{ system: "free", code: "spring" }],
      properties: {
        "x-specification":
          "Cal Poly CubeSat Design Specification separation spring",
      },
    },
  },
  issues: [
    {
      id: "I1",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "frames-1u", usage: "92095A451" }],
      text: "Only the 1U sheet uses 92095A451, and it has no 90910A920 M2 screws that all other sizes use (69 to 219). Check whether this is the same role.",
    },
    {
      id: "I2",
      severity: "info",
      category: "assumption",
      subjects: [{ part: "frames-1.5u" }],
      text: "Rows 2-4 are three different parts all numbered 1.5U_Frame with no description. Mapped to Y (qty 2), +X and -X by analogy with the other sheets; to confirm.",
    },
    {
      id: "I3",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "frames-3u" }],
      text: "The 3U sheet lists 24 M2.5x10 socket head screws but no 91630A221 helical inserts, whereas 1U, 1.5U and 2U pair each M2.5x10 screw with an insert. To confirm.",
    },
    {
      id: "I4",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "frame-2u-y" }],
      text: "No STEP model published for the 2U frames, drawings only.",
    },
    {
      id: "I5",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "wedge-plusx-startracker" }],
      text: "Source number differs from the star tracker wedge triangle only by letter case (startrackerwedge vs StarTrackerWedge). No drawing found in Frames/build.",
    },
    {
      id: "I6",
      severity: "warning",
      category: "missing",
      subjects: [{ part: "mcm-92095A451" }],
      text: "Description cell is empty in the source.",
    },
    {
      id: "I7",
      severity: "warning",
      category: "ambiguous",
      subjects: [{ part: "separation-spring" }],
      text: "Source row: '84985A46 - CPSLO cubesat.org Springs (Using Slotted Long-Nose Spring Plunger 8-36 in CAD)'. McMaster 84985A46 is only the CAD stand-in; do not buy it as the flight part.",
    },
  ],
  generator: {
    tool: "manual transcription",
    sources: ["frames-bom"],
  },
  notes: [
    {
      kind: "info",
      text: "Source repository deprecated in May 2022 (CAD moved to Onshape). Licensed under CERN-OHL-S-2.0 by the Portland State Aerospace Society.",
    },
  ],
};
