// Change set between two revisions of a BOM document.
//
// Fields are compared by JSON Pointer. Arrays are compared as a whole (one
// field change for the array), never element by element, so that inserting
// an element does not shift every index. Arrays whose order carries no
// meaning (designator values, manufacturer and supplier parts, identifiers…)
// are compared as sets.
//
// Content is compared, not how it was obtained: `provenance`, release data
// and issues are ignored. See "Change set" in the README.

import {
  BomDocument,
  Change,
  ChangeSet,
  FieldChange,
  IdentityMatch,
  Part,
  SPEC_VERSION,
  Usage,
  UsageKey,
} from "../../src/index.js";
import { pointer } from "./load.js";

/** Keys whose array value is a set: order is ignored when comparing. */
const SET_ARRAYS = new Set([
  "values",
  "designators",
  "manufacturerParts",
  "supplierParts",
  "identifiers",
  "category",
  "documents",
  "aliases",
  "codes",
  "products",
  "requires",
]);

/** Free-form data, compared as it is: no key in it has a meaning for the diff. */
const RAW = new Set(["properties", "extensions"]);

/** Fields of the document compared by `documentModified`. */
const DOCUMENT_FIELDS = [
  "name",
  "owner",
  "products",
  "documents",
  "organizations",
  "options",
  "imports",
  "requires",
  "notes",
  "extensions",
] as const satisfies readonly (keyof BomDocument)[];

/**
 * Canonical form for comparison: keys sorted, set-like arrays sorted, and
 * `provenance` dropped (where a value was read from is not content).
 */
function normalize(value: unknown, key?: string, raw = false): unknown {
  raw ||= key !== undefined && RAW.has(key);
  if (Array.isArray(value)) {
    const items = value.map((v) => normalize(v, undefined, raw));
    return !raw && key && SET_ARRAYS.has(key)
      ? items
          .map((v) => JSON.stringify(v))
          .sort()
          .map((s) => JSON.parse(s))
      : items;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      if (k === "provenance" && !raw) continue;
      out[k] = normalize((value as Record<string, unknown>)[k], k, raw);
    }
    return out;
  }
  return value;
}

const same = (a: unknown, b: unknown, key: string, raw: boolean) =>
  JSON.stringify(normalize(a, key, raw)) ===
  JSON.stringify(normalize(b, key, raw));

export const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Field changes between two objects, skipping `skip` keys at the top level. */
function fieldChanges(
  before: object,
  after: object,
  skip: string[] = [],
  base: string[] = [],
): FieldChange[] {
  const out: FieldChange[] = [];
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  const raw = base.some((k) => RAW.has(k));
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter(
      (k) =>
        !(base.length === 0 && skip.includes(k)) && (raw || k !== "provenance"),
    )
    .sort();
  for (const k of keys) {
    const va = a[k];
    const vb = b[k];
    if (same(va, vb, k, raw)) continue;
    if (isObject(va) && isObject(vb)) {
      out.push(...fieldChanges(va, vb, [], [...base, k]));
    } else {
      const change: FieldChange = { path: pointer(...base, k) };
      if (va !== undefined) change.before = va;
      if (vb !== undefined) change.after = vb;
      out.push(change);
    }
  }
  return out;
}

type PartMatch = Extract<IdentityMatch, { from: string }>;
type UsageMatch = Extract<IdentityMatch, { from: UsageKey }>;
const isPartMatch = (m: IdentityMatch): m is PartMatch =>
  typeof m.from === "string";

/**
 * Rewrites the old revision with the ids of the new one, according to
 * identity matches: part ids, and ids of usages that stay in their parent.
 * Usage matches across parents are moves, handled by `diff`.
 */
function applyMatches(
  doc: BomDocument,
  partMatches: PartMatch[],
  usageMatches: UsageMatch[],
): BomDocument {
  if (!partMatches.length && !usageMatches.length) return doc;
  const map = new Map(partMatches.map((m) => [m.from, m.to]));
  const ren = (ref: string) =>
    ref.includes("#") ? ref : (map.get(ref) ?? ref);
  const parts: Record<string, Part> = {};
  for (const [id, p] of Object.entries(structuredClone(doc.parts))) {
    const usageIds = new Map(
      usageMatches
        .filter((m) => m.from.parent === id && ren(id) === m.to.parent)
        .map((m) => [m.from.usage, m.to.usage]),
    );
    p.usages?.forEach((u) => {
      u.id = usageIds.get(u.id) ?? u.id;
      u.part = ren(u.part);
      u.alternates?.forEach((a) => (a.part = ren(a.part)));
    });
    p.steps?.forEach((s) => {
      if (s.usages) s.usages = s.usages.map((u) => usageIds.get(u) ?? u);
    });
    parts[ren(id)] = p;
  }
  return { ...doc, products: doc.products.map(ren), parts };
}

export interface DiffOptions {
  id?: ChangeSet["id"];
  identityMatches?: ChangeSet["identityMatches"];
  /** Digests of the two serialized documents, to make `from` and `to` exact. */
  sha256?: {
    from?: ChangeSet["from"]["sha256"];
    to?: ChangeSet["to"]["sha256"];
  };
}

/**
 * Change set between two revisions. Throws when an identity match names a
 * part or usage that does not exist: a match that silently does nothing
 * would show as a removal and an addition.
 */
export function diff(
  oldDoc: BomDocument,
  newDoc: BomDocument,
  opts: DiffOptions = {},
): ChangeSet {
  const matches = opts.identityMatches ?? [];
  const partMatches = matches.filter(isPartMatch);
  const usageMatches = matches.filter((m): m is UsageMatch => !isPartMatch(m));
  const hasUsage = (doc: BomDocument, k: UsageKey) =>
    doc.parts[k.parent]?.usages?.some((u) => u.id === k.usage) ?? false;
  for (const m of partMatches) {
    if (!oldDoc.parts[m.from])
      throw new Error(
        `identity match: part "${m.from}" does not exist in the old revision`,
      );
    if (!newDoc.parts[m.to])
      throw new Error(
        `identity match: part "${m.to}" does not exist in the new revision`,
      );
  }
  for (const m of usageMatches) {
    if (!hasUsage(oldDoc, m.from))
      throw new Error(
        `identity match: usage "${m.from.usage}" of "${m.from.parent}" does not exist in the old revision`,
      );
    if (!hasUsage(newDoc, m.to))
      throw new Error(
        `identity match: usage "${m.to.usage}" of "${m.to.parent}" does not exist in the new revision`,
      );
  }
  const targets = [
    ...partMatches.map((m) => `part ${m.to}`),
    ...usageMatches.map((m) => `usage ${m.to.parent}/${m.to.usage}`),
  ];
  const sources = [
    ...partMatches.map((m) => `part ${m.from}`),
    ...usageMatches.map((m) => `usage ${m.from.parent}/${m.from.usage}`),
  ];
  for (const list of [sources, targets]) {
    const twice = list.find((x, i) => list.indexOf(x) !== i);
    if (twice) throw new Error(`identity match: ${twice} is matched twice`);
  }

  const before = applyMatches(oldDoc, partMatches, usageMatches);
  const partIds = new Map(partMatches.map((m) => [m.from, m.to]));
  /** Usage matches across parents, by new position: where the usage was (ids of the new revision for parts). */
  const moves = new Map<string, UsageKey>();
  for (const m of usageMatches) {
    const parent = partIds.get(m.from.parent) ?? m.from.parent;
    if (parent !== m.to.parent)
      moves.set(`${m.to.parent}/${m.to.usage}`, {
        parent,
        usage: m.from.usage,
      });
  }

  const changes: Change[] = [];
  const removed: { parent: string; usage: Usage }[] = [];
  const added: { parent: string; usage: Usage }[] = [];

  const documentFields = fieldChanges(
    Object.fromEntries(
      DOCUMENT_FIELDS.flatMap((k) =>
        before[k] !== undefined ? [[k, before[k]]] : [],
      ),
    ),
    Object.fromEntries(
      DOCUMENT_FIELDS.flatMap((k) =>
        newDoc[k] !== undefined ? [[k, newDoc[k]]] : [],
      ),
    ),
  );
  if (documentFields.length)
    changes.push({ op: "documentModified", fields: documentFields });

  const ids = [
    ...new Set([...Object.keys(before.parts), ...Object.keys(newDoc.parts)]),
  ].sort();
  for (const id of ids) {
    const a = before.parts[id];
    const b = newDoc.parts[id];
    if (!a) changes.push({ op: "partAdded", part: id });
    else if (!b) changes.push({ op: "partRemoved", part: id });
    else {
      const fields = fieldChanges(a, b, ["usages"]);
      if (fields.length)
        changes.push({ op: "partModified", part: id, fields: fields });
    }
    const ua = new Map((a?.usages ?? []).map((u) => [u.id, u]));
    const ub = new Map((b?.usages ?? []).map((u) => [u.id, u]));
    for (const [uid, u] of ua) {
      const v = ub.get(uid);
      if (!v) removed.push({ parent: id, usage: u });
      else {
        const fields = fieldChanges(u, v);
        if (fields.length)
          changes.push({
            op: "usageModified",
            parent: id,
            usage: uid,
            fields: fields,
          });
      }
    }
    for (const [uid, u] of ub)
      if (!ua.has(uid)) added.push({ parent: id, usage: u });
  }

  // A usage has moved when a match says so, or when it disappears from one
  // parent and appears, with the same id and part, in exactly one other.
  const moved: {
    from: { parent: string; usage: Usage };
    to: { parent: string; usage: Usage };
  }[] = [];
  const take = (
    to: { parent: string; usage: Usage },
    find: (r: { parent: string; usage: Usage }) => boolean,
    unique: boolean,
  ) => {
    const candidates = removed.filter(find);
    if (candidates.length === 0 || (unique && candidates.length > 1))
      return false;
    removed.splice(removed.indexOf(candidates[0]!), 1);
    moved.push({ from: candidates[0]!, to });
    return true;
  };
  const explicit = added.filter((x) => {
    const from = moves.get(`${x.parent}/${x.usage.id}`);
    return !(
      from &&
      take(
        x,
        (r) => r.parent === from.parent && r.usage.id === from.usage,
        false,
      )
    );
  });
  const stillAdded = explicit.filter((x) => {
    const twins = explicit.filter(
      (y) => y.usage.id === x.usage.id && y.usage.part === x.usage.part,
    );
    return !(
      twins.length === 1 &&
      take(
        x,
        (r) =>
          r.usage.id === x.usage.id &&
          r.parent !== x.parent &&
          r.usage.part === x.usage.part,
        true,
      )
    );
  });
  for (const { from, to } of moved) {
    changes.push({
      op: "usageMoved",
      usage: from.usage.id,
      fromParent: from.parent,
      toParent: to.parent,
      ...(to.usage.id !== from.usage.id ? { newUsage: to.usage.id } : {}),
    });
    const fields = fieldChanges(from.usage, to.usage, ["id"]);
    if (fields.length)
      changes.push({
        op: "usageModified",
        parent: to.parent,
        usage: to.usage.id,
        fields: fields,
      });
  }
  for (const { parent, usage } of stillAdded)
    changes.push({ op: "usageAdded", parent, usage: usage.id });
  for (const { parent, usage } of removed)
    changes.push({ op: "usageRemoved", parent, usage: usage.id });

  const order: Record<Change["op"], number> = {
    documentModified: 0,
    partAdded: 1,
    partRemoved: 2,
    partModified: 3,
    usageAdded: 4,
    usageRemoved: 5,
    usageMoved: 6,
    usageModified: 7,
  };
  const sortKey = (c: Change) =>
    "part" in c
      ? c.part
      : "parent" in c
        ? `${c.parent}/${c.usage}`
        : "toParent" in c
          ? `${c.toParent}/${c.usage}`
          : "";
  changes.sort(
    (x, y) =>
      order[x.op] - order[y.op] ||
      (sortKey(x) < sortKey(y) ? -1 : sortKey(x) > sortKey(y) ? 1 : 0),
  );

  const ref = (d: BomDocument, sha256?: string) => ({
    id: d.id,
    ...(d.revision !== undefined ? { revision: d.revision } : {}),
    ...(sha256 !== undefined ? { sha256 } : {}),
  });
  const rev = (d: BomDocument) => encodeURIComponent(d.revision ?? "?");
  return {
    kind: "changeSet",
    specVersion: SPEC_VERSION,
    id: opts.id ?? `${newDoc.id}:change:${rev(oldDoc)}..${rev(newDoc)}`,
    from: ref(oldDoc, opts.sha256?.from),
    to: ref(newDoc, opts.sha256?.to),
    ...(matches.length ? { identityMatches: matches } : {}),
    changes,
    generator: { tool: "bomkit-reference", version: "0.1.0" },
  };
}
