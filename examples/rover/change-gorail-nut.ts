// SPDX-License-Identifier: Apache-2.0
// Copyright 2018 California Institute of Technology. Government Sponsorship Acknowledged.
// Adapted to bomkit by victor314159, 2026-11-15; see ../README.md.
// Licence text: ../LICENSES/Apache-2.0.txt
//
// A real engineering change on the JPL Open Source Rover: commit 6b2c5a9
// (5 August 2026), "replace hurricane nuts in control arm attachment with
// goRail nut". Compared with the previous revision of the parts list and
// screws tally (commit 41a1156).
//
// Shows: a change set between two revisions of rover.ts, with the date from
// which it applies. The fallback the source allows for builders without the
// new part is an alternate on the added usage (see rover.ts).

import { ChangeSet } from "../../src/index.js";

export const goRailNutChange: ChangeSet = {
  kind: "changeSet",
  specVersion: "0.1",
  id: "urn:example:change:jpl-osr:6b2c5a9",
  from: { id: "urn:example:bom:jpl-osr", revision: "41a1156" },
  to: { id: "urn:example:bom:jpl-osr", revision: "6b2c5a9" },
  reference: "6b2c5a9",
  issuer: "jpl",
  reason: "Replace hurricane nuts in control arm attachment with goRail nut",
  status: "implemented",
  // "the goRail nut (5 Hole) which was introduced July 2026"
  applicability: { date: { from: "2026-07-01" } },
  changes: [
    { op: "partAdded", part: "gb-2805-0004-0038" },
    { op: "usageAdded", parent: "rocker-bogie", usage: "2805-0004-0038" },
    {
      op: "usageModified",
      parent: "rover",
      usage: "socket-m4x10",
      fields: [{ path: "/quantity/value", before: 42, after: 46 }],
    },
  ],
  createdAt: "2026-08-05T00:00:00Z",
  notes: [
    {
      text: "The added usage carries the previous method as an alternate: three hurricane nuts per control arm (the old instructions showed two).",
    },
    {
      text: "The assembly instructions now call for 7 socket screws with washers per control arm, while the screws tally changed from 4 to 6 socket M4x10 per rocker-bogie for the joint. The two are not reconciled in the source.",
    },
  ],
};
