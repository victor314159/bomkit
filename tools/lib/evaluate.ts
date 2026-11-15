// Evaluation of applicability conditions, with three-valued logic: a
// condition that cannot be evaluated (option without value, no serial
// given…) is "unknown", and MUST NOT be counted or dropped silently.

import typia from "typia";
import {
  Applicability,
  Configuration,
  SerialBound,
  SerialRange,
} from "../../src/index.js";
import { LoadedBom } from "./load.js";

/** `true`, `false`, or the reason why the condition cannot be evaluated. */
export type ApplicabilityResult = true | false | { unknown: string };

/** Configuration as seen from one document: its own option values. */
export interface EvalContext extends Omit<Configuration, "options"> {
  options: Partial<NonNullable<Configuration["options"]>>;
}

function evalSerial(range: SerialRange, ctx: EvalContext): ApplicabilityResult {
  if (ctx.serial === undefined) return { unknown: "no serial number given" };
  if (range.list) return range.list.includes(ctx.serial);
  if (!typia.is<SerialBound>(ctx.serial)) {
    return {
      unknown: `serial "${ctx.serial}" cannot be compared with "${range.from ?? range.to}"`,
    };
  }
  const serial = BigInt(ctx.serial);
  return (
    (range.from === undefined || serial >= BigInt(range.from)) &&
    (range.to === undefined || serial <= BigInt(range.to))
  );
}

export function evaluate(
  cond: Applicability,
  bom: LoadedBom,
  ctx: EvalContext,
): ApplicabilityResult {
  const doc = bom.doc;
  if ("option" in cond) {
    const option = doc.options?.[cond.option];
    if (!option) return { unknown: `option "${cond.option}" is not declared` };
    const value = ctx.options[cond.option] ?? option.default;
    if (value === undefined)
      return { unknown: `option "${cond.option}" has no value` };
    // A value the option does not have would compare unequal to everything
    // and silently drop every variant: it is unknown, not false.
    if (
      option.values
        ? typeof value !== "string" || !option.values.includes(value)
        : typeof value !== "boolean"
    ) {
      return {
        unknown: `${JSON.stringify(value)} is not a value of option "${cond.option}"`,
      };
    }
    if (cond.equals === undefined) {
      if (typeof value !== "boolean")
        return {
          unknown: `option "${cond.option}" is not boolean: the condition needs "equals"`,
        };
      return value;
    }
    if (typeof value === "boolean")
      return {
        unknown: `option "${cond.option}" is boolean: "equals" does not apply`,
      };
    return value === cond.equals;
  }
  if ("serial" in cond) return evalSerial(cond.serial, ctx);
  if ("date" in cond) {
    if (ctx.date === undefined) return { unknown: "no build date given" };
    if (cond.date.from !== undefined && ctx.date < cond.date.from) return false;
    if (cond.date.to !== undefined && ctx.date >= cond.date.to) return false;
    return true;
  }
  if ("lot" in cond) {
    if (ctx.lot === undefined) return { unknown: "no production lot given" };
    return cond.lot.includes(ctx.lot);
  }
  if ("all" in cond) {
    let unknown: Extract<ApplicabilityResult, object> | undefined;
    for (const c of cond.all) {
      const r = evaluate(c, bom, ctx);
      if (r === false) return false;
      if (r !== true) unknown ??= r;
    }
    return unknown ?? true;
  }
  if ("any" in cond) {
    let unknown: Extract<ApplicabilityResult, object> | undefined;
    for (const c of cond.any) {
      const r = evaluate(c, bom, ctx);
      if (r === true) return true;
      if (r !== false) unknown ??= r;
    }
    return unknown ?? false;
  }
  const r = evaluate(cond.not, bom, ctx);
  return typeof r === "boolean" ? !r : r;
}

/** Context of the root document, from a configuration. */
export function rootContext(config: Configuration | undefined): EvalContext {
  return {
    options: { ...(config?.options ?? {}) },
    serial: config?.serial,
    lot: config?.lot,
    date: config?.date,
  };
}

/** Context of an imported document, from the option bindings of its import. */
export function importContext(
  parent: LoadedBom,
  parentCtx: EvalContext,
  alias: string,
): EvalContext {
  const bindings = parent.doc.imports?.[alias]?.options ?? {};
  const options: EvalContext["options"] = {};
  for (const [id, binding] of Object.entries(bindings)) {
    if (typeof binding === "object") {
      options[id] =
        parentCtx.options[binding.option] ??
        parent.doc.options?.[binding.option]?.default;
    } else {
      options[id] = binding;
    }
  }
  return { ...parentCtx, options };
}
