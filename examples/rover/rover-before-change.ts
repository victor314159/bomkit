// SPDX-License-Identifier: Apache-2.0
// Copyright 2018 California Institute of Technology. Government Sponsorship Acknowledged.
// Adapted to bomkit by victor314159; see ../README.md and ../LICENSES/Apache-2.0.txt.
// Reconstructs the earlier BOM by undoing the documented goRail nut change.
// This is a comparison fixture, not a separate transcription of the old source.

import { rover } from "./rover.js";

export const roverBeforeChange = structuredClone(rover);
roverBeforeChange.revision = "41a1156";
delete roverBeforeChange.parts["gb-2805-0004-0038"];
const rockerBogie = roverBeforeChange.parts["rocker-bogie"]!;
rockerBogie.usages = rockerBogie.usages!.filter(
  (u) => u.id !== "2805-0004-0038",
);
roverBeforeChange.parts.rover!.usages!.find(
  (u) => u.id === "socket-m4x10",
)!.quantity = { value: 42 };
