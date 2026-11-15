// Conversion between units of measure, for the subset of UCUM that BOMs
// use: lengths, areas, volumes, masses and durations for quantities,
// electrical units and temperature for properties, with metric prefixes,
// plus a few customary units. A usage may state its quantity in
// another unit than the part's (`mm` of a wire bought in `m`): quantities are
// converted to the part's unit before they are added up.
//
// A unit outside this subset is not an error: it only converts to itself.

import { UCUM_PREFIXES } from "../../src/units.js";

type Dimension =
  | "length"
  | "area"
  | "volume"
  | "mass"
  | "time"
  | "resistance"
  | "resistancePerLength"
  | "capacitance"
  | "inductance"
  | "frequency"
  | "voltage"
  | "current"
  | "power"
  | "temperature";

/** Metric atoms, in their base unit (m, m3, g, s). */
const METRIC: Record<string, [Dimension, number]> = {
  m: ["length", 1],
  g: ["mass", 1],
  t: ["mass", 1e6],
  s: ["time", 1],
  L: ["volume", 1e-3],
  l: ["volume", 1e-3],
  Ohm: ["resistance", 1],
  F: ["capacitance", 1],
  H: ["inductance", 1],
  Hz: ["frequency", 1],
  V: ["voltage", 1],
  A: ["current", 1],
  W: ["power", 1],
};

/** Units that take no prefix. */
const FIXED: Record<string, [Dimension, number]> = {
  "[in_i]": ["length", 0.0254],
  "[ft_i]": ["length", 0.3048],
  "[yd_i]": ["length", 0.9144],
  "[lb_av]": ["mass", 453.59237],
  "[oz_av]": ["mass", 28.349523125],
  min: ["time", 60],
  h: ["time", 3600],
  d: ["time", 86400],
  Cel: ["temperature", 1],
};

function parse(unit: string): [Dimension, number] | undefined {
  const fixed = FIXED[unit];
  if (fixed) return fixed;
  // Conductor resistance per length, e.g. Ohm/km or mOhm/m.
  const quotient = /^([^/]+)\/([^/]+)$/.exec(unit);
  if (quotient) {
    const numerator = parse(quotient[1]!);
    const denominator = parse(quotient[2]!);
    if (numerator?.[0] === "resistance" && denominator?.[0] === "length")
      return ["resistancePerLength", numerator[1] / denominator[1]];
    return undefined;
  }
  // Apparent power: prefixes on the voltage and/or current atom, e.g. kV.A or V.mA.
  const product = /^([^/.]+)\.([^/.]+)$/.exec(unit);
  if (product) {
    const voltage = parse(product[1]!);
    const current = parse(product[2]!);
    if (voltage?.[0] === "voltage" && current?.[0] === "current")
      return ["power", voltage[1] * current[1]];
    return undefined;
  }
  const m = /^([A-Za-z]+?)([23])?$/.exec(unit);
  if (!m) return undefined;
  const symbol = m[1]!;
  const power = m[2];
  let scale: number | undefined;
  let atom: [Dimension, number] | undefined = METRIC[symbol];
  if (atom) scale = 1;
  else {
    for (const [prefix, factor] of Object.entries(UCUM_PREFIXES)) {
      if (symbol.startsWith(prefix) && METRIC[symbol.slice(prefix.length)]) {
        atom = METRIC[symbol.slice(prefix.length)];
        scale = factor;
        break;
      }
    }
  }
  if (!atom || scale === undefined) return undefined;
  if (!power) return [atom[0], scale * atom[1]];
  // Only lengths have powers: m2, cm3…
  if (atom[0] !== "length") return undefined;
  return [
    power === "2" ? "area" : "volume",
    (scale * atom[1]) ** Number(power),
  ];
}

/**
 * Factor by which a value in `from` is multiplied to express it in `to`, or
 * `undefined` when the units are not commensurable or not known.
 */
export function conversionFactor(from: string, to: string): number | undefined {
  if (from === to) return 1;
  const a = parse(from);
  const b = parse(to);
  if (!a || !b || a[0] !== b[0]) return undefined;
  return a[1] / b[1];
}

/** Whether `unit` is in the subset of UCUM this module knows, or the unity `1`. */
export function isKnownUnit(unit: string): boolean {
  return unit === "1" || parse(unit) !== undefined;
}
