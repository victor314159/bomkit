// Tests of the importer. Run: npm test
//
// The fixtures are the published source files of the hand-written examples
// in examples/. Each is imported with its configuration and compared with
// (1) the expected output kept next to it, byte for byte, and (2) the
// hand-written example, on what both state: structure, quantities,
// designators and source rows. Names and ids chosen by a person differ.
//
// UPDATE_EXPECTED=1 npm test rewrites the expected outputs.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { BomDocument, Part, Usage } from "../src/index.js";
import { buildSchemas } from "../tools/lib/schemas.js";
import { cubesatFrames } from "../examples/cubesat-frames.js";
import { planktoscope } from "../examples/planktoscope.js";
import { controlBoard } from "../examples/rover/control-board.js";
import { rover } from "../examples/rover/rover.js";
import { serialize } from "../tools/lib/canonical.js";
import { diff } from "../tools/lib/diff.js";
import { Table } from "./src/config.js";
import { parseCsv } from "./src/grid.js";
import {
  ImportResult,
  parseConfig,
  runImport,
  slug,
  SourceInput,
} from "./src/import.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

async function importFixture(name: string): Promise<ImportResult> {
  const dir = join(fixtures, name);
  const config = parseConfig(
    JSON.parse(readFileSync(join(dir, "config.json"), "utf8")),
  );
  const file = readdirSync(dir).find((f) => /\.(csv|xlsx)$/.test(f))!;
  return runImport(config, [
    {
      id: Object.keys(config.sources)[0]!,
      file,
      bytes: readFileSync(join(dir, file)),
    },
  ]);
}

function imported(result: ImportResult): BomDocument {
  assert.ok(result.doc, JSON.stringify(result.findings, null, 2));
  return result.doc;
}

const partOf = (doc: BomDocument, id: string): Part =>
  (doc.parts as Record<string, Part>)[id]!;
const usagesOf = (doc: BomDocument, part: string): Usage[] =>
  (doc.parts as Record<string, Part>)[part]?.usages ?? [];
const rowOf = (u: Usage) => u.provenance?.locations[0]?.row;
const errors = (doc: BomDocument) =>
  (doc.issues ?? []).filter((i) => i.severity === "error");

// ---- The published sources of the examples ---------------------------------

for (const name of readdirSync(fixtures).filter((f) =>
  existsSync(join(fixtures, f, "config.json")),
)) {
  test(`${name}: the import gives the expected document, twice`, async () => {
    const first = serialize(imported(await importFixture(name)));
    assert.equal(serialize(imported(await importFixture(name))), first);
    const expected = join(fixtures, name, "expected.bom.json");
    if (process.env["UPDATE_EXPECTED"]) writeFileSync(expected, first);
    assert.equal(first, readFileSync(expected, "utf8"));
  });
}

test("control board: usages equal the hand-written example", async () => {
  const result = await importFixture("control-board");
  const doc = imported(result);
  assert.deepEqual(
    usagesOf(doc, "control-board"),
    usagesOf(controlBoard, "control-board"),
  );
  assert.equal(errors(doc).length, 0);
  // The source lists four designators for a quantity of three; the check sees it.
  assert.ok(result.findings.some((f) => f.code === "check:refdes-count"));
  for (const [id, part] of Object.entries(controlBoard.parts)) {
    const sku = part.supplierParts?.find((s) => s.supplier === "digikey")?.sku;
    if (sku !== undefined && doc.parts[id]?.supplierParts)
      assert.equal(doc.parts[id]!.supplierParts![0]!.sku, sku, id);
  }
});

test("PlanktoScope: quantities, labels and rows equal the hand-written example", async () => {
  const doc = imported(await importFixture("planktoscope"));
  const mine = usagesOf(doc, "planktoscope");
  const theirs = usagesOf(planktoscope, "planktoscope");
  const pick = (u: Usage) => ({
    id: u.id,
    quantity: u.quantity,
    designators: u.designators,
    provenance: u.provenance,
  });
  assert.deepEqual(mine.map(pick), theirs.map(pick));
  // Every reference the example buys by is the one read from the source.
  theirs.forEach((u, i) => {
    const theirPart = partOf(planktoscope, u.part);
    const reference =
      theirPart.manufacturerParts?.[0]?.mpn ??
      theirPart.supplierParts?.[0]?.sku;
    const myPart = partOf(doc, mine[i]!.part);
    if (reference !== undefined && myPart.manufacturerParts)
      assert.equal(myPart.manufacturerParts[0]!.mpn, reference, u.id);
  });
  assert.equal(errors(doc).length, 0);
});

test("OreSat frames: every row has the quantity and part number of the hand-written example", async () => {
  const doc = imported(await importFixture("oresat-frames"));
  const identity = (p: Part) =>
    p.supplierParts?.[0]?.sku ?? p.identifiers?.[0]?.value;
  for (const product of cubesatFrames.products) {
    const theirs = usagesOf(cubesatFrames, product);
    const mine = usagesOf(doc, product);
    assert.equal(mine.length, theirs.length, product);
    for (const u of theirs) {
      const m = mine.find((x) => rowOf(x) === rowOf(u));
      assert.ok(m, `${product} row ${rowOf(u)}`);
      assert.deepEqual(m.quantity, u.quantity, `${product} row ${rowOf(u)}`);
      // The example removes the stand-in catalog number of the spring; so does the configuration.
      assert.equal(
        identity(partOf(doc, m.part)),
        identity(partOf(cubesatFrames, u.part)),
        `${product} row ${rowOf(u)}`,
      );
    }
  }
  // Parts shared by several sheets are one part, as in the example.
  assert.equal(
    Object.keys(doc.parts).length,
    Object.keys(cubesatFrames.parts).length,
  );
  // Line breaks inside part numbers ("OreSat_Ca\r\nrdWedge") are removed by `derive`.
  assert.ok(doc.parts["OreSat_CardWedge"]);
  assert.ok(doc.parts["1U_Frame--X-Frame"] && doc.parts["1U_Frame-+X-Frame"]);
  assert.equal(errors(doc).length, 0);
});

test("rover: assemblies and rows equal the hand-written example; pack quantities are flagged", async () => {
  const doc = imported(await importFixture("rover"));
  for (const assembly of ["drive-wheel", "corner", "rocker-bogie", "body"]) {
    const onRover = (d: BomDocument) =>
      usagesOf(d, "rover").find((u) => u.id === assembly)!.quantity;
    assert.deepEqual(onRover(doc), onRover(rover), assembly);
    const theirs = usagesOf(rover, assembly);
    const mine = usagesOf(doc, assembly);
    assert.deepEqual(
      mine.map((u) => [u.id, u.part, rowOf(u)]),
      theirs.map((u) => [u.id, u.part, rowOf(u)]),
      assembly,
    );
    for (const u of theirs) {
      const m = mine.find((x) => x.id === u.id)!;
      const flagged = (doc.issues ?? []).some((i) =>
        i.subjects?.some(
          (s) => "usage" in s && s.part === assembly && s.usage === u.id,
        ),
      );
      // The example converts packs to pieces by hand; the import keeps the source number and says so.
      if (!flagged)
        assert.deepEqual(m.quantity, u.quantity, `${assembly} ${u.id}`);
      else
        assert.ok(
          partOf(rover, u.part).supplierParts![0]!.packSize !== undefined ||
            same(m.quantity, u.quantity),
          `${assembly} ${u.id}`,
        );
    }
  }
  // A real disagreement of the source: one catalog number, two names.
  assert.ok(
    (doc.issues ?? []).some(
      (i) =>
        i.category === "conflict" &&
        i.subjects?.some((s) => "part" in s && s.part === "gb-1116-0024-0040"),
    ),
  );
});

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

// ---- Behaviour ---------------------------------------------------------------

const csv = (text: string): SourceInput[] => [
  { id: "src", file: "bom.csv", bytes: new TextEncoder().encode(text) },
];

const config = (table: Table) =>
  parseConfig({
    kind: "importConfig",
    configVersion: "0.1",
    sources: { src: {} },
    document: {
      id: "urn:test:bom",
      products: ["top"],
      parts: { top: { kind: "custom", name: "Top" } },
    },
    tables: [table],
  });

const simple: Table = {
  columns: {
    ref: ["Ref", "Reference"],
    qty: "Qty",
    mpn: { header: "MPN", optional: true },
  },
  emit: [
    {
      part: { id: "$id(mpn)", kind: "'standard'", name: "mpn" },
      usage: {
        parent: "'top'",
        id: "$id(ref)",
        quantity: { value: "$num(qty)" },
        designators: "$designators(ref)",
      },
    },
  ],
};

const message = (r: ImportResult) =>
  r.findings
    .filter((f) => f.severity === "error")
    .map((f) => f.message)
    .join("\n");

test("items on several rows: sections, continuations and the previous row", async () => {
  const table: Table = {
    columns: {
      type: "Type",
      ref: "Ref",
      desc: "Description",
      qty: "Qty",
      maker: "Maker",
      mpn: "MPN",
    },
    rows: [
      {
        role: "section",
        when: "type = 'Assembly'",
        ctx: { assembly: "$id($lowercase(desc))", title: "desc" },
      },
      { role: "item", when: "type = 'Part'" },
      // "If the row above is a part, or continues one, and this row has no type, it belongs to it."
      {
        role: "continuation",
        when: "$not($exists(type)) and $exists(mpn) and ($prev.type = 'Part' or $not($exists($prev.type)))",
      },
      { role: "skip", when: "type = 'Total'" },
    ],
    emit: [
      {
        shared: true,
        part: { id: "$ctx.assembly", kind: "'custom'", name: "$ctx.title" },
        usage: {
          parent: "'top'",
          id: "$ctx.assembly",
          quantity: { value: "1" },
        },
      },
      {
        part: {
          id: "$id(mpn)",
          kind: "'standard'",
          name: "desc",
          manufacturerParts:
            "[$rows.{ 'manufacturer': $org(maker), 'mpn': mpn }]",
        },
        usage: {
          parent: "$ctx.assembly",
          id: "$id(ref)",
          quantity: { value: "$num(qty)" },
          designators: "$designators(ref)",
        },
      },
    ],
  };
  const result = await runImport(
    config(table),
    csv(
      [
        "Customer BOM,,,,,",
        ",,,,,",
        "Type,Ref,Description,Qty,Maker,MPN",
        "Assembly,,Power stage,,,",
        "Part,R1-R3,Resistor 10k,3,Yageo,RC0603-10K",
        ",,,,Vishay,CRCW0603-10K",
        ",,,,Panasonic,ERJ-3EKF1002V",
        "Part,C1,Capacitor 100n,1,Kemet,C0603C104",
        "Assembly,,Logic,,,",
        "Part,U1,MCU,1,Microchip,ATMEGA328P",
        "Total,,,5,,",
      ].join("\r\n"),
    ),
  );
  const doc = imported(result);
  assert.deepEqual(result.sheets[0]!.rows, {
    item: 3,
    continuation: 2,
    section: 2,
    skip: 1,
    empty: 0,
  });
  assert.equal(result.sheets[0]!.headerRow, 3);
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => u.part),
    ["power-stage", "logic"],
  );
  const resistor = doc.parts["RC0603-10K"]!;
  assert.deepEqual(
    resistor.manufacturerParts!.map((m) => m.mpn),
    ["RC0603-10K", "CRCW0603-10K", "ERJ-3EKF1002V"],
  );
  assert.deepEqual(
    resistor.provenance!.locations.map((l) => l.row),
    [5, 6, 7],
  );
  const r = usagesOf(doc, "power-stage")[0]!;
  assert.deepEqual(r.designators, [
    { scheme: "refdes", values: ["R1", "R2", "R3"] },
  ]);
  assert.deepEqual(
    usagesOf(doc, "logic").map((u) => u.id),
    ["U1"],
  );
  assert.deepEqual(Object.keys(doc.organizations!).sort(), [
    "kemet",
    "microchip",
    "panasonic",
    "vishay",
    "yageo",
  ]);
  assert.equal(result.findings.filter((f) => f.severity === "error").length, 0);
});

test("a row matching no row rule stops the import", async () => {
  const table: Table = {
    ...simple,
    rows: [{ role: "item", when: "$exists(mpn)" }],
  };
  const result = await runImport(
    config(table),
    csv("Ref,Qty,MPN\nR1,1,A\nsubtotal,1,\n"),
  );
  assert.equal(result.doc, undefined);
  assert.match(message(result), /row 3 matches no rule/);
});

test("a missing column stops the import and is named", async () => {
  const result = await runImport(
    config(simple),
    csv("Designator,Qty,MPN\nR1,1,A\n"),
  );
  assert.equal(result.doc, undefined);
  assert.match(
    message(result),
    /closest is row 1, without ref \("ref" or "reference"\)/,
  );
});

test("headers are matched whatever their case, spacing and position; other columns are reported", async () => {
  const result = await runImport(
    config(simple),
    csv('Notes;" mpn ";QTY;"Reference\n"\nx;A;2;R1 R2\n'),
  );
  const doc = imported(result);
  assert.deepEqual(usagesOf(doc, "top")[0]!.quantity, { value: 2 });
  assert.deepEqual(result.sheets[0]!.unmappedColumns, ["Notes"]);
});

test("expressions are checked when the configuration is loaded", async () => {
  const withUsage = (usage: Record<string, unknown>): Table => ({
    ...simple,
    emit: [
      {
        part: simple.emit[0]!.part,
        usage: { ...simple.emit[0]!.usage!, ...usage },
      },
    ],
  });
  const fails = async (table: Table, pattern: RegExp) => {
    // The source has no usable row: the failure comes from the configuration alone.
    const result = await runImport(config(table), csv("Ref,Qty,MPN\n"));
    assert.equal(result.doc, undefined);
    assert.match(message(result), pattern);
  };
  await fails(
    withUsage({ notes: "[{ 'text': remark }]" }),
    /"remark" is not a declared column \(declared: ref, qty, mpn\)/,
  );
  await fails(
    withUsage({ notes: "[{ 'text': $now() }]" }),
    /\$now is not allowed/,
  );
  await fails(
    withUsage({ notes: "[{ 'text': $eval(ref) }]" }),
    /\$eval is not allowed/,
  );
  await fails(
    withUsage({ notes: "[{ 'text': $shet }]" }),
    /unknown variable or function \$shet/,
  );
  await fails(
    withUsage({ notes: "[{ 'text': $ctx.zone }]" }),
    /"zone" is not set by any section row/,
  );
  await fails(
    withUsage({ notes: "[{ 'text': $prev.ref }]" }),
    /unknown variable or function \$prev/,
  );
  await fails(
    withUsage({ id: "ref &" }),
    /emit\[0\]\.usage\.id: .* in `ref &`/,
  );
});

test("an unknown key of the configuration is refused", () => {
  assert.throws(
    () =>
      parseConfig({
        kind: "importConfig",
        configVersion: "0.1",
        sources: {},
        document: { id: "urn:x", products: ["a"] },
        tables: [{ ...simple, colums: {} }],
      }),
    /invalid import configuration[\s\S]*colums/,
  );
});

test("an endless expression is stopped and reported on its row", async () => {
  const table: Table = {
    ...simple,
    derive: { loop: "($f := function($n) { $f($n + 1) }; $f(0))" },
  };
  const doc = imported(
    await runImport(config(table), csv("Ref,Qty,MPN\nR1,1,A\n")),
  );
  assert.deepEqual(usagesOf(doc, "top"), []);
  assert.match(
    errors(doc)[0]!.text,
    /row 2: derive\.loop: more than 100000 evaluation steps.*its item is not imported/,
  );
});

test("a derive value that fails on one row costs that row only", async () => {
  const table: Table = {
    ...simple,
    derive: { n: "$number(qty)" },
    emit: [
      {
        ...simple.emit[0]!,
        usage: { ...simple.emit[0]!.usage!, quantity: { value: "n" } },
      },
    ],
  };
  const result = await runImport(
    config(table),
    csv("Ref,Qty,MPN\nR1,1,A\nR2,approx 3,B\nR3,2,C\n"),
  );
  const doc = imported(result);
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => u.id),
    ["R1", "R3"],
  );
  assert.equal(doc.parts["B"], undefined);
  assert.equal(errors(doc).length, 1);
  assert.match(errors(doc)[0]!.text, /row 3: derive\.n: /);
  assert.deepEqual(result.sheets[0]!.emitted, [2]);
});

test("tables reading one source with different delimiters each parse it their way", async () => {
  const result = await runImport(
    parseConfig({
      kind: "importConfig",
      configVersion: "0.1",
      sources: { src: {} },
      document: {
        id: "urn:test:bom",
        products: ["top"],
        parts: { top: { kind: "custom", name: "Top" } },
      },
      tables: [
        { ...simple, delimiter: ";" },
        {
          delimiter: ",",
          columns: { line: "Ref;Qty;MPN" },
          emit: [{ part: { id: "$id(line)", kind: "'custom'", name: "line" } }],
        },
      ],
    }),
    csv("Ref;Qty;MPN\nR1;1;A\n"),
  );
  const doc = imported(result);
  assert.deepEqual(Object.keys(doc.parts).sort(), ["A", "R1-1-A", "top"]);
});

test("rows above the header that repeat a header text are passed over", async () => {
  const result = await runImport(
    config(simple),
    csv("Qty,Qty,Notes\nRef,Qty,MPN\nR1,1,A\n"),
  );
  imported(result);
  assert.equal(result.sheets[0]!.headerRow, 2);
  // With no other row to be the header, the ambiguity is what is reported.
  const ambiguous = await runImport(
    config(simple),
    csv("Ref,Qty,Qty,MPN\nR1,1,1,A\n"),
  );
  assert.equal(ambiguous.doc, undefined);
  assert.match(message(ambiguous), /row 1: several columns match "qty"/);
  // A header row given by hand is not searched: its ambiguity stops the import.
  const fixed = await runImport(
    config({ ...simple, headerRow: 1 }),
    csv("Qty,Qty,Notes\nRef,Qty,MPN\nR1,1,A\n"),
  );
  assert.match(message(fixed), /row 1: several columns match "qty"/);
});

test("designator ranges keep their leading zeros", async () => {
  const doc = imported(
    await runImport(
      config(simple),
      csv('Ref,Qty,MPN\nR01-R04,4,A\n"R08-R10,R1-3",6,B\n'),
    ),
  );
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => u.designators![0]!.values),
    [
      ["R01", "R02", "R03", "R04"],
      ["R08", "R09", "R10", "R1", "R2", "R3"],
    ],
  );
});

test("what is not understood is left out and raised as an issue, never guessed", async () => {
  const result = await runImport(
    config(simple),
    csv('Ref,Qty,MPN\nR1,TBD,A\nR2,"1,5",B\nR3-R1,2,C\nR4,1,\nR5,2,E\n'),
  );
  const doc = imported(result);
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => u.id),
    ["R3-R1", "R5"],
  );
  const texts = errors(doc).map((i) => i.text);
  assert.match(
    texts[0]!,
    /row 2: the usage is not imported: quantity is missing \("TBD" is not read as a number\)/,
  );
  assert.match(
    texts[1]!,
    /row 3: the usage is not imported: quantity is missing \("1,5" is not read as a number\)/,
  );
  assert.match(texts[2]!, /row 5: the part is not imported: id is missing/);
  assert.equal(errors(doc)[0]!.provenance!.locations[0]!.row, 2);
  // A range that cannot be expanded: the usage is kept without designators, with a warning.
  const warning = doc.issues!.find((i) => i.severity === "warning")!;
  assert.match(
    warning.text,
    /row 4: designator range "R3-R1" is not understood/,
  );
  assert.equal(usagesOf(doc, "top")[0]!.designators, undefined);
  // The check then sees a quantity without designators for nothing: R5 has two pieces and one designator.
  assert.ok(result.findings.some((f) => f.code === "check:refdes-count"));
});

test("a decimal comma is read only when asked for", async () => {
  const table: Table = {
    ...simple,
    emit: [
      {
        part: simple.emit[0]!.part,
        usage: {
          parent: "'top'",
          id: "$id(ref)",
          quantity: { value: "$num(qty, ',')", unit: "'m'" },
        },
      },
    ],
  };
  const doc = imported(
    await runImport(
      config(table),
      csv("Ref;Qty;MPN\nW1;2,5;CABLE\nW2;1.5;CABLE2\n"),
    ),
  );
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => u.quantity.value),
    [2.5],
  );
  assert.match(
    errors(doc)[0]!.text,
    /row 3: the usage is not imported: quantity\.value is missing \("1\.5" is not read as a number\)/,
  );
});

test("two rows giving the same usage id are both kept and reported", async () => {
  const result = await runImport(
    config(simple),
    csv("Ref,Qty,MPN\nR1,1,A\nR1,2,B\n"),
  );
  const doc = imported(result);
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => [u.id, u.part, u.quantity.value]),
    [
      ["R1", "A", 1],
      ["R1:2", "B", 2],
    ],
  );
  assert.match(
    errors(doc)[0]!.text,
    /row 3 gives the usage id "R1" in top, already given at row 2/,
  );
});

test("a part met several times is one part; disagreements are reported", async () => {
  const table: Table = {
    columns: {
      ref: "Ref",
      qty: "Qty",
      mpn: "MPN",
      desc: "Description",
      maker: "Maker",
    },
    emit: [
      {
        part: {
          id: "$id(mpn)",
          kind: "'standard'",
          name: "desc",
          manufacturerParts: [{ manufacturer: "$org(maker)", mpn: "mpn" }],
        },
        usage: {
          parent: "'top'",
          id: "$id(ref)",
          quantity: { value: "$num(qty)" },
        },
      },
    ],
  };
  const doc = imported(
    await runImport(
      config(table),
      csv(
        "Ref,Qty,MPN,Description,Maker\nR1,1,A,Resistor,Yageo\nR2,1,A,Resistor,YAGEO\nR3,1,A,Resistor 10k,Yageo\n",
      ),
    ),
  );
  assert.deepEqual(Object.keys(doc.parts).sort(), ["A", "top"]);
  assert.equal(doc.parts["A"]!.name, "Resistor");
  assert.equal(doc.parts["A"]!.manufacturerParts!.length, 1);
  assert.deepEqual(
    doc.parts["A"]!.provenance!.locations.map((l) => l.row),
    [2, 3, 4],
  );
  const conflicts = doc.issues!.filter((i) => i.category === "conflict");
  assert.equal(conflicts.length, 1);
  assert.match(
    conflicts[0]!.text,
    /Part A: name is "Resistor" at row 2 and "Resistor 10k" at row 4/,
  );
});

test("corrections are rules: they apply again to the next revision, and the diff shows what changed", async () => {
  const dir = join(fixtures, "planktoscope");
  const cfg = parseConfig(
    JSON.parse(readFileSync(join(dir, "config.json"), "utf8")),
  );
  const v1 = readFileSync(join(dir, "bom.csv"), "utf8");
  const lines = v1.trimEnd().split("\n");
  // Revision B of the customer's file: one quantity changes, one line is
  // removed, one is added, and two lines swap places.
  const v2 = [
    lines[0]!,
    lines[2]!,
    lines[1]!,
    ...lines.slice(3, 6),
    lines[6]!.replace(",8,A4,", ",10,A4,"),
    ...lines.slice(7).filter((l) => !l.startsWith("14,")),
    "35,Cable tie 100mm,6,Z1,HellermannTyton,T18R",
  ].join("\n");
  const run = async (text: string, revision: string) =>
    imported(
      await runImport(
        cfg,
        [{ id: "bom", file: "bom.csv", bytes: new TextEncoder().encode(text) }],
        { revision },
      ),
    );
  const a = await run(v1, "A");
  const b = await run(v2, "B");
  assert.equal(b.revision, "B");
  const changes = diff(a, b).changes.filter((c) => c.op !== "documentModified");
  assert.deepEqual(
    changes
      .map((c) => {
        const x = c as { op: string; usage?: string; part?: string };
        return `${x.op} ${x.usage ?? x.part}`;
      })
      .sort(),
    [
      "partAdded hellermanntyton-t18r",
      "partRemoved mini-bubbling-usb",
      "usageAdded 35",
      "usageModified 6",
      "usageRemoved 14",
    ].sort(),
  );
  const modified = changes.find((c) => c.op === "usageModified")!;
  assert.deepEqual("fields" in modified && modified.fields, [
    { path: "/quantity/value", before: 8, after: 10 },
  ]);
  // The source file itself is a document of the BOM: its digest changes too.
  assert.ok(diff(a, b).changes.some((c) => c.op === "documentModified"));
});

// ---- Configuration schema ------------------------------------------------------

test("the JSON Schemas of the configuration and the enrichment accept the fixtures and refuse typos", () => {
  const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => void;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemas = buildSchemas();
  const validConfig = ajv.compile(schemas["import-config.schema.json"]!);
  for (const name of readdirSync(fixtures).filter((f) =>
    existsSync(join(fixtures, f, "config.json")),
  )) {
    const json = JSON.parse(
      readFileSync(join(fixtures, name, "config.json"), "utf8"),
    ) as { tables: Record<string, unknown>[] };
    assert.ok(
      validConfig(json),
      `${name}: ${JSON.stringify(validConfig.errors)}`,
    );
    assert.ok(
      !validConfig({ ...json, tables: [{ ...json.tables[0], colums: {} }] }),
      name,
    );
    assert.ok(
      !validConfig({
        ...json,
        tables: [{ ...json.tables[0], columns: { "bad name": "X" } }],
      }),
      name,
    );
  }
  // An editor finds the schema through "$schema"; the importer accepts the key.
  parseConfig({
    $schema: "https://example.org/import-config.schema.json",
    ...JSON.parse(readFileSync(join(fixtures, "rover", "config.json"), "utf8")),
  });
  const validEnrichment = ajv.compile(
    schemas["import-enrichment.schema.json"]!,
  );
  assert.ok(
    validEnrichment({
      kind: "importEnrichment",
      configVersion: "0.1",
      parts: { A: { name: "Resistor 10k" } },
    }),
  );
  assert.ok(
    !validEnrichment({
      kind: "importEnrichment",
      configVersion: "0.1",
      parts: { A: { nmae: "Resistor 10k" } },
    }),
  );
});

// ---- Revisions: issue ids, answers, values set by hand ---------------------------------

const boardConfig = () =>
  parseConfig(
    JSON.parse(
      readFileSync(join(fixtures, "control-board", "config.json"), "utf8"),
    ),
  );
const boardCsv = () =>
  readFileSync(
    join(fixtures, "control-board", "bom_v2.0.3_board_ref_parts.csv"),
    "utf8",
  );
const bytes = (text: string) => new TextEncoder().encode(text);
const boardSource = (text: string): SourceInput[] => [
  {
    id: Object.keys(boardConfig().sources)[0]!,
    file: "bom.csv",
    bytes: bytes(text),
  },
];

test("issue ids do not depend on row order, and answers are carried to the next revision", async () => {
  // Records, not lines: some cells of this file hold line breaks.
  const [header, ...records] = parseCsv(boardCsv());
  const write = (rows: (string | undefined)[][]) =>
    rows
      .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
  const revA = imported(
    await runImport(boardConfig(), boardSource(write([header!, ...records])), {
      revision: "A",
    }),
  );
  const missing = revA.issues!.filter((i) => i.category === "missing");
  assert.ok(missing.length >= 2);
  // The customer answers two issues of revision A.
  const answered: BomDocument = structuredClone(revA);
  const [first, second] = [
    answered.issues!.find((i) => i.id === missing[0]!.id)!,
    answered.issues!.find((i) => i.id === missing[1]!.id)!,
  ];
  first.status = "answered";
  first.answers = [{ text: "Use the part of the URL.", by: "jpl" }];
  second.status = "resolved";
  // Revision B: the rows are in reverse order, and the row of the second answered issue is gone.
  const gone = second.provenance!.locations[0]!.row! - 2;
  const result = await runImport(
    boardConfig(),
    boardSource(
      write([header!, ...records.filter((_, i) => i !== gone).reverse()]),
    ),
    { revision: "B", previous: answered },
  );
  const revB = imported(result);
  const ids = (d: BomDocument) => (d.issues ?? []).map((i) => i.id).sort();
  assert.deepEqual(
    ids(revB),
    ids(revA).filter((id) => id !== second.id),
  );
  const carried = revB.issues!.find((i) => i.id === first.id)!;
  assert.equal(carried.status, "answered");
  assert.deepEqual(carried.answers, first.answers);
  // Its rows moved; the text and provenance are those of revision B.
  assert.notDeepEqual(carried.provenance, first.provenance);
  assert.ok(
    result.findings.some(
      (f) =>
        f.code === "previous" && /1 issue\(s\) are carried/.test(f.message),
    ),
  );
  assert.ok(
    result.findings.some(
      (f) =>
        f.code === "previous" &&
        f.message.includes(`issue ${second.id} `) &&
        /no longer raised/.test(f.message),
    ),
  );
});

test("a value declared by hand hides the imported one, and says so; a change in the source opens a new issue", async () => {
  const table: Table = {
    columns: { ref: "Ref", qty: "Qty", mpn: "MPN", desc: "Description" },
    emit: [
      {
        part: { id: "$id(mpn)", kind: "'standard'", name: "desc" },
        usage: {
          parent: "'top'",
          id: "$id(ref)",
          quantity: { value: "$num(qty)" },
        },
      },
    ],
  };
  const cfg = parseConfig({
    kind: "importConfig",
    configVersion: "0.1",
    sources: { src: {} },
    document: {
      id: "urn:test:bom",
      products: ["top"],
      parts: {
        top: { kind: "custom", name: "Top" },
        A: { kind: "standard", name: "Resistor 10k 1% 0603" },
      },
    },
    tables: [table],
  });
  const a = imported(
    await runImport(cfg, csv("Ref,Qty,MPN,Description\nR1,1,A,Resistor\n")),
  );
  assert.equal(a.parts["A"]!.name, "Resistor 10k 1% 0603");
  const hidden = a.issues!.filter((i) => i.severity === "info");
  assert.equal(hidden.length, 1);
  assert.match(
    hidden[0]!.text,
    /Part A: name is "Resistor 10k 1% 0603", set by the configuration; the import gives "Resistor" at row 2/,
  );
  assert.deepEqual(hidden[0]!.subjects, [{ part: "A", field: "/name" }]);
  // Same source value: same issue. Another value: a new issue, the old one reported as gone.
  const confirmed: BomDocument = structuredClone(a);
  confirmed.issues![0]!.status = "resolved";
  const again = imported(
    await runImport(cfg, csv("Ref,Qty,MPN,Description\nR1,2,A,Resistor\n"), {
      previous: confirmed,
    }),
  );
  assert.deepEqual(
    again.issues!.map((i) => [i.id, i.status]),
    [[hidden[0]!.id, "resolved"]],
  );
  const changed = await runImport(
    cfg,
    csv("Ref,Qty,MPN,Description\nR1,1,A,Resistor 4k7\n"),
    { previous: confirmed },
  );
  const issue = imported(changed).issues![0]!;
  assert.notEqual(issue.id, hidden[0]!.id);
  assert.equal(issue.status, undefined);
  assert.ok(changed.findings.some((f) => /no longer raised/.test(f.message)));
});

test("an enrichment completes imported parts outside the configuration", async () => {
  const enrichment = {
    kind: "importEnrichment",
    configVersion: "0.1",
    parts: {
      A: {
        name: "Resistor 10k 1% 0603",
        properties: { resistance: { value: 10, unit: "kOhm" } },
      },
      gone: { name: "Removed from the source" },
    },
  };
  const input = {
    id: "curation",
    file: "curation.json",
    bytes: bytes(JSON.stringify(enrichment)),
  };
  const result = await runImport(config(simple), csv("Ref,Qty,MPN\nR1,1,A\n"), {
    enrichments: [input],
  });
  const doc = imported(result);
  assert.equal(doc.parts["A"]!.name, "Resistor 10k 1% 0603");
  assert.deepEqual(doc.parts["A"]!.properties, {
    resistance: { value: 10, unit: "kOhm" },
  });
  const hidden = doc.issues!.find((i) => i.severity === "info")!;
  assert.match(
    hidden.text,
    /Part A: name is "Resistor 10k 1% 0603", set by enrichment "curation.json"; the import gives "A"/,
  );
  assert.ok(
    result.findings.some(
      (f) => f.code === "enrichment-unused" && f.message.includes(`"gone"`),
    ),
  );
  // The enrichment is an input of the BOM, with its digest.
  assert.ok(doc.documents!["curation"]!.sha256);
  assert.deepEqual(doc.generator!.sources, ["src", "curation"]);
  // A misspelt field is refused, naming the file.
  const bad = {
    ...input,
    bytes: bytes(
      JSON.stringify({ ...enrichment, parts: { A: { nmae: "x" } } }),
    ),
  };
  assert.match(
    message(
      await runImport(config(simple), csv("Ref,Qty,MPN\nR1,1,A\n"), {
        enrichments: [bad],
      }),
    ),
    /curation\.json: invalid enrichment[\s\S]*nmae/,
  );
});

// ---- Expressions: traps and helpers ------------------------------------------------

test("$nth tells identical rows apart by their order among themselves, not by row number", async () => {
  const table: Table = {
    columns: {
      pn: "PN",
      qty: "Qty",
      desc: { header: "Description", optional: true },
    },
    derive: {
      side: "desc ? desc : $lookup({ '1': 'left', '2': 'right' }, $string($nth(pn)))",
    },
    emit: [
      {
        part: {
          id: "$id(pn & ' ' & side)",
          kind: "'custom'",
          name: "pn & ' ' & side",
        },
        usage: {
          parent: "'top'",
          id: "$id(pn & ' ' & side)",
          quantity: { value: "$num(qty)" },
        },
      },
    ],
  };
  const run = async (text: string) =>
    usagesOf(imported(await runImport(config(table), csv(text))), "top").map(
      (u) => u.id,
    );
  assert.deepEqual(await run("PN,Qty,Description\nW,1,\nW,1,\nS,4,Screw\n"), [
    "W-left",
    "W-right",
    "S-Screw",
  ]);
  // Other rows inserted above and between: the same reading.
  assert.deepEqual(
    await run("PN,Qty,Description\nS,4,Screw\nW,1,\nN,2,Nut\nW,1,\n"),
    ["S-Screw", "W-left", "N-Nut", "W-right"],
  );
  const inEmit: Table = {
    ...simple,
    emit: [
      {
        ...simple.emit[0]!,
        usage: { ...simple.emit[0]!.usage!, id: "$string($nth(ref))" },
      },
    ],
  };
  assert.match(
    message(await runImport(config(inEmit), csv("Ref,Qty,MPN\n"))),
    /\$nth is only available in derive/,
  );
});

test("a single value where the specification expects a list is put in a list", async () => {
  const table: Table = {
    columns: { ref: "Ref", qty: "Qty", mpn: "MPN", maker: "Maker" },
    emit: [
      {
        // On one row, `$rows.{…}` gives an object, not a list of one.
        part: {
          id: "$id(mpn)",
          kind: "'standard'",
          name: "mpn",
          manufacturerParts:
            "$rows.{ 'manufacturer': $org(maker), 'mpn': mpn }",
        },
        usage: {
          parent: "'top'",
          id: "$id(ref)",
          quantity: { value: "$num(qty)" },
          notes: "{ 'text': 'from ' & ref }",
        },
      },
    ],
  };
  const doc = imported(
    await runImport(config(table), csv("Ref,Qty,MPN,Maker\nR1,1,A,Yageo\n")),
  );
  assert.deepEqual(doc.parts["A"]!.manufacturerParts, [
    { manufacturer: "yageo", mpn: "A" },
  ]);
  assert.deepEqual(usagesOf(doc, "top")[0]!.notes, [{ text: "from R1" }]);
  assert.equal(errors(doc).length, 0);
});

test("`!=` on a cell is reported when the configuration is loaded", async () => {
  const table: Table = {
    ...simple,
    emit: [{ ...simple.emit[0]!, when: "mpn != 'DNP'" }],
  };
  const result = await runImport(config(table), csv("Ref,Qty,MPN\nR1,1,A\n"));
  assert.ok(result.doc);
  assert.match(
    result.findings.find((f) => f.code === "config-lint")!.message,
    /emit\[0\]: `!=` is false when a cell is empty/,
  );
});

test("the report counts the items each emission applied to", async () => {
  const table: Table = {
    ...simple,
    emit: [{ ...simple.emit[0]!, when: "$exists(mpn)" }],
  };
  const result = await runImport(
    config(table),
    csv("Ref,Qty,MPN\nR1,1,A\nR2,1,\nR3,1,B\n"),
  );
  assert.deepEqual(result.sheets[0]!.emitted, [2]);
});

test("$quantity reads a number and a unit", async () => {
  const table: Table = {
    columns: { ref: "Ref", qty: "Qty", mpn: "MPN" },
    emit: [
      {
        part: { id: "$id(mpn)", kind: "'material'", name: "mpn", unit: "'m'" },
        usage: {
          parent: "'top'",
          id: "$id(ref)",
          quantity:
            "$quantity(qty, { 'units': { 'pcs': '1', 'ft': '[ft_i]' }, 'decimal': ',' })",
        },
      },
    ],
  };
  const doc = imported(
    await runImport(
      config(table),
      csv(
        "Ref;Qty;MPN\nW1;250 mm;CABLE\nW2;2,5m;CABLE\nW3;3 ft;CABLE\nW4;4 pcs;CABLE\nW5;7;CABLE\nW6;5 parsecs;CABLE\n",
      ),
    ),
  );
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => u.quantity),
    [
      { value: 250, unit: "mm" },
      { value: 2.5, unit: "m" },
      { value: 3, unit: "[ft_i]" },
      { value: 4 },
      { value: 7 },
    ],
  );
  assert.match(
    errors(doc)[0]!.text,
    /row 7: the usage is not imported: quantity is missing \("5 parsecs": unit "parsecs" is not understood/,
  );
});

test("$quantity reads UCUM units beyond those it converts, and takes mapped units as given", async () => {
  const table: Table = {
    columns: { ref: "Ref", qty: "Qty", mpn: "MPN" },
    emit: [
      {
        part: { id: "$id(mpn)", kind: "'material'", name: "mpn" },
        usage: {
          parent: "'top'",
          id: "$id(ref)",
          quantity:
            "$quantity(qty, { 'units': { 'psi': '[psi]', 'st': '[stone_av]', '%': '%' } })",
        },
      },
    ],
  };
  const doc = imported(
    await runImport(
      config(table),
      csv(
        "Ref,Qty,MPN\nA1,2 N.m,X\nA2,5 kg/m,X\nA3,10 mL/min,X\nA4,3 %,X\nA5,30 psi,X\nA6,2 st,X\nA7,4 {pcs},X\nA8,1 furlongs,X\n",
      ),
    ),
  );
  assert.deepEqual(
    usagesOf(doc, "top").map((u) => u.quantity!.unit),
    ["N.m", "kg/m", "mL/min", "%", "[psi]", "[stone_av]", "{pcs}"],
  );
  assert.match(
    errors(doc)[0]!.text,
    /row 9: .*unit "furlongs" is not understood/,
  );
});

test("organizations created by $org are kept only if a part refers to them", async () => {
  const table: Table = {
    columns: { ref: "Ref", qty: "Qty", mpn: "MPN", maker: "Maker" },
    emit: [
      {
        part: {
          id: "$id(mpn)",
          kind: "'custom'",
          name: "$lowercase(maker)",
          manufacturerParts: [{ manufacturer: "$org(maker)", mpn: "mpn" }],
        },
        usage: {
          parent: "'top'",
          id: "$id(ref)",
          quantity: { value: "$num(qty)" },
        },
        // A made part: the manufacturer read from the row is dropped, its name stays.
        rules: [{ when: "true", part: { manufacturerParts: "[]" } }],
      },
    ],
  };
  const doc = imported(
    await runImport(config(table), csv("Ref,Qty,MPN,Maker\nR1,1,A,Yageo\n")),
  );
  assert.equal(doc.parts["A"]!.name, "yageo");
  assert.equal(doc.organizations, undefined);
});

test("bomkit import: the command writes the document and reads --previous and --enrich", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dir = mkdtempSync(join(tmpdir(), "bomkit-import-"));
  const out = join(dir, "a.bom.json");
  const cfg = join(fixtures, "planktoscope", "config.json");
  const src = join(fixtures, "planktoscope", "bom.csv");
  const bomkit = (...args: string[]) =>
    execFileSync(
      process.execPath,
      [...process.execArgv, join(root, "tools", "cli.ts"), ...args],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  bomkit("import", cfg, src, "-o", out, "--revision", "A");
  const a = JSON.parse(readFileSync(out, "utf8")) as BomDocument;
  assert.equal(a.revision, "A");
  const enrich = join(dir, "notes.json");
  writeFileSync(
    enrich,
    JSON.stringify({
      kind: "importEnrichment",
      configVersion: "0.1",
      parts: { planktoscope: { description: "Open-source microscope" } },
    }),
  );
  const b = JSON.parse(
    bomkit("import", cfg, src, "--previous", out, "--enrich", enrich),
  ) as BomDocument;
  assert.equal(b.parts["planktoscope"]!.description, "Open-source microscope");
  assert.ok(b.documents!["notes"]);
  assert.throws(
    () => bomkit("import", cfg, `bom=${src}`, `bom=${src}`),
    /already given for source "bom"/,
  );

  // An enrichment whose file name is a source id gets a distinct id, or the one given.
  const clash = join(dir, "bom.json");
  writeFileSync(clash, readFileSync(enrich));
  assert.ok(
    (JSON.parse(bomkit("import", cfg, src, "--enrich", clash)) as BomDocument)
      .documents!["bom-2"],
  );
  assert.ok(
    (
      JSON.parse(
        bomkit("import", cfg, src, "--enrich", `curation=${clash}`),
      ) as BomDocument
    ).documents!["curation"],
  );

  // Positional sources fill the sources not given by name.
  const two = join(dir, "two.json");
  const config2 = JSON.parse(readFileSync(cfg, "utf8")) as {
    sources: Record<string, unknown>;
    tables: { source?: string }[];
  };
  config2.sources = { main: config2.sources["bom"], extra: {} };
  config2.tables = [
    { ...config2.tables[0]!, source: "main" },
    { ...config2.tables[0]!, source: "extra" },
  ];
  writeFileSync(two, JSON.stringify(config2));
  const both = JSON.parse(
    bomkit("import", two, `main=${src}`, src),
  ) as BomDocument;
  assert.deepEqual(both.generator!.sources, ["main", "extra"]);

  // A document larger than a pipe's buffer reaches the reader whole.
  const rover = join(fixtures, "rover");
  const piped = JSON.parse(
    bomkit("import", join(rover, "config.json"), join(rover, "parts_list.csv")),
  ) as BomDocument;
  const expected = JSON.parse(
    readFileSync(join(rover, "expected.bom.json"), "utf8"),
  ) as BomDocument;
  // The command adds the digest of the configuration; the rest is the same.
  assert.deepEqual(
    { ...piped, generator: undefined },
    { ...expected, generator: undefined },
  );
});

// ---- Reading -------------------------------------------------------------------

test("ids keep the characters that are valid, and their signs", () => {
  assert.equal(slug("-X Frame"), "-X-Frame");
  assert.equal(slug("+X Frame"), "+X-Frame");
  assert.equal(slug("  Würth / Elektronik (DE) "), "Wurth-Elektronik-DE");
  assert.equal(slug("=A1+K2-Q3"), "=A1+K2-Q3");
  assert.equal(slug(" / "), undefined);
});

test("CSV: quotes, line breaks in cells, byte order mark, delimiters", () => {
  assert.deepEqual(parseCsv('﻿a,"b ""x""",c\r\n1,"two\nlines",\r\n'), [
    ["a", 'b "x"', "c"],
    ["1", "two\nlines", undefined],
  ]);
  assert.deepEqual(parseCsv("a;b\n1,5;2\n"), [
    ["a", "b"],
    ["1,5", "2"],
  ]);
  assert.deepEqual(parseCsv("a\tb\n1\t2"), [
    ["a", "b"],
    ["1", "2"],
  ]);
  assert.throws(() => parseCsv('a,"b\n'), /not closed/);
});
