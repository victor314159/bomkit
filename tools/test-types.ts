// Compile-time contracts, checked by `npm run check` (including expected failures).
import type {
  BomkitDocument,
  CapacitanceUnit,
  Measure,
  Option,
  Properties,
  Range,
  VoltageUnit,
} from "../src/index.js";
import { canonicalize, serialize } from "./lib/canonical.js";

({ value: 22, unit: "pF" }) satisfies Measure<CapacitanceUnit>;
({ min: 12, max: 24, unit: "V" }) satisfies Range<VoltageUnit>;
({
  capacitance: { value: 22, unit: "uF" },
  crossSection: { value: 1.5, unit: "mm2" },
}) satisfies Properties;

// @ts-expect-error A voltage unit cannot describe capacitance.
({ capacitance: { value: 22, unit: "V" } }) satisfies Properties;
// @ts-expect-error UCUM micro uses the case-sensitive ASCII prefix u.
({ capacitance: { value: 22, unit: "µF" } }) satisfies Properties;
// @ts-expect-error Prefixes cannot be stacked.
({ capacitance: { value: 22, unit: "kkF" } }) satisfies Properties;
// @ts-expect-error A length cannot describe an area.
({ crossSection: { value: 1.5, unit: "mm" } }) satisfies Properties;
// @ts-expect-error Typed ranges also constrain their unit.
({ secondaryVoltage: { min: 12, max: 24, unit: "A" } }) satisfies Properties;

// Unparameterized measures and dictionary/private properties remain extensible.
({ value: 10, unit: "MPa" }) satisfies Measure;
({
  "x-stress": { value: 10, unit: "MPa" },
  "iec61360:AAE525": { value: 16, unit: "A" },
}) satisfies Properties;

({ name: "Debug", default: false }) satisfies Option;
({ name: "Variant", values: ["a", "b"], default: "a" }) satisfies Option;
// @ts-expect-error Boolean options require boolean defaults.
({ name: "Debug", default: "yes" }) satisfies Option;
// @ts-expect-error Enumerated options require string defaults.
({ name: "Variant", values: ["a"], default: true }) satisfies Option;

// The document union narrows directly on the serialized discriminator.
function documentContract(doc: BomkitDocument) {
  if (doc.kind === "bom") canonicalize(doc).parts;
  if (doc.kind === "changeSet") canonicalize(doc).changes;
  if (doc.kind === "buyingBom") canonicalize(doc).lines;
  // @ts-expect-error Serialized documents must have a recognized kind and shape.
  serialize({ kind: "other" });
}
