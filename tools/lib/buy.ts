// Buying BOM: the reference algorithm of the README ("Derived views").

import typia from "typia";
import {
  BuyingBom,
  BuyingLine,
  Configuration,
  Occurrence,
  Part,
  Quantity,
} from "../../src/index.js";
import {
  EvalContext,
  evaluate,
  importContext,
  rootContext,
} from "./evaluate.js";
import { LoadedBom, resolvePart, sha256File } from "./load.js";
import { conversionFactor } from "./units.js";

export interface BuyOptions {
  product?: BuyingBom["product"];
  buildQuantity: BuyingBom["buildQuantity"];
  configuration?: Configuration;
}

/** A standard part that cannot be bought: nothing identifies what to buy. */
export function isIncomplete(part: Part): boolean {
  return (
    part.kind === "standard" &&
    !part.manufacturerParts?.some((m) => m.status !== "notApproved") &&
    !part.supplierParts?.some((s) => s.status !== "notApproved") &&
    !part.identifiers?.some((i) => i.type === "standard") &&
    Object.keys(part.properties ?? {}).length === 0
  );
}

const round = (x: number) => Math.round(x * 1e9) / 1e9;

/** Follows the aliases of a reference (`"a#b#id"`), binding each imported document's options on the way. */
function descend(frame: Frame, ref: string): Frame {
  const aliases = ref.split("#").slice(0, -1);
  let { bom, ctx } = frame;
  for (const alias of aliases) {
    ctx = importContext(bom, ctx, alias);
    bom = bom.imports.get(alias)!;
  }
  return { ...frame, bom, ctx, aliases: [...frame.aliases, ...aliases] };
}

interface Frame {
  bom: LoadedBom;
  ctx: EvalContext;
  /** Aliases leading from the root document to `bom`; empty for the root. */
  aliases: string[];
  path: string[];
  /** Multiplier of the path; `lot` once a per-lot usage has been crossed. */
  multiplier: number;
  lot: boolean;
}

export function buyingBom(root: LoadedBom, opts: BuyOptions): BuyingBom {
  if (!typia.is<BuyOptions["buildQuantity"]>(opts.buildQuantity)) {
    throw new Error(
      `build quantity must be a whole number of units between 1 and 4294967295 (got ${opts.buildQuantity})`,
    );
  }
  const product = opts.product ?? root.doc.products[0]!;
  const lines = new Map<string, { line: BuyingLine; part: Part }>();
  const unresolved: NonNullable<BuyingBom["unresolved"]> = [];
  /** Per-lot usages already counted: "added once, whatever the path". */
  const lotUsages = new Set<string>();

  const addLine = (
    frame: Frame,
    id: string,
    part: Part,
    q: Quantity,
    value: number,
    designators: string[],
    lotKey: string,
  ) => {
    const ref = [...frame.aliases, id].join("#");
    // Keyed by file, not by document id: two revisions of one document
    // may be reached through different imports, and are different parts.
    const key = `${frame.bom.file}#${id}`;
    let line = lines.get(key)?.line;
    if (!line) {
      const manufacturerParts = part.manufacturerParts?.filter(
        (m) => m.status !== "notApproved",
      );
      const supplierParts = part.supplierParts?.filter(
        (s) => s.status !== "notApproved",
      );
      line = {
        part: ref,
        kind: part.kind,
        name: part.name,
        ...(manufacturerParts?.length ? { manufacturerParts } : {}),
        ...(supplierParts?.length ? { supplierParts } : {}),
        unit: part.unit ?? "1",
        quantityPerUnit: 0,
        quantityPerLot: 0,
        totalQuantity: 0,
        occurrences: [],
      };
      lines.set(key, { line, part });
    }
    const occurrence: Occurrence = { path: frame.path };
    if (q.basis === "asRequired") {
      line.asRequired = true;
    } else if (frame.lot || q.basis === "perLot") {
      if (!lotUsages.has(lotKey))
        line.quantityPerLot = round(line.quantityPerLot + value);
      lotUsages.add(lotKey);
    } else {
      line.quantityPerUnit = round(line.quantityPerUnit + value);
      occurrence.quantity = value;
    }
    if (designators.length) occurrence.designators = designators;
    line.occurrences.push(occurrence);
  };

  const walk = (
    frame: Frame,
    partId: string,
    part: Part,
    seen: Set<string>,
  ) => {
    for (const usage of part.usages ?? []) {
      const path = [...frame.path, usage.id];
      if (usage.fitted === false) continue;
      if (usage.applicability) {
        const r = evaluate(usage.applicability, frame.bom, frame.ctx);
        if (r === false) continue;
        if (r !== true) {
          unresolved.push({ path, reason: r.unknown });
          continue;
        }
      }
      const target = resolvePart(frame.bom, usage.part);
      if (!target.ok) {
        unresolved.push({ path, reason: target.reason });
        continue;
      }
      const child = target.value;
      if (child.kind === "software") continue;
      const childKey = `${target.bom.file}#${target.id}`;
      if (seen.has(childKey)) {
        unresolved.push({ path, reason: `cycle through part "${usage.part}"` });
        continue;
      }
      const childFrame: Frame = { ...descend(frame, usage.part), path };
      const q = usage.quantity;
      // Crossing a per-lot usage restarts the multiplier: the lot needs it once.
      const startsLot = q.basis === "perLot" && !frame.lot;
      // Quantities are added up in the part's unit.
      const partUnit = child.unit ?? "1";
      const factor = conversionFactor(q.unit ?? partUnit, partUnit);
      if (factor === undefined) {
        unresolved.push({
          path,
          reason: `quantity in "${q.unit}" cannot be converted to "${partUnit}", the unit of part "${usage.part}"`,
        });
        continue;
      }
      const amount = (q.value ?? 0) * factor;
      const value =
        q.basis === "asRequired"
          ? 0
          : startsLot
            ? round(amount)
            : round(amount * frame.multiplier);
      const lotKey = `${frame.bom.file}#${partId}/${usage.id}`;
      const designators = (usage.designators ?? []).flatMap((d) => d.values);
      const isAssembly = (child.usages?.length ?? 0) > 0;
      const expand =
        isAssembly && (child.phantom || (child.makeOrBuy ?? "make") === "make");
      if (expand) {
        if (q.basis === "asRequired") {
          unresolved.push({
            path,
            reason: "assembly used as required: its content cannot be counted",
          });
          continue;
        }
        if (startsLot) {
          if (lotUsages.has(lotKey)) continue;
          lotUsages.add(lotKey);
        }
        walk(
          { ...childFrame, multiplier: value, lot: frame.lot || startsLot },
          target.id,
          child,
          new Set([...seen, childKey]),
        );
        continue;
      }
      if (isIncomplete(child)) {
        unresolved.push({
          path,
          reason: `part "${usage.part}" is incomplete: nothing identifies what to buy`,
        });
        continue;
      }
      addLine(
        childFrame,
        target.id,
        child,
        q,
        value,
        designators,
        frame.lot ? path.join("/") : lotKey,
      );
    }
  };

  const start = resolvePart(root, product);
  if (!start.ok) throw new Error(start.reason);
  const ctx = rootContext(opts.configuration);
  walk(
    descend(
      { bom: root, ctx, aliases: [], path: [], multiplier: 1, lot: false },
      product,
    ),
    start.id,
    start.value,
    new Set([`${start.bom.file}#${start.id}`]),
  );

  const out: BuyingLine[] = [];
  for (const { line, part } of [...lines.values()].sort((a, b) =>
    a.line.part < b.line.part ? -1 : a.line.part > b.line.part ? 1 : 0,
  )) {
    const needed = round(
      line.quantityPerUnit * opts.buildQuantity + line.quantityPerLot,
    );
    const { rate = 0, perLot = 0 } = part.scrap ?? {};
    // Nothing needed (an "as required" line), nothing lost.
    const lost = needed > 0 ? round(needed * rate + perLot) : 0;
    const scrap = line.unit === "1" ? Math.ceil(lost) : lost;
    if (scrap > 0) line.scrapQuantity = scrap;
    line.totalQuantity = round(needed + scrap);
    const packs = (line.supplierParts ?? []).flatMap(
      ({ supplier, sku, packSize = 1 }) =>
        packSize > 1
          ? [
              {
                supplier,
                sku,
                packSize,
                count: Math.ceil(round(line.totalQuantity / packSize)),
              },
            ]
          : [],
    );
    if (packs.length) line.packs = packs;
    out.push(line);
  }
  return {
    kind: "buyingBom",
    source: {
      id: root.doc.id,
      ...(root.doc.revision !== undefined
        ? { revision: root.doc.revision }
        : {}),
      sha256: sha256File(root.file),
    },
    product,
    buildQuantity: opts.buildQuantity,
    ...(opts.configuration ? { configuration: opts.configuration } : {}),
    lines: out,
    ...(unresolved.length ? { unresolved } : {}),
  };
}
