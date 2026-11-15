// A self-contained, script-free view of a BOM and its loaded imports.
import { Part, Quantity } from "../../src/index.js";
import {
  Finding,
  LoadedBom,
  resolveOrganization,
  resolvePart,
} from "./load.js";
import { BuyOptions, buyingBom } from "./buy.js";
import { escapeHtml as escape, htmlPage } from "./html-page.js";

const badge = (value: string) => `<span class="badge">${escape(value)}</span>`;
const notes = (items?: { text: string }[]) =>
  (items ?? []).map((n) => `<p class="note">${escape(n.text)}</p>`).join("");

function quantity(q: Quantity, part?: Part): string {
  const unit = q.unit ?? part?.unit ?? "1";
  return escape(
    `${q.value ?? "—"} ${unit === "1" ? "pcs" : unit}${q.basis === "perLot" ? " / lot" : q.basis === "asRequired" ? " · as required" : " / parent"}`,
  );
}

/** Render a manufacturing tree and a purchasing roll-up in one offline HTML file. */
export function renderHtml(
  root: LoadedBom,
  findings: Finding[] = [],
  options: Partial<BuyOptions> = {},
): string {
  const docs: LoadedBom[] = [];
  const visited = new Set<LoadedBom>();
  function collect(bom: LoadedBom) {
    if (visited.has(bom)) return;
    visited.add(bom);
    docs.push(bom);
    for (const imported of bom.imports.values()) collect(imported);
  }
  collect(root);
  function partLabel(bom: LoadedBom, ref: string): string {
    const resolved = resolvePart(bom, ref);
    return resolved.ok
      ? `<span class="part-label">${escape(resolved.value.name)}<small>${escape(ref)}</small></span>`
      : `<span class="warning">${escape(ref)}</span><small>${escape(resolved.reason)}</small>`;
  }
  function organization(bom: LoadedBom, ref: string): string {
    const resolved = resolveOrganization(bom, ref);
    return resolved.ok ? resolved.value.name : ref;
  }
  function details(label: string, value: unknown): string {
    if (value === undefined) return "";
    return `<details><summary>${escape(label)}</summary><pre>${escape(JSON.stringify(value, null, 2))}</pre></details>`;
  }
  function catalog(
    bom: LoadedBom,
    part: Part,
  ): { manufacturer: string; mpn: string } {
    const refs = (part.manufacturerParts ?? []).filter(
      (r) => r.status !== "notApproved",
    );
    const primary = refs.find((r) => r.status === "preferred") ?? refs[0];
    if (!primary)
      return {
        manufacturer: '<span class="muted">—</span>',
        mpn: '<span class="muted">—</span>',
      };
    const title = escape(
      refs
        .map(
          (r) =>
            `${organization(bom, r.manufacturer)} · ${r.mpn} (${r.status ?? "approved"})`,
        )
        .join("\n"),
    );
    return {
      manufacturer: `<span title="${title}">${escape(organization(bom, primary.manufacturer))}</span>`,
      mpn: `<span title="${title}">${escape(primary.mpn)}</span>${refs.length > 1 ? `<small class="alternates" title="${title}">+${refs.length - 1}</small>` : ""}`,
    };
  }
  function references(bom: LoadedBom, part: Part): string {
    const references = [
      ...(part.identifiers ?? []).map(
        (r) =>
          `${organization(bom, r.issuer)} · ${r.value}${r.revision ? ` · rev ${r.revision}` : ""}`,
      ),
      ...(part.supplierParts ?? []).map(
        (r) =>
          `${organization(bom, r.supplier)} · ${r.sku} · ${r.status ?? "approved"}${r.packSize ? ` · pack of ${r.packSize}` : ""}`,
      ),
    ];
    return references.map((r) => `<div>${escape(r)}</div>`).join("");
  }
  let nodes = 0;
  function tree(
    bom: LoadedBom,
    ref: string,
    q: string,
    position: string,
    seen: Set<string>,
    depth = 0,
    usageInfo = "",
  ): string {
    if (++nodes > 10000 || depth > 64)
      return `<p class="warning">Display limit reached. Export a smaller subassembly to inspect further.</p>`;
    const resolved = resolvePart(bom, ref);
    if (!resolved.ok)
      return `<div class="leaf warning">${escape(ref)} · ${escape(resolved.reason)}</div>`;
    const { value: part, bom: target, id } = resolved;
    const key = `${target.file}#${id}`;
    const cycle = seen.has(key);
    const assembly = !!part.usages?.length && !cycle;
    const next = new Set([...seen, key]);
    const manufacturer = catalog(target, part);
    const row = `<span class="row">
    <span class="designation"><strong>${escape(part.name)}</strong><small>${escape(ref)}${target !== root ? " · imported" : ""}</small></span>
    <span>${badge(part.kind)}${assembly ? badge(part.phantom ? "phantom" : (part.makeOrBuy ?? "make")) : ""}</span>
    <span class="manufacturer">${manufacturer.manufacturer}</span>
    <span class="mpn">${manufacturer.mpn}</span>
    <span class="quantity">${q}</span>
    <span class="position">${position}</span>
</span>`;
    const info = `<div class="node-info"><details>
    <summary>Details</summary>
    ${usageInfo}${notes(part.notes)}
    ${cycle ? '<p class="warning">Cycle detected; expansion stopped.</p>' : ""}
    <pre>${escape(JSON.stringify({ ...part, usages: undefined }, null, 2))}</pre>
</details></div>`;
    const children = assembly
      ? part
          .usages!.map((u) => {
            const child = resolvePart(target, u.part);
            const positions = (u.designators ?? [])
              .map(
                (d) =>
                  `${d.scheme}${d.side ? ` · ${d.side}` : ""}: ${d.values.join(", ")}`,
              )
              .join(" · ");
            const usageInfo = `${u.fitted === false ? badge("Not fitted") : ""}${details("Applicability", u.applicability)}${notes(u.notes)}${details("Alternates", u.alternates)}`;
            const position =
              `${escape(u.id)}${positions ? `<small>${escape(positions)}</small>` : ""}` +
              (u.fitted === false ? badge("Not fitted") : "") +
              (u.applicability ? badge("Conditional") : "");
            return tree(
              target,
              u.part,
              quantity(u.quantity, child.ok ? child.value : undefined),
              position,
              next,
              depth + 1,
              usageInfo,
            );
          })
          .join("")
      : "";
    const content = assembly
      ? `<details class="node"${depth === 0 ? " open" : ""}>
    <summary>${row}</summary>
    <div class="children">${children}</div>
</details>`
      : `<div class="leaf">${row}</div>`;
    return `<div class="entry" style="--depth:${depth}">${content}${info}</div>`;
  }
  const products = options.product ? [options.product] : root.doc.products;
  const buildQuantity = options.buildQuantity ?? 1;
  const manufacturing = products
    .map((ref) => {
      const resolved = resolvePart(root, ref);
      const unit = resolved.ok ? (resolved.value.unit ?? "1") : "1";
      return tree(
        root,
        ref,
        escape(`1 ${unit === "1" ? "pcs" : unit}`),
        "Product",
        new Set(),
      );
    })
    .join("");
  const purchasing = products
    .map((product) => {
      const buy = buyingBom(root, { ...options, product, buildQuantity });
      return `<section>
<h2>${partLabel(root, product)}</h2>
<p class="note">Build quantity: ${buildQuantity}. Totals include scrap; per-lot quantities are counted once. As-required amounts are excluded from numeric totals.</p>
<div class="table-scroll"><table>
<thead><tr>
    <th>Part / reference</th><th>Kind</th><th>Manufacturer</th><th>MPN</th>
    <th>Per unit</th><th>Per lot</th><th>Scrap</th><th>Total to buy</th><th>Unit</th><th>Sources / packs</th>
</tr></thead>
<tbody>${
        buy.lines
          .map((line) => {
            const resolved = resolvePart(root, line.part);
            const manufacturer = catalog(resolved.ok ? resolved.bom : root, {
              kind: line.kind,
              name: line.name,
              manufacturerParts: line.manufacturerParts,
            });
            const sources = resolved.ok
              ? references(resolved.bom, {
                  ...resolved.value,
                  supplierParts: line.supplierParts,
                })
              : "";
            const packs =
              line.packs
                ?.map(
                  (p) =>
                    `<small>${escape(p.sku)}: ${p.count} packs × ${p.packSize}</small>`,
                )
                .join("") ?? "";
            return `<tr data-part="${escape(line.part)}">
    <td>${partLabel(root, line.part)}</td>
    <td>${badge(line.kind)}</td>
    <td>${manufacturer.manufacturer}</td>
    <td>${manufacturer.mpn}${details("References", (line.manufacturerParts?.length ?? 0) > 1 ? line.manufacturerParts : undefined)}</td>
    <td>${line.quantityPerUnit}</td><td>${line.quantityPerLot}</td><td>${line.scrapQuantity ?? 0}</td>
    <td class="quantity"><strong>${line.totalQuantity}</strong>${line.asRequired ? badge("+ as required") : ""}</td>
    <td>${escape(line.unit === "1" ? "pcs" : line.unit)}</td>
    <td>${sources}${packs}</td>
</tr>`;
          })
          .join("") ||
        '<tr><td colspan="10">No purchasing lines for this configuration.</td></tr>'
      }</tbody></table></div>
${
  buy.unresolved?.length
    ? `<aside class="warning">
    <h3>Unresolved quantities — purchasing list is incomplete</h3>
    <ul>${buy.unresolved.map((u) => `<li>${escape(u.path.join(" / "))}: ${escape(u.reason)}</li>`).join("")}</ul>
</aside>`
    : ""
}
</section>`;
    })
    .join("");
  const title = root.doc.name ?? root.doc.id;
  const partCount = docs.reduce(
    (sum, bom) => sum + Object.keys(bom.doc.parts).length,
    0,
  );
  return htmlPage(
    title,
    `<div class="eyebrow">bomkit / Bill of materials</div>
<h1>${escape(title)}</h1>
<p class="identity">${escape(root.doc.id)}</p>
${badge(root.doc.status ?? "draft")}${root.doc.revision ? badge(`Revision ${root.doc.revision}`) : ""}${root.doc.issuedAt ? badge(root.doc.issuedAt) : ""}
<div class="stats">
<div>
<strong>${products.length}</strong> products</div>
<div>
<strong>${partCount}</strong> part definitions</div>
<div>
<strong>${docs.length - 1}</strong> imported BOMs</div>
</div>${notes(root.doc.notes)}`,
    `${
      findings.length
        ? `<aside class="warning">
<h2>Loading notices</h2>
<ul>${findings.map((f) => `<li>${escape(`${f.severity} [${f.code}] ${f.path}: ${f.message}`)}</li>`).join("")}</ul>
</aside>`
        : ""
    }
<input class="control" type="radio" name="view" id="view-manufacturing" checked>
<input class="control" type="radio" name="view" id="view-purchasing">
<nav class="view-switch" aria-label="BOM view">
<label for="view-manufacturing">Manufacturing BOM</label>
<label for="view-purchasing">Purchasing BOM</label>
</nav>
<section class="manufacturing">
<p class="note">Click a subassembly to open its contents. Quantities are per parent; all variants and not-fitted usages are shown. Manufacturer / MPN show the preferred reference; +N indicates alternatives available in Details.</p>
<div class="tree-scroll">
<div class="tree">
<div class="row tree-header">
<span>Part / subassembly</span>
<span>Type</span>
<span>Manufacturer</span>
<span>MPN</span>
<span>Quantity</span>
<span>Usage / position</span>
</div>${manufacturing}</div>
</div>
</section>
<section class="purchasing">
<p class="note">Flat purchasing list for the selected configuration; option defaults apply. Bought assemblies stay as one line. Software and not-fitted usages are excluded.</p>
${details("Configuration overrides", options.configuration ?? {})}${purchasing}
</section>
${details("BOM metadata, documents & options", (({ parts, ...metadata }) => metadata)(root.doc))}
`,
  );
}
