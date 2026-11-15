// Canonical serialization: what producers SHOULD write so that text diffs of
// two revisions stay readable. Maps keyed by id are sorted by id (code point
// order); everything else keeps its order.

import { BomDocument, BomkitDocument } from "../../src/index.js";

const SORTED_MAPS = [
  "parts",
  "documents",
  "organizations",
  "options",
  "imports",
] as const satisfies readonly (keyof BomDocument)[];

/** Sorting preserves every key and value of the map. */
function sortKeys<T extends object>(map: T): T {
  return Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ) as T;
}

function sortMap<K extends (typeof SORTED_MAPS)[number]>(
  doc: BomDocument,
  key: K,
): void {
  const map = doc[key];
  if (map !== undefined) doc[key] = sortKeys(map);
}

/** Returns a copy of a native bomkit document in canonical form. */
export function canonicalize<T extends BomkitDocument>(doc: T): T {
  const root = structuredClone(doc);
  if (root.kind === "bom") for (const key of SORTED_MAPS) sortMap(root, key);
  return root;
}

export function serialize(doc: BomkitDocument): string {
  return JSON.stringify(canonicalize(doc), null, 2) + "\n";
}
