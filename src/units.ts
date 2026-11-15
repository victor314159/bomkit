// The case-sensitive UCUM 2.2 vocabulary supported for typed properties.
// Prefix symbols and factors: https://ucum.org/ucum, Table 1 (read November 2026).
// A prefix applies once to an atom, before any exponent (mm2 = (mm)^2).

export const UCUM_PREFIXES = {
  Y: 1e24,
  Z: 1e21,
  E: 1e18,
  P: 1e15,
  T: 1e12,
  G: 1e9,
  M: 1e6,
  k: 1e3,
  h: 1e2,
  da: 1e1,
  d: 1e-1,
  c: 1e-2,
  m: 1e-3,
  u: 1e-6,
  n: 1e-9,
  p: 1e-12,
  f: 1e-15,
  a: 1e-18,
  z: 1e-21,
  y: 1e-24,
} as const;

export type MetricPrefix = keyof typeof UCUM_PREFIXES;
export type MetricUnit<Atom extends string> = Atom | `${MetricPrefix}${Atom}`;

export type LengthUnit = MetricUnit<"m"> | "[in_i]" | "[ft_i]" | "[yd_i]";
export type AreaUnit = `${MetricUnit<"m">}2`;
export type MassUnit = MetricUnit<"g" | "t"> | "[lb_av]" | "[oz_av]";
export type ResistanceUnit = MetricUnit<"Ohm">;
export type CapacitanceUnit = MetricUnit<"F">;
export type InductanceUnit = MetricUnit<"H">;
export type FrequencyUnit = MetricUnit<"Hz">;
export type VoltageUnit = MetricUnit<"V">;
export type CurrentUnit = MetricUnit<"A">;
export type PowerUnit = MetricUnit<"W"> | `${VoltageUnit}.${CurrentUnit}`;
/** Ambient operating temperature uses absolute degrees Celsius, as the core specifies. */
export type TemperatureUnit = "Cel";
export type ResistancePerLengthUnit = `${ResistanceUnit}/${LengthUnit}`;
