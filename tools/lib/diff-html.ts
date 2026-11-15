// Presentation only: changes are computed by the existing diff algorithm.
import { Change, ChangeSet, FieldChange, Usage } from "../../src/index.js";
import { escapeHtml as escape, htmlPage } from "./html-page.js";
import { Finding, LoadedBom, resolvePart } from "./load.js";

function valueHtml(value: unknown): string {
  if (value === undefined) return '<span class="muted">Absent</span>';
  if (value === null || typeof value !== "object") {
    return `<span class="diff-value">${escape(JSON.stringify(value))}</span>`;
  }
  const summary = Array.isArray(value)
    ? `${value.length} entries`
    : `${Object.keys(value).length} fields`;
  return `<details><summary>${summary}</summary><pre>${escape(JSON.stringify(value, null, 2))}</pre></details>`;
}

export function renderDiffHtml(
  before: LoadedBom,
  after: LoadedBom,
  changes: ChangeSet,
  findings: Finding[] = [],
): string {
  const matches = changes.identityMatches ?? [];
  function oldPart(id: string): string {
    const match = matches.find((m) => typeof m.to === "string" && m.to === id);
    return match && typeof match.from === "string" ? match.from : id;
  }
  function oldUsage(parent: string, id: string): Usage | undefined {
    const match = matches.find(
      (m) =>
        typeof m.to !== "string" && m.to.parent === parent && m.to.usage === id,
    );
    const from =
      match && typeof match.from !== "string"
        ? match.from
        : { parent: oldPart(parent), usage: id };
    return before.doc.parts[from.parent]?.usages?.find(
      (u) => u.id === from.usage,
    );
  }
  function partLabel(bom: LoadedBom, id: string): string {
    return `${escape(bom.doc.parts[id]?.name ?? id)}<small>${escape(id)}</small>`;
  }
  function usageLabel(bom: LoadedBom, parent: string, id: string): string {
    return `${partLabel(bom, parent)}<small>Usage: ${escape(id)}</small>`;
  }
  function usageValue(bom: LoadedBom, usage: Usage | undefined): string {
    if (!usage) return valueHtml(undefined);
    const part = resolvePart(bom, usage.part);
    const name = part.ok ? part.value.name : usage.part;
    return `<div>${escape(name)}</div>${valueHtml(usage)}`;
  }
  function rows(change: Change): string {
    let item: string;
    let fields: FieldChange[];
    let kind: "added" | "removed" | "modified" | "moved";
    let label: string;
    switch (change.op) {
      case "documentModified":
        kind = "modified";
        label = "BOM modified";
        item = "Document";
        fields = change.fields;
        break;
      case "partModified":
        kind = "modified";
        label = "Part modified";
        item = partLabel(after, change.part);
        fields = change.fields;
        break;
      case "usageModified":
        kind = "modified";
        label = "Usage modified";
        item = usageLabel(after, change.parent, change.usage);
        fields = change.fields;
        break;
      case "partAdded":
        kind = "added";
        label = "Part added";
        item = partLabel(after, change.part);
        fields = [{ path: "", after: after.doc.parts[change.part] }];
        break;
      case "partRemoved":
        kind = "removed";
        label = "Part removed";
        item = partLabel(before, change.part);
        fields = [{ path: "", before: before.doc.parts[change.part] }];
        break;
      case "usageAdded":
        kind = "added";
        label = "Usage added";
        item = usageLabel(after, change.parent, change.usage);
        fields = [
          {
            path: "",
            after: after.doc.parts[change.parent]?.usages?.find(
              (u) => u.id === change.usage,
            ),
          },
        ];
        break;
      case "usageRemoved":
        kind = "removed";
        label = "Usage removed";
        item = usageLabel(before, oldPart(change.parent), change.usage);
        fields = [{ path: "", before: oldUsage(change.parent, change.usage) }];
        break;
      case "usageMoved":
        kind = "moved";
        label = "Usage moved";
        item = escape(change.newUsage ?? change.usage);
        fields = [
          {
            path: "/parent",
            before: `${before.doc.parts[oldPart(change.fromParent)]?.name ?? change.fromParent} / ${change.usage}`,
            after: `${after.doc.parts[change.toParent]?.name ?? change.toParent} / ${change.newUsage ?? change.usage}`,
          },
        ];
        break;
    }
    return fields
      .map(
        (field, index) => `<tr class="diff-${kind}">
    ${index === 0 ? `<td rowspan="${fields.length}"><span class="badge">${label}</span></td><td rowspan="${fields.length}">${item}</td>` : ""}
    <td><code>${escape(field.path || "—")}</code></td>
    <td class="diff-before">${change.op === "usageRemoved" ? usageValue(before, field.before as Usage | undefined) : valueHtml(field.before)}</td>
    <td class="diff-after">${change.op === "usageAdded" ? usageValue(after, field.after as Usage | undefined) : valueHtml(field.after)}</td>
</tr>`,
      )
      .join("");
  }

  const title = `${after.doc.name ?? after.doc.id} · Changes`;
  const revision = (bom: LoadedBom) =>
    escape(bom.doc.revision ?? "Unspecified revision");
  const header = `<div class="eyebrow">bomkit / BOM comparison</div>
<h1>${escape(title)}</h1>
<p>${revision(before)} → ${revision(after)}</p>
<p class="identity">${escape(before.doc.id)} → ${escape(after.doc.id)}</p>
<div class="stats"><strong>${changes.changes.length}</strong> changes</div>`;
  return htmlPage(
    title,
    header,
    `
${before.doc.id !== after.doc.id ? '<p class="warning">Comparing two different BOM identities.</p>' : ""}
${findings.length ? `<aside class="warning"><ul>${findings.map((f) => `<li>${escape(`${f.severity} [${f.code}] ${f.path}: ${f.message}`)}</li>`).join("")}</ul></aside>` : ""}
<p class="note">Content changes only: provenance and release metadata are ignored. Imported BOMs are compared by their references; their contents are not compared recursively.</p>
<div class="table-scroll"><table class="diff-table">
<thead><tr><th>Change</th><th>Item / assembly</th><th>Field</th><th>Before</th><th>After</th></tr></thead>
<tbody>${changes.changes.map(rows).join("") || '<tr><td colspan="5">No content changes.</td></tr>'}</tbody>
</table></div>
${
  matches.length
    ? `<h2>Identity matches</h2>
<p class="note">These matches were applied before comparison. A renamed ID alone is not a content change.</p>
<div class="table-scroll"><table>
<thead><tr><th>Before</th><th>After</th><th>Method</th><th>Confidence</th><th>Confirmed</th></tr></thead>
<tbody>${matches
        .map(
          (m) => `<tr>
    <td>${valueHtml(m.from)}</td><td>${valueHtml(m.to)}</td><td>${escape(m.method)}</td>
    <td>${m.confidence === undefined ? "—" : escape(m.confidence)}</td><td>${m.confirmed === undefined ? "—" : escape(m.confirmed)}</td>
</tr>`,
        )
        .join("")}</tbody></table></div>`
    : ""
}`,
  );
}
