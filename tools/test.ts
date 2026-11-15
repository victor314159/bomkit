// Tests of the specification artifacts and of the reference tool.
// Run: npm test

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import {
  BomDocument,
  ElectricalProperties,
  IdentityMatch,
  SerialRange,
  WiringProperties,
} from "../src/index.js";
import { pcbaBuying } from "../examples/pcba.js";
import { goRailNutChange } from "../examples/rover/change-gorail-nut.js";
import { rover } from "../examples/rover/rover.js";
import { roverBeforeChange } from "../examples/rover/rover-before-change.js";
import { buyingBom } from "./lib/buy.js";
import { canonicalize, serialize } from "./lib/canonical.js";
import { checkAll } from "./lib/check.js";
import { evaluate, rootContext } from "./lib/evaluate.js";
import { diff } from "./lib/diff.js";
import { renderHtml } from "./lib/html.js";
import { renderDiffHtml } from "./lib/diff-html.js";
import { LoadedBom, loadBomFile } from "./lib/load.js";
import { buildSchemas } from "./lib/schemas.js";
import { validateStructure } from "./lib/structure.js";
import { conversionFactor } from "./lib/units.js";
import { EXAMPLES } from "./examples.js";

// The examples are exported, as `npm run examples` does, to a temporary
// folder: the tests never depend on generated files left on disk.
const root = mkdtempSync(join(tmpdir(), "bomkit-examples-"));
for (const [path, doc] of Object.entries(EXAMPLES)) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), serialize(doc));
}
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("HTML exports every BOM example with expandable manufacturing and flat purchasing views", () => {
  for (const [path, doc] of Object.entries(EXAMPLES)) {
    if (doc.kind !== "bom") continue;
    const { bom, findings } = loadBomFile(join(root, path));
    const html = renderHtml(bom!, findings);
    assert.ok(html.startsWith("<!doctype html>"), path);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
    assert.equal(new Set(ids).size, ids.length, `${path}: unique control ids`);
    assert.doesNotMatch(html, /<(script|link|iframe)\b/i);
    assert.match(
      html,
      /class="entry" style="--depth:0"><details class="node" open/,
    );
    assert.match(html, /class="children"><div class="entry"/);
    assert.match(html, /id="view-manufacturing" checked/);
    assert.match(html, /id="view-purchasing"/);
    assert.match(html, /prefers-color-scheme:dark/);
    assert.match(html, /id="theme-dark"/);
    const buy = buyingBom(bom!, { buildQuantity: 1 });
    for (const line of buy.lines) {
      assert.ok(
        html.includes(`data-part="${line.part}"`),
        `${path}: ${line.part}`,
      );
    }
    if (path === "rover/rover.bom.json") {
      assert.match(html, / · imported/);
    }
  }
});

test("HTML purchasing rolls up repeated subassemblies, keeps bought assemblies and reports cycles", () => {
  const bom = loadDocs({
    "tree.bom.json": {
      kind: "bom",
      specVersion: "0.1",
      id: "urn:test:tree",
      products: ["top"],
      parts: {
        top: {
          kind: "custom",
          name: "Top",
          usages: [
            { id: "a", part: "sub", quantity: { value: 2 } },
            { id: "b", part: "sub", quantity: { value: 3 } },
            { id: "c", part: "bought", quantity: { value: 1 } },
          ],
        },
        sub: {
          kind: "custom",
          name: "Sub",
          usages: [{ id: "bolt", part: "bolt", quantity: { value: 4 } }],
        },
        bolt: {
          kind: "standard",
          name: "Bolt",
          properties: { diameter: { value: 3, unit: "mm" } },
        },
        bought: {
          kind: "custom",
          name: "Bought module",
          makeOrBuy: "buy",
          usages: [{ id: "loop", part: "top", quantity: { value: 1 } }],
        },
      },
    },
  });
  const html = renderHtml(bom, [], { buildQuantity: 10 });
  assert.match(html, /Cycle detected; expansion stopped/);
  const purchasing = html.slice(html.indexOf('<section class="purchasing">'));
  assert.equal([...purchasing.matchAll(/data-part="bolt"/g)].length, 1);
  assert.match(purchasing, /<strong>200<\/strong>/);
  assert.match(purchasing, /data-part="bought"/);
  assert.doesNotMatch(purchasing, /data-part="sub"/);
  assert.match(
    html,
    /class="entry" style="--depth:1"><details class="node">\s*<summary>/,
  );
  // Part details remain outside the assembly disclosure when it is closed.
  assert.match(html, /<\/details><div class="node-info"><details>/);
});

test("HTML escapes untrusted content and preserves quantity and fitting semantics", () => {
  const doc: BomDocument = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:html",
    products: ["assembly"],
    name: '<script>alert("BOM")</script>',
    organizations: { maker: { name: "Maker & Co" } },
    parts: {
      assembly: {
        kind: "custom",
        name: "Assembly",
        usages: [
          {
            id: "lot",
            part: "wire",
            quantity: { basis: "perLot", value: 2 },
            fitted: false,
          },
          {
            id: "ar",
            part: "wire",
            quantity: { basis: "asRequired" },
            applicability: { option: "debug" },
          },
        ],
      },
      wire: {
        kind: "material",
        name: '<img src=x onerror="alert(1)">',
        unit: "m",
        notes: [{ text: "A & B" }],
        manufacturerParts: [
          { manufacturer: "maker", mpn: "ALT-01" },
          {
            manufacturer: "maker",
            mpn: "REJECTED-01",
            status: "notApproved",
          },
          {
            manufacturer: "maker",
            mpn: 'WIRE-"2"',
            status: "preferred",
          },
        ],
      },
    },
  };
  const bom = loadDocs({ "html.bom.json": doc });
  const html = renderHtml(bom);
  assert.doesNotMatch(html, /<script|<img/);
  assert.match(html, /&lt;script&gt;alert\(&quot;BOM&quot;\)&lt;\/script&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /2 m \/ lot/);
  assert.match(html, /— m · as required/);
  assert.match(html, /Not fitted/);
  assert.match(html, /Applicability/);
  assert.match(html, /<span>Manufacturer<\/span>\s*<span>MPN<\/span>/);
  assert.match(
    html,
    /class="manufacturer"><span title="[^"]*">Maker &amp; Co<\/span>/,
  );
  assert.match(
    html,
    /class="mpn"><span title="[^"]*">WIRE-&quot;2&quot;<\/span>/,
  );
  assert.match(html, /class="alternates" title="[^"]*">\+1<\/small>/);
  assert.doesNotMatch(html, /title="[^"]*REJECTED-01/);
  const material = renderHtml(bom, [], { product: "wire" });
  assert.match(material, /class="quantity">1 m<\/span>/);
});
const schemas = buildSchemas();

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => void;
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const byKind = {
  bom: ajv.compile(schemas["bom.schema.json"]!),
  changeSet: ajv.compile(schemas["change-set.schema.json"]!),
  buyingBom: ajv.compile(schemas["buying-bom.schema.json"]!),
};
const ajvValidate = (doc: { kind: keyof typeof byKind }) => {
  const v = byKind[doc.kind];
  return v(doc) ? true : v.errors;
};

/** Writes documents to a temporary folder and loads the first one. */
function loadDocs(docs: Record<string, unknown>): LoadedBom {
  const dir = mkdtempSync(join(tmpdir(), "bomkit-"));
  for (const [name, doc] of Object.entries(docs))
    writeFileSync(join(dir, name), JSON.stringify(doc));
  const { bom, findings } = loadBomFile(join(dir, Object.keys(docs)[0]!));
  assert.ok(bom, JSON.stringify(findings));
  return bom;
}

test("the hand-written buying BOM excerpt is a valid document", () => {
  assert.equal(validateStructure(pcbaBuying).success, true);
});

test("examples are valid for typia, for the JSON Schema (ajv), and semantically", () => {
  for (const path of Object.keys(EXAMPLES)) {
    const doc = JSON.parse(read(path));
    assert.equal(validateStructure(doc).success, true, `${path}: typia`);
    assert.equal(
      ajvValidate(doc),
      true,
      `${path}: ajv ${JSON.stringify(ajvValidate(doc))}`,
    );
    if (doc.kind === "bom") {
      const { bom, findings } = loadBomFile(join(root, path));
      const errors = [...findings, ...checkAll(bom!)].filter(
        (f) => f.severity === "error",
      );
      assert.deepEqual(errors, [], path);
    }
  }
});

test("typia and the JSON Schema reject the same invalid documents", () => {
  const base = JSON.parse(read("pcba.bom.json"));
  const mutations: [string, boolean, (d: any) => void][] = [
    ["unknown property", false, (d) => (d.colour = "red")],
    [
      "unknown key in a module extension",
      false,
      (d) => (d.extensions.subcontract.foo = 1),
    ],
    ["private extension", true, (d) => (d.extensions["x-acme"] = { a: 1 })],
    ["bad part id key", false, (d) => (d.parts["a/b"] = d.parts.pcb)],
    ["bad sha256", false, (d) => (d.documents.design.sha256 = "ABC")],
    [
      "document without uri nor sha256",
      false,
      (d) => delete d.documents.schematic.uri,
    ],
    [
      "document with uri and sha256",
      true,
      (d) => (d.documents.schematic.sha256 = "0".repeat(64)),
    ],
    [
      "negative quantity",
      false,
      (d) => (d.parts["uno-r3"].usages[0].quantity.value = -1),
    ],
    [
      "asRequired without value",
      true,
      (d) =>
        (d.parts["uno-r3"].usages[0].quantity = {
          basis: "asRequired",
        }),
    ],
    [
      "empty refdes list",
      false,
      (d) => (d.parts["uno-r3"].usages[2].designators[0].values = []),
    ],
    [
      "serial range with list and from",
      false,
      (d) =>
        (d.parts["uno-r3"].usages[0].applicability = {
          serial: { from: "1", list: ["2"] },
        }),
    ],
    ...["", "A100", "-1", "1.5", "1e3", " 10"].map(
      (bound): [string, boolean, (d: any) => void] => [
        `non-numeric serial bound ${JSON.stringify(bound)}`,
        false,
        (d) =>
          (d.parts["uno-r3"].usages[0].applicability = {
            serial: { from: bound },
          }),
      ],
    ),
    [
      "numeric serial bounds keep leading zeros and large integers",
      true,
      (d) =>
        (d.parts["uno-r3"].usages[0].applicability = {
          serial: { from: "001", to: "999999999999999999999" },
        }),
    ],
    [
      "non-numeric serial list",
      true,
      (d) =>
        (d.parts["uno-r3"].usages[0].applicability = {
          serial: { list: ["A100"] },
        }),
    ],
    [
      "non-numeric upper serial bound",
      false,
      (d) =>
        (d.parts["uno-r3"].usages[0].applicability = {
          serial: { to: "A100" },
        }),
    ],
    [
      "boolean option default",
      true,
      (d) => (d.options = { debug: { name: "Debug", default: false } }),
    ],
    [
      "string default for boolean option",
      false,
      (d) => (d.options = { debug: { name: "Debug", default: "true" } }),
    ],
    [
      "enumerated option default",
      true,
      (d) =>
        (d.options = {
          variant: { name: "Variant", values: ["a"], default: "a" },
        }),
    ],
    [
      "boolean default for enumerated option",
      false,
      (d) =>
        (d.options = {
          variant: { name: "Variant", values: ["a"], default: true },
        }),
    ],
    ...[
      "iec61360:aaE525",
      "iec62683:ACE44",
      "etim:8",
      "etim:EF000008extra",
      "eclass:02-AAO71",
    ].map((key): [string, boolean, (d: any) => void] => [
      `malformed dictionary key ${key}`,
      false,
      (d) => (d.parts["uno-r3"].properties = { [key]: 1 }),
    ]),
    [
      "bad date",
      false,
      (d) =>
        (d.parts["uno-r3"].usages[0].applicability = {
          date: { from: "2026-13-01" },
        }),
    ],
    [
      "serial of another item",
      false,
      (d) =>
        (d.parts["uno-r3"].usages[0].applicability = {
          serial: { from: "1", of: "pcb" },
        }),
    ],
    [
      "empty all",
      false,
      (d) => (d.parts["uno-r3"].usages[0].applicability = { all: [] }),
    ],
    [
      "row 0",
      false,
      (d) =>
        (d.parts["uno-r3"].provenance = {
          locations: [{ document: "design", row: 0 }],
        }),
    ],
    [
      "IEC 81346 usage id",
      true,
      (d) => (d.parts["uno-r3"].usages[0].id = "=A1+K2-Q3"),
    ],
    [
      "designators on the bottom side",
      true,
      (d) => (d.parts["uno-r3"].usages[2].designators[0].side = "bottom"),
    ],
    [
      "unknown board side",
      false,
      (d) => (d.parts["uno-r3"].usages[2].designators[0].side = "left"),
    ],
    [
      "range property",
      true,
      (d) =>
        (d.parts["uno-r3"].properties = {
          operatingTemperature: { min: -40, max: 85, unit: "Cel" },
        }),
    ],
    [
      "property the specification does not define",
      false,
      (d) => (d.parts["uno-r3"].properties = { gauge: "AWG22" }),
    ],
    [
      "property of a dictionary",
      true,
      (d) =>
        (d.parts["uno-r3"].properties = {
          "etim:EF000008": { value: 400, unit: "V" },
          "iec61360:AAE525": { value: 16, unit: "A" },
          "iec62683:ACE444": "x",
          "eclass:02-AAO715": 3,
        }),
    ],
    [
      "property of an unknown dictionary",
      false,
      (d) => (d.parts["uno-r3"].properties = { "unspsc:123": 1 }),
    ],
    [
      "mounting method of IEC 61360-4",
      true,
      (d) => (d.parts["uno-r3"].properties = { mounting: "surfaceMounted" }),
    ],
    [
      "mounting method outside the list",
      false,
      (d) => (d.parts["uno-r3"].properties = { mounting: "rail" }),
    ],
    [
      "mass and thickness",
      true,
      (d) =>
        (d.parts["uno-r3"].properties = {
          mass: { value: 25, unit: "g" },
          thickness: { value: 1.6, unit: "mm" },
        }),
    ],
    [
      "mass as text",
      false,
      (d) => (d.parts["uno-r3"].properties = { mass: "25 g" }),
    ],
    [
      "private property",
      true,
      (d) =>
        (d.parts["uno-r3"].properties = {
          "x-gauge": "AWG22",
          "x-bend": { min: 5, unit: "mm" },
        }),
    ],
    [
      "private property that is not a property value",
      false,
      (d) => (d.parts["uno-r3"].properties = { "x-gauge": { awg: 22 } }),
    ],
    [
      "standard property with the wrong type",
      false,
      (d) => (d.parts["uno-r3"].properties = { resistance: "10k" }),
    ],
    [
      "tolerance in percent",
      true,
      (d) =>
        (d.parts["uno-r3"].properties = {
          resistance: {
            value: 10,
            unit: "kOhm",
            tolerance: { percent: 1 },
          },
        }),
    ],
    [
      "asymmetric absolute tolerance",
      true,
      (d) =>
        (d.parts["uno-r3"].properties = {
          length: {
            value: 10,
            unit: "mm",
            tolerance: { absolute: { plus: 0.1, minus: 0 } },
          },
        }),
    ],
    [
      "tolerance as text",
      false,
      (d) =>
        (d.parts["uno-r3"].properties = {
          resistance: { value: 10, unit: "kOhm", tolerance: "1%" },
        }),
    ],
    [
      "tolerance both relative and absolute",
      false,
      (d) =>
        (d.parts["uno-r3"].properties = {
          resistance: {
            value: 10,
            unit: "kOhm",
            tolerance: { percent: 1, absolute: 1 },
          },
        }),
    ],
    [
      "source text in provenance",
      true,
      (d) =>
        (d.parts["uno-r3"].provenance = {
          locations: [{ document: "design", row: 3, text: "10k 1% 0603" }],
        }),
    ],
    [
      "range without bounds",
      false,
      (d) =>
        (d.parts["uno-r3"].properties = {
          operatingTemperature: { unit: "Cel" },
        }),
    ],
    [
      "approval without date",
      false,
      (d) => ((d.status = "released"), (d.approvals = [{ by: "J. Doe" }])),
    ],
    [
      "unknown lifecycle",
      false,
      (d) => (d.parts["atmega328p-pu"].manufacturerParts[0].lifecycle = "dead"),
    ],
  ];
  for (const [name, expected, mutate] of mutations) {
    const doc = structuredClone(base);
    mutate(doc);
    const t = validateStructure(doc).success;
    const a = ajvValidate(doc) === true;
    assert.equal(t, a, `${name}: typia ${t}, ajv ${a}`);
    assert.equal(
      t,
      expected,
      `${name}: expected ${expected ? "valid" : "invalid"}`,
    );
  }
});

test("all profile choice lists and counts agree in typia and JSON Schema", () => {
  const electrical: ElectricalProperties = {
    poles: 3,
    curve: "D",
    fuseSize: "10x38 mm",
    secondaryVoltage: { min: 24, max: 24, unit: "V" },
    normallyOpenContacts: 3,
    normallyClosedContacts: 0,
    changeoverContacts: 2,
    auxiliaryNormallyOpenContacts: 1,
    auxiliaryNormallyClosedContacts: 0,
    levels: 2,
    solidConductorCrossSection: { min: 0.2, max: 6, unit: "mm2" },
  };
  const wiring: WiringProperties = {
    cores: 4,
    crossSection: { value: 1.5, unit: "mm2" },
    protectiveEarth: true,
    conductorClass: 5,
    conductorMaterial: "Copper",
    insulationMaterial: "Polyvinyl chloride (PVC)",
    sheathMaterial: "Rubber",
    coreIdentification: "Numbers",
    shielded: false,
    conductorResistance: { value: 12.1, unit: "Ohm/km" },
  };
  const properties = { ...electrical, ...wiring };
  const verify = (patch: object, expected: boolean) => {
    const doc = JSON.parse(read("pcba.bom.json"));
    doc.parts["uno-r3"].properties = { ...properties, ...patch };
    assert.equal(
      validateStructure(doc).success,
      expected,
      JSON.stringify(patch),
    );
    assert.equal(ajvValidate(doc) === true, expected, JSON.stringify(patch));
  };
  verify({}, true);
  // All counts, including zero auxiliary contacts, need their own bounds.
  for (const key of [
    "poles",
    "cores",
    "levels",
    "pins",
    "normallyOpenContacts",
    "normallyClosedContacts",
    "changeoverContacts",
    "auxiliaryNormallyOpenContacts",
    "auxiliaryNormallyClosedContacts",
  ]) {
    for (const value of [-1, 1.5, "2", 4294967296])
      verify({ [key]: value }, false);
    verify({ [key]: 0 }, !["poles", "cores", "levels", "pins"].includes(key));
  }
  // Choice domains from the expanded ETIM and IEC lists and J-STD-020.
  const choices: [string, string[], string[]][] = [
    [
      "curve",
      [
        "A",
        "B",
        "C",
        "Cs",
        "D",
        "E",
        "F",
        "G",
        "K",
        "KM",
        "MA",
        "S",
        "Z",
        "Other",
      ],
      ["d", "CS", "J", "C/D", "manufacturer-specific"],
    ],
    [
      "fuseSize",
      [
        "8.5x23 mm",
        "8.5x31.5 mm",
        "8x40 mm",
        "10x38 mm",
        "10x85 mm",
        "11x79 mm",
        "14x51 mm",
        "17.5x63.5 mm",
        "22x58 mm",
        "27x60 mm",
        "Other",
      ],
      ["10x38", "10x38mm", "other"],
    ],
    [
      "conductorMaterial",
      ["Aluminium", "Copper", "Other"],
      ["copper", "Cu", "Steel"],
    ],
    [
      "insulationMaterial",
      [
        "None",
        "Ethylene tetrafluoroethylene (ETFE)",
        "Fluorinated ethylene propylene (FEP)",
        "Mica + crosslinked polyethylene (XLPE)",
        "Rubber",
        "Paper",
        "Polyamide (PA)",
        "Polyolefin",
        "Polytetrafluoroethylene (PTFE)",
        "Polyurethane (PUR)",
        "Polyvinyl chloride (PVC)",
        "Other",
      ],
      ["PVC", "Polyethylene (PE)", "XLPE", "rubber"],
    ],
    [
      "sheathMaterial",
      [
        "None",
        "Rubber",
        "Polyamide (PA)",
        "Polyethylene (PE)",
        "Polyolefin",
        "Polyurethane (PUR)",
        "Polyvinyl chloride (PVC)",
        "Other",
      ],
      ["Paper", "Polytetrafluoroethylene (PTFE)", "PVC"],
    ],
    [
      "msl",
      ["1", "2", "2a", "3", "4", "5", "5a", "6"],
      ["0", "2A", "5A", "7", "MSL3"],
    ],
    ["dielectric", ["CL1", "CL2"], ["X7R", "C0G", "NP0", "class1", "CL3"]],
    [
      "mounting",
      ["surfaceMounted", "inserted", "flangeMounted", "studMounted"],
      ["rail", "smd", "Other"],
    ],
  ];
  for (const [key, values, rejected] of choices) {
    for (const value of values) verify({ [key]: value }, true);
    for (const value of ["", ...rejected]) verify({ [key]: value }, false);
    verify({ [key]: 1 }, false);
  }
  verify({ curve: "Other", "x-curve": "manufacturer-specific" }, true);
  verify(
    { conductorMaterial: "Other", "x-conductorMaterial": "supplier alloy" },
    true,
  );
  verify(
    {
      "iec61360:AAE037": "X7R",
      package: "manufacturer package designation",
      color: "supplier colour",
    },
    true,
  );
  for (const key of ["protectiveEarth", "shielded"])
    verify({ [key]: "yes" }, false);
  verify({ conductorClass: 3 }, false);
  verify({ conductorClass: "5" }, false);
  for (const conductorClass of [1, 2, 5, 6]) verify({ conductorClass }, true);
  verify({ coreIdentification: "BK" }, false);
  for (const coreIdentification of [
    "None",
    "Coloured ribbon",
    "Colour",
    "Numbers",
    "Colour and numbers",
    "Other",
  ])
    verify({ coreIdentification }, true);
  for (const key of ["secondaryVoltage", "solidConductorCrossSection"]) {
    verify({ [key]: { unit: "V" } }, false);
    verify({ [key]: { value: 24, unit: "V" } }, false);
  }
  for (const key of ["crossSection", "conductorResistance"])
    verify({ [key]: "1.5" }, false);
  // Supplier details can still use the private escape hatch.
  verify({ "x-coreColours": "supplier designation" }, true);
});

test("property units agree in TypeScript-derived validators and convert within their dimensions", () => {
  const cases: [string[], string[], string[]][] = [
    [
      ["length", "width", "height", "diameter", "thickness", "pitch"],
      ["m", "um", "dam", "[in_i]", "[ft_i]", "[yd_i]"],
      ["V", "mm2", "mmm"],
    ],
    [["mass"], ["g", "kg", "mg", "t", "[lb_av]", "[oz_av]"], ["mm", "kkg"]],
    [
      ["ratedVoltage", "secondaryVoltage"],
      ["V", "mV", "kV"],
      ["A", "KV", "µV"],
    ],
    [["ratedCurrent"], ["A", "mA", "pA"], ["V", "MAA"]],
    [
      ["ratedPower"],
      ["W", "kW", "V.A", "kV.A", "V.mA", "MV.kA"],
      ["VA", "kVA", "W.A"],
    ],
    [["operatingTemperature"], ["Cel"], ["K", "°C", "mCel"]],
    [
      ["resistance"],
      ["Ohm", "kOhm", "MOhm", "yOhm"],
      ["F", "Ω", "kohm", "kkOhm"],
    ],
    [
      ["capacitance"],
      ["F", "pF", "nF", "uF", "fF", "aF", "YF"],
      ["V", "UF", "µF", "μF", "microF", "kkF", "QF"],
    ],
    [["inductance"], ["H", "mH", "zH"], ["F", "mh"]],
    [["frequency"], ["Hz", "kHz", "THz"], ["s", "KHz"]],
    [
      ["crossSection", "solidConductorCrossSection"],
      ["m2", "mm2", "cm2", "ym2"],
      ["mm", "mm^2", "mm²"],
    ],
    [
      ["conductorResistance"],
      ["Ohm/km", "mOhm/m", "GOhm/[ft_i]"],
      ["Ohm", "Ohm/s", "kkOhm/km"],
    ],
  ];
  const ranges = new Set([
    "secondaryVoltage",
    "solidConductorCrossSection",
    "operatingTemperature",
  ]);
  for (const [keys, accepted, rejected] of cases) {
    for (const key of keys)
      for (const unit of [...accepted, ...rejected]) {
        const value = ranges.has(key)
          ? { min: 1, max: 2, unit }
          : { value: 1, unit };
        const doc = {
          kind: "bom" as const,
          specVersion: "0.1",
          id: "urn:test:property-units",
          products: ["p"],
          parts: {
            p: {
              kind: "standard",
              name: "Part",
              properties: {
                ratedVoltage: { value: 24, unit: "V" },
                [key]: value,
              },
            },
          },
        };
        const expected = accepted.includes(unit);
        assert.equal(
          validateStructure(doc).success,
          expected,
          `${key}: ${unit} (typia)`,
        );
        assert.equal(
          ajvValidate(doc) === true,
          expected,
          `${key}: ${unit} (ajv)`,
        );
        if (expected)
          assert.deepEqual(
            checkAll(loadDocs({ "units.bom.json": doc })),
            [],
            `${key}: ${unit} (semantic)`,
          );
      }
  }
  // Unknown dimensions remain representable through dictionary and private properties.
  const generic = JSON.parse(read("pcba.bom.json"));
  generic.parts["uno-r3"].properties = {
    "x-stress": { value: 10, unit: "MPa" },
    "iec61360:AAE525": { value: 16, unit: "A" },
  };
  assert.equal(validateStructure(generic).success, true);
  assert.equal(ajvValidate(generic), true);
});

test("UCUM prefixes, powers and compound units use the same conversion vocabulary", () => {
  assert.equal(conversionFactor("fF", "F"), 1e-15);
  assert.equal(conversionFactor("aF", "F"), 1e-18);
  assert.equal(conversionFactor("yF", "F"), 1e-24);
  assert.equal(conversionFactor("YF", "F"), 1e24);
  assert.equal(conversionFactor("THz", "Hz"), 1e12);
  assert.equal(conversionFactor("dam", "m"), 10);
  assert.equal(conversionFactor("mm2", "m2"), 1e-6);
  assert.ok(
    Math.abs(conversionFactor("cm3", "m3")! - 1e-6) <=
      2 * Number.EPSILON * 1e-6,
  );
  assert.equal(conversionFactor("kV.A", "W"), 1000);
  assert.equal(conversionFactor("V.mA", "W"), 0.001);
  assert.equal(conversionFactor("kV.mA", "W"), 1);
  assert.equal(conversionFactor("Ohm/km", "Ohm/m"), 0.001);
  assert.equal(conversionFactor("mOhm/m", "Ohm/km"), 1);
  assert.equal(conversionFactor("kOhm/km", "Ohm/m"), 1);
  for (const unit of ["µF", "UF", "kkF", "QF", "microF"])
    assert.equal(conversionFactor(unit, "F"), undefined, unit);
  assert.equal(conversionFactor("Ohm/km", "Ohm"), undefined);
  assert.equal(conversionFactor("Ohm/s", "Ohm/km"), undefined);
  assert.equal(conversionFactor("V/m", "Ohm/km"), undefined);
});

test("buying BOM of the Uno matches the hand-written excerpt", () => {
  const { bom } = loadBomFile(join(root, "pcba.bom.json"));
  const result = buyingBom(bom!, {
    buildQuantity: 100,
    configuration: { options: { mcu: "DIP" } },
  });
  assert.equal(validateStructure(result).success, true);
  for (const expected of pcbaBuying.lines) {
    const line = result.lines.find((l) => l.part === expected.part);
    assert.ok(line, expected.part);
    const pick = (l: typeof line) => ({
      quantityPerUnit: l.quantityPerUnit,
      quantityPerLot: l.quantityPerLot,
      totalQuantity: l.totalQuantity,
      asRequired: l.asRequired ?? false,
      occurrences: l.occurrences,
    });
    assert.deepEqual(pick(line), pick(expected), expected.part);
  }
  // Not fitted, other variant, software: absent.
  for (const absent of ["jumper", "atmega328p-au", "pcb-smd", "bootloader"]) {
    assert.equal(
      result.lines.find((l) => l.part === absent),
      undefined,
      absent,
    );
  }
  // Without a value for the option… the default (DIP) applies.
  const byDefault = buyingBom(bom!, { buildQuantity: 100 });
  assert.equal(byDefault.unresolved, undefined);
  assert.ok(byDefault.lines.find((l) => l.part === "atmega328p-pu"));
});

test("buying BOM: imports, packs, per-lot, unresolved conditions", () => {
  const part = (name: string, extra: object = {}) => ({
    kind: "standard",
    name,
    properties: { "x-p": 1 },
    ...extra,
  });
  const child = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:child",
    products: ["board"],
    options: { fast: { name: "Fast clock" } },
    parts: {
      board: {
        kind: "custom",
        name: "Board",
        usages: [
          {
            id: "Y1",
            part: "xtal-fast",
            quantity: { value: 1 },
            applicability: { option: "fast" },
          },
          {
            id: "Y1-slow",
            part: "xtal-slow",
            quantity: { value: 1 },
            applicability: { not: { option: "fast" } },
          },
          {
            id: "fixture",
            part: "fixture",
            quantity: { basis: "perLot", value: 1 },
          },
        ],
      },
      "xtal-fast": part("Fast crystal"),
      "xtal-slow": part("Slow crystal"),
      fixture: {
        kind: "custom",
        name: "Test fixture",
        usages: [{ id: "pin", part: "pogo", quantity: { value: 12 } }],
      },
      pogo: part("Pogo pin", {
        supplierParts: [{ supplier: "s", sku: "P1", packSize: 10 }],
      }),
    },
    organizations: { s: { name: "Supplier" } },
  };
  const parent = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:parent",
    products: ["box"],
    options: { premium: { name: "Premium" } },
    imports: {
      c: {
        uri: "child.bom.json",
        id: "urn:test:child",
        options: { fast: { option: "premium" } },
      },
    },
    parts: {
      box: {
        kind: "custom",
        name: "Box",
        usages: [
          { id: "A1", part: "c#board", quantity: { value: 2 } },
          { id: "A2", part: "c#board", quantity: { value: 1 } },
          {
            id: "S1",
            part: "screw",
            quantity: { value: 4 },
            applicability: { serial: { from: "100" } },
          },
        ],
      },
      screw: part("Screw"),
    },
  };
  const bom = loadDocs({
    "parent.bom.json": parent,
    "child.bom.json": child,
  });
  assert.deepEqual(
    checkAll(bom).filter((f) => f.severity === "error"),
    [],
  );

  const r = buyingBom(bom, {
    buildQuantity: 10,
    configuration: { options: { premium: true } },
  });
  const line = (p: string) => r.lines.find((l) => l.part === p);
  assert.equal(line("c#xtal-fast")?.totalQuantity, 30);
  assert.equal(line("c#xtal-slow"), undefined);
  // The fixture is needed once per lot, whatever the number of boards or paths.
  assert.equal(line("c#pogo")?.quantityPerLot, 12);
  assert.equal(line("c#pogo")?.totalQuantity, 12);
  assert.deepEqual(line("c#pogo")?.packs, [
    { supplier: "s", sku: "P1", packSize: 10, count: 2 },
  ]);
  // No serial given: the screw usage cannot be evaluated, and is reported.
  assert.equal(line("screw"), undefined);
  assert.deepEqual(r.unresolved, [
    { path: ["S1"], reason: "no serial number given" },
  ]);

  const r2 = buyingBom(bom, {
    buildQuantity: 1,
    configuration: { options: { premium: false }, serial: "120" },
  });
  assert.equal(
    r2.lines.find((l) => l.part === "c#xtal-slow")?.totalQuantity,
    3,
  );
  assert.equal(r2.lines.find((l) => l.part === "screw")?.totalQuantity, 4);
  assert.equal(r2.unresolved, undefined);

  // Option of the imported document with no binding and no default: unknown.
  const unbound = structuredClone(parent);
  delete (unbound.imports.c as { options?: unknown }).options;
  const r3 = buyingBom(
    loadDocs({ "parent.bom.json": unbound, "child.bom.json": child }),
    { buildQuantity: 1, configuration: { serial: "1" } },
  );
  assert.deepEqual(
    r3.unresolved?.map((u) => u.path),
    [
      ["A1", "Y1"],
      ["A1", "Y1-slow"],
      ["A2", "Y1"],
      ["A2", "Y1-slow"],
    ],
  );
});

test("buying BOM: parts two imports down are named from the root, options forwarded", () => {
  const leaf = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:leaf",
    products: ["module"],
    options: { hv: { name: "High voltage" } },
    parts: {
      module: {
        kind: "custom",
        name: "Module",
        usages: [
          {
            id: "C1",
            part: "cap-hv",
            quantity: { value: 1 },
            applicability: { option: "hv" },
          },
          {
            id: "C1-lv",
            part: "cap-lv",
            quantity: { value: 1 },
            applicability: { not: { option: "hv" } },
          },
        ],
      },
      "cap-hv": {
        kind: "standard",
        name: "Cap 400 V",
        properties: { ratedVoltage: { value: 400, unit: "V" } },
      },
      "cap-lv": {
        kind: "standard",
        name: "Cap 50 V",
        properties: { ratedVoltage: { value: 50, unit: "V" } },
      },
    },
  };
  const mid = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:mid",
    products: ["board"],
    options: { mains: { name: "Mains powered" } },
    imports: {
      m: { uri: "leaf.bom.json", options: { hv: { option: "mains" } } },
    },
    parts: {
      board: {
        kind: "custom",
        name: "Board",
        usages: [{ id: "M1", part: "m#module", quantity: { value: 2 } }],
      },
    },
  };
  const top = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:top",
    products: ["unit"],
    options: { eu: { name: "EU market" } },
    imports: {
      b: { uri: "mid.bom.json", options: { mains: { option: "eu" } } },
    },
    parts: {
      unit: {
        kind: "custom",
        name: "Unit",
        usages: [{ id: "B1", part: "b#board", quantity: { value: 1 } }],
      },
    },
  };
  const bom = loadDocs({
    "top.bom.json": top,
    "mid.bom.json": mid,
    "leaf.bom.json": leaf,
  });
  assert.deepEqual(
    checkAll(bom).filter((f) => f.severity === "error"),
    [],
  );
  const eu = buyingBom(bom, {
    buildQuantity: 1,
    configuration: { options: { eu: true } },
  });
  assert.deepEqual(
    eu.lines.map((l) => [l.part, l.totalQuantity, l.occurrences[0]!.path]),
    [["b#m#cap-hv", 2, ["B1", "M1", "C1"]]],
  );
  const us = buyingBom(bom, {
    buildQuantity: 1,
    configuration: { options: { eu: false } },
  });
  assert.deepEqual(
    us.lines.map((l) => l.part),
    ["b#m#cap-lv"],
  );
  // A product of an imported document, named from the root.
  const board = buyingBom(bom, {
    product: "b#board",
    buildQuantity: 1,
    configuration: { options: { eu: true } },
  });
  assert.deepEqual(
    board.lines.map((l) => l.part),
    ["b#m#cap-hv"],
  );
  assert.equal(validateStructure(eu).success, true);
});

test("semantic checks find broken references and inconsistencies", () => {
  const doc = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:bad",
    products: ["top", "ghost"],
    options: { v: { name: "Variant", values: ["a", "b"], default: "c" } },
    parts: {
      top: {
        kind: "custom",
        name: "Top",
        usages: [
          {
            id: "U1",
            part: "ic",
            quantity: { value: 2 },
            designators: [{ scheme: "refdes", values: ["U1"] }],
          },
          { id: "U1", part: "missing", quantity: { value: 1 } },
          {
            id: "U2",
            part: "ic",
            quantity: { value: 1 },
            designators: [{ scheme: "refdes", values: ["U1"] }],
            applicability: { option: "v" },
          },
          { id: "U3", part: "sub", quantity: { value: 1 } },
        ],
        steps: [{ id: "s1", title: "Place", usages: ["U9"] }],
      },
      sub: {
        kind: "custom",
        name: "Sub",
        usages: [{ id: "back", part: "top", quantity: { value: 1 } }],
      },
      ic: {
        kind: "standard",
        name: "IC",
        manufacturerParts: [{ manufacturer: "nobody", mpn: "X" }],
      },
      wire: {
        kind: "material",
        name: "Wire",
        properties: { "x-gauge": "AWG22" },
      },
    },
    issues: [
      {
        id: "I1",
        severity: "warning",
        text: "?",
        subjects: [{ part: "top", usage: "nope" }],
      },
    ],
    // Document-level policy: applies to "ic", which has no preferred reference.
    requires: ["subcontract"],
    organizations: { c: { name: "Customer" }, f: { name: "Factory" } },
    extensions: {
      subcontract: {
        customer: "c",
        subcontractor: "f",
        substitution: "preferredOnly",
      },
    },
  };
  const codes = checkAll(loadDocs({ "bad.bom.json": doc }))
    .map((f) => f.code)
    .sort();
  for (const code of [
    "unresolved-part",
    "duplicate-usage",
    "option-default",
    "option-not-boolean",
    "unresolved-organization",
    "refdes-count",
    "duplicate-designator",
    "unresolved-usage",
    "step-coverage",
    "cycle",
    "material-unit",
    "no-preferred",
  ]) {
    assert.ok(codes.includes(code), `${code} in ${codes.join(", ")}`);
  }
});

test("semantic checks: board sides, obsolete sources, released documents", () => {
  const doc = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:release",
    products: ["board"],
    status: "released",
    organizations: { m: { name: "Maker" } },
    approvals: [
      {
        role: "release",
        by: "J. Doe",
        organization: "nobody",
        at: "2026-11-01T10:00:00Z",
      },
    ],
    parts: {
      board: {
        kind: "custom",
        name: "Board",
        usages: [
          {
            id: "C",
            part: "cap",
            quantity: { value: 3 },
            designators: [
              {
                scheme: "refdes",
                side: "top",
                values: ["C1", "C2"],
              },
              {
                scheme: "refdes",
                side: "bottom",
                values: ["C3"],
              },
            ],
          },
          {
            id: "U",
            part: "old",
            quantity: { value: 1 },
            designators: [{ scheme: "refdes", values: ["U1"] }],
          },
        ],
      },
      cap: {
        kind: "standard",
        name: "Cap",
        manufacturerParts: [
          {
            manufacturer: "m",
            mpn: "C",
            lifecycle: "obsolete",
            status: "notApproved",
          },
          { manufacturer: "m", mpn: "C2" },
        ],
      },
      old: {
        kind: "standard",
        name: "Old",
        manufacturerParts: [
          { manufacturer: "m", mpn: "O", lifecycle: "obsolete" },
        ],
      },
    },
    issues: [
      {
        id: "I1",
        severity: "error",
        text: "Which dielectric?",
        subjects: [{ part: "cap" }],
      },
    ],
  };
  const findings = checkAll(loadDocs({ "release.bom.json": doc }));
  const codes = findings.map((f) => f.code);
  assert.ok(!codes.includes("refdes-count"), "refdes of both sides add up");
  assert.deepEqual(
    findings.filter((f) => f.code === "obsolete-part").map((f) => f.path),
    ["/parts/old/manufacturerParts"],
  );
  for (const code of ["released-without-revision", "unresolved-organization"])
    assert.ok(codes.includes(code), `${code} in ${codes.join(", ")}`);
  assert.equal(
    findings.find((f) => f.code === "open-error-issue")?.severity,
    "warning",
  );
});

test("diff reproduces the goRail nut change set", () => {
  const result = diff(roverBeforeChange, rover);
  assert.equal(validateStructure(result).success, true);
  assert.deepEqual(result.changes, goRailNutChange.changes);
  assert.deepEqual(result.from, goRailNutChange.from);
  assert.deepEqual(result.to, goRailNutChange.to);
});

test("HTML diff shows every change operation and escapes before/after values", () => {
  const old: BomDocument = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:diff-html",
    name: "Old BOM",
    revision: "A",
    products: ["top"],
    parts: {
      top: {
        kind: "custom",
        name: "Top",
        usages: [
          { id: "remove", part: "old", quantity: { value: 1 } },
          { id: "change", part: "part", quantity: { value: 1 } },
          { id: "move", part: "part", quantity: { value: 1 } },
        ],
      },
      branch: { kind: "custom", name: "Branch" },
      old: { kind: "custom", name: "Removed part" },
      part: {
        kind: "custom",
        name: "Part",
        description: "Removed description",
        extensions: { "x-null": null },
      },
    },
  };
  const next = structuredClone(old);
  next.name = '<script>alert("BOM")</script>';
  next.revision = "B";
  delete next.parts.old;
  next.parts.new = { kind: "custom", name: "New part" };
  next.parts.part!.extensions = { "x-null": false };
  delete next.parts.part!.description;
  next.parts.top!.usages = [
    { id: "add", part: "new", quantity: { value: 3 } },
    { id: "change", part: "part", quantity: { value: 2 } },
  ];
  next.parts.branch!.usages = [
    { id: "move", part: "part", quantity: { value: 1 } },
  ];
  const before = loadDocs({ "before.bom.json": old });
  const after = loadDocs({ "after.bom.json": next });
  const changes = diff(old, next);
  assert.equal(new Set(changes.changes.map((c) => c.op)).size, 8);
  const html = renderDiffHtml(before, after, changes);
  for (const label of [
    "BOM modified",
    "Part added",
    "Part removed",
    "Part modified",
    "Usage added",
    "Usage removed",
    "Usage modified",
    "Usage moved",
  ]) {
    assert.ok(html.includes(label), label);
  }
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /&lt;script&gt;alert\(&quot;BOM&quot;\)&lt;\/script&gt;/);
  assert.match(html, /class="diff-value">null<\/span>/);
  assert.match(html, /class="diff-value">false<\/span>/);
  assert.match(html, /class="muted">Absent<\/span>/);
  assert.match(html, /\/quantity\/value/);
  assert.match(html, /prefers-color-scheme:dark/);
  assert.match(
    renderDiffHtml(before, before, diff(old, old)),
    /No content changes/,
  );
});

test("HTML diff resolves removed usages through renamed parent IDs and keeps identity matches visible", () => {
  const old: BomDocument = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:diff-matches",
    products: ["old"],
    parts: {
      old: {
        kind: "custom",
        name: "Assembly",
        usages: [{ id: "gone", part: "part", quantity: { value: 7 } }],
      },
      part: { kind: "custom", name: "Removed usage target" },
    },
  };
  const next = structuredClone(old);
  next.products = ["renamed"];
  next.parts.renamed = { kind: "custom", name: "Assembly" };
  delete next.parts.old;
  const identityMatches: IdentityMatch[] = [
    { from: "old", to: "renamed", method: "manual", confirmed: false },
  ];
  const html = renderDiffHtml(
    loadDocs({ "old.bom.json": old }),
    loadDocs({ "next.bom.json": next }),
    diff(old, next, { identityMatches }),
  );
  assert.match(html, /Removed usage target/);
  assert.match(html, /&quot;value&quot;: 7/);
  assert.match(html, /Identity matches/);
  assert.match(html, /<td>false<\/td>/);
});

test("bomkit diff exports HTML and preserves the default JSON output", () => {
  const bomkit = (...args: string[]) =>
    execFileSync(
      process.execPath,
      [
        ...process.execArgv,
        join(process.cwd(), "tools/cli.ts"),
        "diff",
        join(root, "rover/rover-before-change.bom.json"),
        join(root, "rover/rover.bom.json"),
        ...args,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  const output = join(root, "diff.html");
  assert.equal(bomkit("--html", output), "");
  const html = readFileSync(output, "utf8");
  assert.match(html, /41a1156 → 6b2c5a9/);
  assert.match(html, /\/quantity\/value/);
  assert.deepEqual(JSON.parse(bomkit()).changes, goRailNutChange.changes);
  assert.throws(() => bomkit("--html"), /--html takes one filename/);
});

test("diff: moves, set-like arrays and identity matches", () => {
  const a = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:d",
    revision: "A",
    products: ["top"],
    parts: {
      top: {
        kind: "custom",
        name: "Top",
        usages: [
          { id: "L", part: "left", quantity: { value: 1 } },
          { id: "R", part: "right", quantity: { value: 1 } },
        ],
      },
      left: {
        kind: "custom",
        name: "Left",
        usages: [
          {
            id: "S1",
            part: "res",
            quantity: { value: 2 },
            designators: [{ scheme: "refdes", values: ["R1", "R2"] }],
          },
        ],
      },
      right: { kind: "custom", name: "Right", usages: [] },
      res: {
        kind: "standard",
        name: "Resistor",
        properties: { resistance: { value: 10, unit: "kOhm" } },
      },
    },
  } as unknown as BomDocument;
  const b = structuredClone(a);
  b.revision = "B";
  // Same refdes in another order: no change.
  b.parts.left!.usages![0]!.designators![0]!.values = ["R2", "R1"];
  // Usage moved to another parent.
  b.parts.right!.usages = b.parts.left!.usages;
  b.parts.left!.usages = [];
  // Part renamed by the importer, matched by hand.
  b.parts["res-10k"] = b.parts.res!;
  delete b.parts.res;
  b.parts.right!.usages![0]!.part = "res-10k";

  const naive = diff(a, b).changes.map((c) => c.op);
  assert.ok(naive.includes("partAdded") && naive.includes("partRemoved"));
  const matched = diff(a, b, {
    identityMatches: [
      { from: "res", to: "res-10k", method: "manual", confirmed: true },
    ],
  });
  assert.deepEqual(matched.changes, [
    {
      op: "usageMoved",
      usage: "S1",
      fromParent: "left",
      toParent: "right",
    },
  ]);
});

test("units: quantities are converted to the part's unit, or reported", () => {
  assert.equal(conversionFactor("mm", "m"), 1e-3);
  assert.equal(conversionFactor("cm2", "m2"), 1e-4);
  assert.equal(conversionFactor("mL", "L"), 1e-3);
  assert.equal(conversionFactor("kg", "g"), 1e3);
  assert.equal(conversionFactor("[in_i]", "mm"), 25.4);
  assert.equal(conversionFactor("m", "kg"), undefined);
  assert.equal(conversionFactor("1", "m"), undefined);
  // A unit outside the supported subset only converts to itself.
  assert.equal(conversionFactor("[foz_us]", "[foz_us]"), 1);
  assert.equal(conversionFactor("[foz_us]", "L"), undefined);

  const doc = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:units",
    products: ["harness"],
    parts: {
      harness: {
        kind: "custom",
        name: "Harness",
        usages: [
          {
            id: "W1",
            part: "wire",
            quantity: { value: 250, unit: "mm" },
          },
          { id: "W2", part: "wire", quantity: { value: 1.5 } },
          {
            id: "W3",
            part: "wire",
            quantity: { value: 2, unit: "kg" },
          },
          {
            id: "S1",
            part: "sleeve",
            quantity: { value: 3, unit: "m" },
          },
        ],
      },
      wire: {
        kind: "material",
        name: "Wire",
        unit: "m",
        properties: { "x-gauge": "AWG22" },
      },
      sleeve: {
        kind: "standard",
        name: "Sleeve",
        properties: { diameter: { value: 3, unit: "mm" } },
      },
    },
  };
  const bom = loadDocs({ "units.bom.json": doc });
  assert.deepEqual(
    checkAll(bom)
      .filter((f) => f.code === "unit-mismatch")
      .map((f) => f.path),
    [
      "/parts/harness/usages/2/quantity/unit",
      "/parts/harness/usages/3/quantity/unit",
    ],
  );
  const r = buyingBom(bom, { buildQuantity: 10 });
  const wire = r.lines.find((l) => l.part === "wire")!;
  assert.equal(wire.unit, "m");
  assert.equal(wire.quantityPerUnit, 1.75);
  assert.equal(wire.totalQuantity, 17.5);
  assert.deepEqual(
    r.unresolved?.map((u) => u.path),
    [["W3"], ["S1"]],
  );
  assert.throws(() => buyingBom(bom, { buildQuantity: 0 }));
  for (const buildQuantity of [1.5, -1, NaN, Infinity, 4294967296]) {
    assert.throws(() => buyingBom(bom, { buildQuantity }), /build quantity/);
  }
});

test("applicability: a value the option does not have is unknown, not false", () => {
  const doc = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:options",
    products: ["board"],
    options: {
      mcu: { name: "MCU package", values: ["DIP", "SMD"] },
      debug: { name: "Debug header" },
    },
    parts: {
      board: {
        kind: "custom",
        name: "Board",
        usages: [
          {
            id: "U1",
            part: "dip",
            quantity: { value: 1 },
            applicability: { option: "mcu", equals: "DIP" },
          },
          {
            id: "U1-smd",
            part: "smd",
            quantity: { value: 1 },
            applicability: { option: "mcu", equals: "SMD" },
          },
          {
            id: "J1",
            part: "header",
            quantity: { value: 1 },
            applicability: { option: "debug" },
          },
          {
            id: "S1",
            part: "label",
            quantity: { value: 1 },
            applicability: { serial: { from: "10" } },
          },
        ],
      },
      dip: { kind: "standard", name: "DIP", properties: { "x-p": 1 } },
      smd: { kind: "standard", name: "SMD", properties: { "x-p": 1 } },
      header: {
        kind: "standard",
        name: "Header",
        properties: { "x-p": 1 },
      },
      label: {
        kind: "standard",
        name: "Label",
        properties: { "x-p": 1 },
      },
    },
  };
  const bom = loadDocs({ "options.bom.json": doc });
  const paths = (options: Record<string, string | boolean>) =>
    buyingBom(bom, {
      buildQuantity: 1,
      configuration: { options, serial: "12" },
    }).unresolved?.map((u) => u.path.join("/"));
  // Wrong case, wrong type: neither variant may be dropped silently.
  assert.deepEqual(paths({ mcu: "dip", debug: true }), ["U1", "U1-smd"]);
  assert.deepEqual(paths({ mcu: true, debug: "yes" }), ["U1", "U1-smd", "J1"]);
  const ok = buyingBom(bom, {
    buildQuantity: 1,
    configuration: { options: { mcu: "SMD", debug: false }, serial: "12" },
  });
  assert.deepEqual(
    ok.lines.map((l) => [l.part, l.totalQuantity]),
    [
      ["label", 1],
      ["smd", 1],
    ],
  );
  assert.equal(ok.unresolved, undefined);
});

test("semantic checks: empty ranges", () => {
  const usage = (id: string, applicability: object) => ({
    id,
    part: "p",
    quantity: { value: 1 },
    applicability,
  });
  const doc = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:ranges",
    products: ["top"],
    parts: {
      top: {
        kind: "custom",
        name: "Top",
        usages: [
          usage("b", { not: { serial: { from: "20", to: "10" } } }),
          usage("c", {
            any: [{ date: { from: "2026-07-01", to: "2026-07-01" } }],
          }),
          usage("e", { serial: { list: ["A100"] } }),
        ],
      },
      p: { kind: "standard", name: "P", properties: { "x-p": 1 } },
    },
  };
  const found = checkAll(loadDocs({ "ranges.bom.json": doc })).map(
    (f) => `${f.code} ${f.path}`,
  );
  assert.deepEqual(found, [
    "empty-range /parts/top/usages/0/applicability",
    "empty-range /parts/top/usages/1/applicability",
  ]);
});

test("imports: two revisions of one document are kept apart, and reported", () => {
  const board = (revision: string, cap: string) => ({
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:board",
    revision,
    products: ["board"],
    parts: {
      board: {
        kind: "custom",
        name: "Board",
        usages: [{ id: "C1", part: "cap", quantity: { value: 1 } }],
      },
      cap: {
        kind: "standard",
        name: cap,
        properties: {
          capacitance: { value: 1, unit: "uF" },
          ratedVoltage: { value: 16, unit: "V" },
        },
      },
    },
  });
  const top = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:rack",
    products: ["rack"],
    imports: {
      a: { uri: "board-a.bom.json", revision: "A" },
      b: { uri: "board-b.bom.json", revision: "B" },
      a2: { uri: "board-a.bom.json" },
    },
    parts: {
      rack: {
        kind: "custom",
        name: "Rack",
        usages: [
          { id: "old", part: "a#board", quantity: { value: 2 } },
          { id: "new", part: "b#board", quantity: { value: 3 } },
          { id: "spare", part: "a2#board", quantity: { value: 1 } },
        ],
      },
    },
  };
  const bom = loadDocs({
    "rack.bom.json": top,
    "board-a.bom.json": board("A", "Cap rev A"),
    "board-b.bom.json": board("B", "Cap rev B"),
  });
  assert.deepEqual(
    checkAll(bom).map((f) => f.code),
    ["import-conflict"],
  );
  const r = buyingBom(bom, { buildQuantity: 1 });
  // The same file under two aliases is one part; another revision is another part.
  assert.deepEqual(
    r.lines.map((l) => [l.part, l.name, l.totalQuantity]),
    [
      ["a#cap", "Cap rev A", 3],
      ["b#cap", "Cap rev B", 3],
    ],
  );
});

test("diff: provenance is ignored, document fields and renamed usages are not", () => {
  const a = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:reimport",
    revision: "week 1",
    products: ["board"],
    imports: { psu: { uri: "psu.bom.json", revision: "1" } },
    options: { mcu: { name: "MCU", values: ["DIP", "SMD"] } },
    documents: {
      xlsx: { name: "bom.xlsx", type: "other", uri: "bom-v1.xlsx" },
    },
    generator: { tool: "importer", sources: ["xlsx"] },
    issuedAt: "2026-11-01T00:00:00Z",
    parts: {
      board: {
        kind: "custom",
        name: "Board",
        usages: [
          {
            id: "r-10k",
            part: "r-10k",
            quantity: { value: 2 },
            designators: [
              {
                scheme: "refdes",
                side: "top",
                values: ["R1", "R2"],
              },
              {
                scheme: "refdes",
                side: "bottom",
                values: ["R9"],
              },
            ],
            alternates: [
              {
                part: "r-12k",
                provenance: {
                  locations: [{ document: "xlsx", row: 4 }],
                },
              },
            ],
            provenance: {
              locations: [{ document: "xlsx", row: 3 }],
            },
          },
          {
            id: "line-7",
            part: "r-12k",
            quantity: { value: 1 },
            designators: [{ scheme: "refdes", values: ["R3"] }],
            provenance: {
              locations: [{ document: "xlsx", row: 7 }],
            },
          },
          { id: "J1", part: "conn", quantity: { value: 1 } },
        ],
        steps: [
          {
            id: "smt",
            title: "SMT",
            usages: ["r-10k", "line-7", "J1"],
          },
        ],
      },
      sub: { kind: "custom", name: "Sub", usages: [] },
      "r-10k": {
        kind: "standard",
        name: "10k",
        properties: {
          resistance: { value: 10, unit: "kOhm" },
          "x-provenance": "sheet A",
        },
        provenance: { locations: [{ document: "xlsx", row: 3 }] },
      },
      "r-12k": {
        kind: "standard",
        name: "12k",
        properties: { resistance: { value: 12, unit: "kOhm" } },
      },
      conn: {
        kind: "standard",
        name: "Connector",
        properties: { pins: 4 },
      },
    },
  } as unknown as BomDocument;

  // Re-import of a re-exported spreadsheet: every row moved, nothing else did.
  const b = structuredClone(a);
  b.revision = "week 2";
  b.issuedAt = "2026-11-08T00:00:00Z";
  const shift = (p?: { locations: { row?: number }[] }) =>
    p?.locations.forEach((l) => (l.row = (l.row ?? 0) + 10));
  for (const p of Object.values(b.parts)) {
    shift(p.provenance);
    p.usages?.forEach(
      (u) => (
        shift(u.provenance),
        u.alternates?.forEach((x) => shift(x.provenance))
      ),
    );
  }
  b.parts.board!.usages![0]!.designators!.reverse();
  assert.deepEqual(diff(a, b).changes, []);
  assert.equal(diff(a, b).id, "urn:test:reimport:change:week%201..week%202");
  assert.equal(validateStructure(diff(a, b)).success, true);

  // What is free-form data stays compared as it is.
  const c = structuredClone(b);
  (c.parts["r-10k"]!.properties as Record<string, unknown>)["x-provenance"] =
    "sheet B";
  assert.deepEqual(diff(b, c).changes, [
    {
      op: "partModified",
      part: "r-10k",
      fields: [
        {
          path: "/properties/x-provenance",
          before: "sheet A",
          after: "sheet B",
        },
      ],
    },
  ]);

  // Document level: a new revision of an import, a new option value.
  const d = structuredClone(b);
  d.imports!.psu!.revision = "2";
  d.options!.mcu!.values = ["DIP", "SMD", "QFN"];
  assert.deepEqual(diff(b, d).changes, [
    {
      op: "documentModified",
      fields: [
        { path: "/imports/psu/revision", before: "1", after: "2" },
        {
          path: "/options/mcu/values",
          before: ["DIP", "SMD"],
          after: ["DIP", "SMD", "QFN"],
        },
      ],
    },
  ]);

  // Usage ids that did not survive the re-import, matched by hand:
  // one renamed in place, one renamed and moved to another parent.
  const e = structuredClone(b);
  const board = e.parts.board!;
  board.usages![1]!.id = "line-9";
  board.steps![0]!.usages = ["r-10k", "line-9"];
  const [conn] = board.usages!.splice(2, 1);
  e.parts.sub!.usages = [{ ...conn!, id: "X1", quantity: { value: 2 } }];
  assert.deepEqual(
    diff(b, e).changes.map((x) => x.op),
    [
      "partModified",
      "usageAdded",
      "usageAdded",
      "usageRemoved",
      "usageRemoved",
    ],
  );
  const identityMatches: IdentityMatch[] = [
    {
      from: { parent: "board", usage: "line-7" },
      to: { parent: "board", usage: "line-9" },
      method: "heuristic",
      confidence: 0.9,
    },
    {
      from: { parent: "board", usage: "J1" },
      to: { parent: "sub", usage: "X1" },
      method: "manual",
      confirmed: true,
    },
  ];
  const matched = diff(b, e, { identityMatches });
  assert.equal(validateStructure(matched).success, true);
  assert.equal(ajvValidate(matched), true);
  // Matched ids are written as in the new revision, in "before" values too.
  assert.deepEqual(matched.changes, [
    {
      op: "partModified",
      part: "board",
      fields: [
        {
          path: "/steps",
          before: [
            {
              id: "smt",
              title: "SMT",
              usages: ["r-10k", "line-9", "J1"],
            },
          ],
          after: board.steps,
        },
      ],
    },
    {
      op: "usageMoved",
      usage: "J1",
      fromParent: "board",
      toParent: "sub",
      newUsage: "X1",
    },
    {
      op: "usageModified",
      parent: "sub",
      usage: "X1",
      fields: [{ path: "/quantity/value", before: 1, after: 2 }],
    },
  ]);
  // A match that names nothing would silently do nothing.
  assert.throws(
    () =>
      diff(b, e, {
        identityMatches: [{ from: "nope", to: "conn", method: "manual" }],
      }),
    /does not exist/,
  );
  assert.throws(
    () =>
      diff(b, e, {
        identityMatches: [
          ...identityMatches,
          {
            from: { parent: "board", usage: "r-10k" },
            to: { parent: "board", usage: "line-9" },
            method: "manual",
          },
        ],
      }),
    /matched twice/,
  );
});

test("scrap: the loss allowance of a part is added to what is bought", () => {
  const doc = {
    kind: "bom",
    specVersion: "0.1",
    id: "urn:test:scrap",
    products: ["board"],
    parts: {
      board: {
        kind: "custom",
        name: "Board",
        scrap: { rate: 0.1 },
        usages: [
          { id: "R", part: "res", quantity: { value: 3 } },
          {
            id: "W",
            part: "wire",
            quantity: { value: 120, unit: "mm" },
          },
          {
            id: "G",
            part: "glue",
            quantity: { basis: "asRequired" },
          },
          { id: "U", part: "ic", quantity: { value: 1 } },
        ],
      },
      res: {
        kind: "standard",
        name: "Resistor",
        properties: {
          resistance: {
            value: 10,
            unit: "kOhm",
            tolerance: { percent: 1 },
          },
          package: "0402",
        },
        scrap: { rate: 0.02, perLot: 10 },
      },
      wire: {
        kind: "material",
        name: "Wire",
        unit: "m",
        properties: { "x-gauge": "AWG22" },
        scrap: { rate: 0.05 },
      },
      glue: {
        kind: "material",
        name: "Glue",
        unit: "g",
        properties: { "x-type": "cyanoacrylate" },
        scrap: { perLot: 5 },
      },
      ic: {
        kind: "standard",
        name: "IC",
        properties: {
          package: "SOT-23",
          ratedVoltage: { value: 5, unit: "V" },
          "etim:EF000008": 1,
          mass: { value: 1, unit: "g" },
        },
      },
    },
  };
  const bom = loadDocs({ "scrap.bom.json": doc });
  assert.deepEqual(
    checkAll(bom).map((f) => `${f.code} ${f.path}`),
    ["scrap-ignored /parts/board/scrap"],
  );
  const r = buyingBom(bom, { buildQuantity: 100 });
  assert.equal(validateStructure(r).success, true);
  assert.equal(ajvValidate(r), true);
  const line = (p: string) => r.lines.find((l) => l.part === p)!;
  // 300 needed, 2 % = 6, plus 10 per lot.
  assert.deepEqual(
    [line("res").scrapQuantity, line("res").totalQuantity],
    [16, 316],
  );
  // 12 m needed, 5 % = 0.6 m: lengths are not rounded.
  assert.deepEqual(
    [line("wire").scrapQuantity, line("wire").totalQuantity],
    [0.6, 12.6],
  );
  // As required: nothing is counted, so nothing is lost.
  assert.deepEqual(
    [line("glue").scrapQuantity, line("glue").totalQuantity],
    [undefined, 0],
  );
  assert.deepEqual(
    [line("ic").scrapQuantity, line("ic").totalQuantity],
    [undefined, 100],
  );
  // Pieces are rounded up: 3 needed, 2 % = 0.06, plus 10.
  assert.deepEqual(
    buyingBom(bom, { buildQuantity: 1 }).lines.find((l) => l.part === "res")!
      .totalQuantity,
    14,
  );
});

test("structural validation narrows every document kind and rejects non-documents", () => {
  for (const input of [
    null,
    undefined,
    true,
    1,
    "bom",
    [],
    {},
    { kind: "other" },
    { kind: "bom" },
  ]) {
    assert.equal(
      validateStructure(input).success,
      false,
      JSON.stringify(input),
    );
  }
  for (const doc of [rover, goRailNutChange, pcbaBuying]) {
    const result = validateStructure(doc);
    assert.ok(result.success);
    assert.equal(result.data, doc);
  }
});

test("canonical serialization sorts only BOM maps and leaves the input unchanged", () => {
  const doc: BomDocument = {
    ...rover,
    parts: { z: rover.parts.rover!, a: rover.parts.rover! },
    options: { z: { name: "Z" }, a: { name: "A" } },
    extensions: { "x-map": { z: 1, a: 2 } },
  };
  const sorted = canonicalize(doc);
  assert.deepEqual(Object.keys(sorted.parts), ["a", "z"]);
  assert.deepEqual(Object.keys(sorted.options!), ["a", "z"]);
  assert.deepEqual(Object.keys(doc.parts), ["z", "a"]);
  assert.deepEqual(Object.keys(sorted.extensions!["x-map"] as object), [
    "z",
    "a",
  ]);
  assert.deepEqual(sorted.parts.a!.usages, doc.parts.a!.usages);
  assert.deepEqual(canonicalize(goRailNutChange), goRailNutChange);
  assert.deepEqual(canonicalize(pcbaBuying), pcbaBuying);
});

test("serial evaluation keeps exact numeric bounds and non-numeric lists", () => {
  const bom = loadDocs({ "serial.bom.json": rover });
  const evalRange = (serial: string | undefined, range: SerialRange) =>
    evaluate({ serial: range }, bom, rootContext({ serial }));
  assert.equal(evalRange("0010", { from: "10", to: "10" }), true);
  assert.equal(evalRange("9", { from: "10" }), false);
  assert.equal(evalRange("11", { to: "10" }), false);
  assert.equal(
    evalRange("9007199254740993", { from: "9007199254740994" }),
    false,
  );
  assert.equal(evalRange("A100", { list: ["A100"] }), true);
  assert.equal(evalRange("A101", { list: ["A100"] }), false);
  for (const serial of [undefined, "", "A100", "-1", "1.5"]) {
    assert.equal(typeof evalRange(serial, { from: "10" }), "object");
  }
});
