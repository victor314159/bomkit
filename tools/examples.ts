// The examples, as they are written to disk. The TypeScript files in
// examples/ are the source (type-checked, with helpers to avoid repetition);
// `npm run examples` writes them as .bom.json / .change.json files to
// generated/examples/, with the same tree as examples/ so that relative
// imports (rover → control-board) resolve. Generated, not versioned.

import { BomkitDocument } from "../src/index.js";
import { cubesatFrames } from "../examples/cubesat-frames.js";
import { machineCabinet } from "../examples/machine-cabinet.js";
import { pcba } from "../examples/pcba.js";
import { planktoscope } from "../examples/planktoscope.js";
import { goRailNutChange } from "../examples/rover/change-gorail-nut.js";
import { controlBoard } from "../examples/rover/control-board.js";
import { rover } from "../examples/rover/rover.js";
import { roverBeforeChange } from "../examples/rover/rover-before-change.js";

/** Output path (relative to the output folder) → document. */
export const EXAMPLES = {
  "cubesat-frames.bom.json": cubesatFrames,
  "machine-cabinet.bom.json": machineCabinet,
  "pcba.bom.json": pcba,
  "planktoscope.bom.json": planktoscope,
  "rover/rover.bom.json": rover,
  "rover/rover-before-change.bom.json": roverBeforeChange,
  "rover/control-board.bom.json": controlBoard,
  "rover/change-gorail-nut.change.json": goRailNutChange,
} satisfies Record<string, BomkitDocument>;
