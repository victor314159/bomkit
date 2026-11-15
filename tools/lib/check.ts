// Semantic checks: the rules of the README that span several objects and
// cannot be expressed in the JSON Schema ("Validation checks").

import {
  Applicability,
  BomDocument,
  Part,
  Quantity,
  Usage,
} from "../../src/index.js";
import { isIncomplete } from "./buy.js";
import {
  Finding,
  LoadedBom,
  pointer,
  resolveOrganization,
  resolvePart,
} from "./load.js";
import { conversionFactor } from "./units.js";

/** Option values a condition requires, when it is a plain conjunction of option tests. */
function requiredOptions(
  cond: Applicability | undefined,
): Map<string, string | boolean> {
  const out = new Map<string, string | boolean>();
  const visit = (c: Applicability) => {
    if ("option" in c) out.set(c.option, c.equals ?? true);
    else if ("all" in c) c.all.forEach(visit);
  };
  if (cond) visit(cond);
  return out;
}

/** True when two usages can never apply together (they require different values of one option). */
function mutuallyExclusive(a: Usage, b: Usage): boolean {
  const ra = requiredOptions(a.applicability);
  const rb = requiredOptions(b.applicability);
  for (const [option, value] of ra)
    if (rb.has(option) && rb.get(option) !== value) return true;
  return false;
}

function collectOptionRefs(
  cond: Applicability | undefined,
  out: { option: string; equals?: string }[],
) {
  if (!cond) return;
  if ("option" in cond) out.push(cond);
  else if ("all" in cond) cond.all.forEach((c) => collectOptionRefs(c, out));
  else if ("any" in cond) cond.any.forEach((c) => collectOptionRefs(c, out));
  else if ("not" in cond) collectOptionRefs(cond.not, out);
}

/** Whether a part has a reference that a `preferredOnly` policy allows. */
const hasPreferred = (p: Part) =>
  [...(p.manufacturerParts ?? []), ...(p.supplierParts ?? [])].some(
    (m) => m.status === "preferred",
  );
const isBought = (p: Part) => p.kind === "standard" || p.kind === "material";
/** Whether every manufacturer part that may be used is obsolete, with no supplier part to fall back on. */
const onlyObsolete = (p: Part) => {
  const usable = (p.manufacturerParts ?? []).filter(
    (m) => m.status !== "notApproved",
  );
  return (
    usable.length > 0 &&
    usable.every((m) => m.lifecycle === "obsolete") &&
    !(p.supplierParts ?? []).some((s) => s.status !== "notApproved")
  );
};

/** Checks one loaded document (not its imports; call it on each). */
export function checkBom(bom: LoadedBom): Finding[] {
  const doc: BomDocument = bom.doc;
  const findings: Finding[] = [];
  const add = (
    severity: Finding["severity"],
    code: string,
    path: string,
    message: string,
  ) => findings.push({ severity, code, file: bom.file, path, message });

  const part = (ref: string, at: string, what = "part") => {
    const r = resolvePart(bom, ref);
    if (!r.ok)
      add(
        r.unchecked ? "warning" : "error",
        r.unchecked ? "unchecked-ref" : "unresolved-part",
        at,
        `${what}: ${r.reason}`,
      );
    return r.ok ? r : undefined;
  };
  const org = (ref: string | undefined, at: string) => {
    if (ref === undefined) return;
    const r = resolveOrganization(bom, ref);
    if (!r.ok)
      add(
        r.unchecked ? "warning" : "error",
        r.unchecked ? "unchecked-ref" : "unresolved-organization",
        at,
        r.reason,
      );
  };
  const docRef = (id: string, at: string) => {
    if (!doc.documents?.[id])
      add(
        "error",
        "unresolved-document",
        at,
        `document "${id}" does not exist`,
      );
  };
  const docRefs = (ids: string[] | undefined, at: string) =>
    ids?.forEach((id, i) => docRef(id, `${at}/${i}`));
  const provenance = (
    p: { locations: { document: string }[] } | undefined,
    at: string,
  ) =>
    p?.locations.forEach((l, i) =>
      docRef(l.document, `${at}/locations/${i}/document`),
    );
  /** Ranges that nothing satisfies. */
  const ranges = (cond: Applicability | undefined, at: string) => {
    if (!cond) return;
    if ("all" in cond) cond.all.forEach((c) => ranges(c, at));
    else if ("any" in cond) cond.any.forEach((c) => ranges(c, at));
    else if ("not" in cond) ranges(cond.not, at);
    else if ("serial" in cond) {
      const { from, to } = cond.serial;
      if (from !== undefined && to !== undefined && BigInt(from) > BigInt(to))
        add(
          "warning",
          "empty-range",
          at,
          `serial range ${from}..${to} is empty`,
        );
    } else if ("date" in cond) {
      const { from, to } = cond.date;
      if (from !== undefined && to !== undefined && from >= to)
        add(
          "warning",
          "empty-range",
          at,
          `date range ${from}..${to} is empty ("to" is exclusive)`,
        );
    }
  };
  const options = (cond: Applicability | undefined, at: string) => {
    ranges(cond, at);
    const refs: { option: string; equals?: string }[] = [];
    collectOptionRefs(cond, refs);
    for (const r of refs) {
      const o = doc.options?.[r.option];
      if (!o)
        add(
          "error",
          "unresolved-option",
          at,
          `option "${r.option}" is not declared`,
        );
      else if (r.equals === undefined && o.values)
        add(
          "error",
          "option-not-boolean",
          at,
          `option "${r.option}" has values: give "equals"`,
        );
      else if (r.equals !== undefined && !o.values)
        add(
          "error",
          "option-boolean",
          at,
          `option "${r.option}" is boolean: "equals" is not allowed`,
        );
      else if (r.equals !== undefined && !o.values!.includes(r.equals))
        add(
          "error",
          "option-value",
          at,
          `"${r.equals}" is not a value of option "${r.option}"`,
        );
    }
  };

  // Document level.
  doc.products.forEach((p, i) => part(p, pointer("products", i), "product"));
  org(doc.owner, "/owner");
  doc.approvals?.forEach((a, i) =>
    org(a.organization, pointer("approvals", i, "organization")),
  );
  if (doc.status === "released" && doc.revision === undefined)
    add(
      "warning",
      "released-without-revision",
      "/status",
      `a released document should name its revision`,
    );
  docRefs(doc.generator?.sources, "/generator/sources");
  for (const [id, o] of Object.entries(doc.options ?? {})) {
    const at = pointer("options", id, "default");
    if (o.values && o.default !== undefined && !o.values.includes(o.default)) {
      add(
        "error",
        "option-default",
        at,
        `default ${JSON.stringify(o.default)} is not a value of option "${id}"`,
      );
    }
  }
  for (const [alias, imp] of Object.entries(doc.imports ?? {})) {
    const sub = bom.imports.get(alias);
    for (const [id, binding] of Object.entries(imp.options ?? {})) {
      const at = pointer("imports", alias, "options", id);
      if (typeof binding === "object" && !doc.options?.[binding.option])
        add(
          "error",
          "unresolved-option",
          at,
          `option "${binding.option}" is not declared`,
        );
      if (sub && !sub.doc.options?.[id])
        add(
          "error",
          "unresolved-option",
          at,
          `"${alias}" declares no option "${id}"`,
        );
    }
  }
  for (const [id, d] of Object.entries(doc.documents ?? {})) {
    d.identifiers?.forEach((x, i) =>
      org(x.issuer, pointer("documents", id, "identifiers", i, "issuer")),
    );
  }
  const sc = doc.extensions?.subcontract;
  if (sc) {
    org(sc.customer, "/extensions/subcontract/customer");
    org(sc.subcontractor, "/extensions/subcontract/subcontractor");
    if (!doc.requires?.includes("subcontract"))
      add(
        "warning",
        "module-not-required",
        "/extensions/subcontract",
        `module "subcontract" is used but not listed in "requires"`,
      );
  }

  // Parts and usages.
  const usageIds = new Map<string, Set<string>>();
  for (const [id, p] of Object.entries(doc.parts)) {
    const at = (...s: (string | number)[]) => pointer("parts", id, ...s);
    p.identifiers?.forEach((x, i) =>
      org(x.issuer, at("identifiers", i, "issuer")),
    );
    p.manufacturerParts?.forEach((m, i) => {
      org(m.manufacturer, at("manufacturerParts", i, "manufacturer"));
      docRefs(m.documents, at("manufacturerParts", i, "documents"));
    });
    if (onlyObsolete(p))
      add(
        "warning",
        "obsolete-part",
        at("manufacturerParts"),
        `every approved manufacturer part of "${id}" is obsolete`,
      );
    p.supplierParts?.forEach((s, i) => {
      org(s.supplier, at("supplierParts", i, "supplier"));
      docRefs(s.documents, at("supplierParts", i, "documents"));
    });
    docRefs(p.documents, at("documents"));
    provenance(p.provenance, at("provenance"));
    if (isIncomplete(p))
      add(
        "warning",
        "incomplete-part",
        at(),
        `standard part "${id}" has no manufacturer part, supplier part, standard-part number or properties: it cannot be bought`,
      );
    if (p.kind === "material" && (p.unit ?? "1") === "1")
      add(
        "warning",
        "material-unit",
        at("unit"),
        `material "${id}" is counted in pieces`,
      );
    if (p.properties?.capacitance && !p.properties.ratedVoltage) {
      add(
        "warning",
        "missing-rating",
        at("properties"),
        `capacitor "${id}" has no ratedVoltage`,
      );
    }
    if (
      p.scrap &&
      (p.kind === "software" ||
        (p.usages?.length && !p.phantom && (p.makeOrBuy ?? "make") === "make"))
    ) {
      add(
        "warning",
        "scrap-ignored",
        at("scrap"),
        `"scrap" only applies to a part that is bought: "${id}" is ${p.kind === "software" ? "software" : "made"}`,
      );
    }
    if (p.makeOrBuy && !p.usages?.length)
      add(
        "warning",
        "make-or-buy",
        at("makeOrBuy"),
        `"makeOrBuy" is only meaningful for a part with usages`,
      );
    const policy = p.extensions?.subcontract?.substitution ?? sc?.substitution;
    if (policy === "preferredOnly" && isBought(p) && !hasPreferred(p)) {
      add(
        "error",
        "no-preferred",
        at(),
        `substitution "preferredOnly" but no preferred manufacturer or supplier part`,
      );
    }

    const ids = new Set<string>();
    usageIds.set(id, ids);
    const designators = new Map<string, { value: string; usage: Usage }[]>();
    (p.usages ?? []).forEach((u, i) => {
      const uat = (...s: (string | number)[]) => at("usages", i, ...s);
      if (ids.has(u.id))
        add(
          "error",
          "duplicate-usage",
          uat("id"),
          `usage id "${u.id}" is used twice in "${id}"`,
        );
      ids.add(u.id);
      const target = part(u.part, uat("part"));
      options(u.applicability, uat("applicability"));
      provenance(u.provenance, uat("provenance"));
      u.alternates?.forEach((a, j) => {
        part(a.part, uat("alternates", j, "part"), "alternate");
        if (a.part === u.part)
          add(
            "warning",
            "alternate-same-part",
            uat("alternates", j, "part"),
            `alternate is the usage's own part`,
          );
        options(a.applicability, uat("alternates", j, "applicability"));
      });
      const convertible = (
        q: Quantity | undefined,
        to: Part | undefined,
        qat: string,
        ref: string,
      ) => {
        if (q?.unit === undefined || !to) return;
        const partUnit = to.unit ?? "1";
        if (conversionFactor(q.unit, partUnit) === undefined)
          add(
            "error",
            "unit-mismatch",
            qat,
            `quantity in "${q.unit}" cannot be converted to "${partUnit}", the unit of part "${ref}"`,
          );
      };
      convertible(u.quantity, target?.value, uat("quantity", "unit"), u.part);
      u.alternates?.forEach((a, j) => {
        const alt = resolvePart(bom, a.part);
        if (alt.ok)
          convertible(
            a.quantity,
            alt.value,
            uat("alternates", j, "quantity", "unit"),
            a.part,
          );
      });
      const unit = u.quantity.unit ?? target?.value.unit ?? "1";
      const refdes =
        u.designators
          ?.filter((d) => d.scheme === "refdes")
          .reduce((n, d) => n + d.values.length, 0) ?? 0;
      if (
        refdes &&
        unit === "1" &&
        (u.quantity.basis ?? "perUnit") === "perUnit" &&
        u.quantity.value !== refdes
      ) {
        add(
          "warning",
          "refdes-count",
          uat("designators"),
          `${refdes} refdes for a quantity of ${u.quantity.value}`,
        );
      }
      for (const d of u.designators ?? []) {
        const seen = designators.get(d.scheme) ?? [];
        for (const value of d.values) {
          const clash = seen.find(
            (s) =>
              s.value === value &&
              s.usage !== u &&
              !mutuallyExclusive(s.usage, u),
          );
          if (clash)
            add(
              "warning",
              "duplicate-designator",
              uat("designators"),
              `${d.scheme} "${value}" is also used by usage "${clash.usage.id}"`,
            );
          seen.push({ value, usage: u });
        }
        designators.set(d.scheme, seen);
      }
      const usc = u.extensions?.subcontract;
      if (
        usc?.substitution === "preferredOnly" &&
        target &&
        isBought(target.value) &&
        !hasPreferred(target.value)
      ) {
        add(
          "error",
          "no-preferred",
          uat("extensions", "subcontract", "substitution"),
          `"preferredOnly" but part "${u.part}" has no preferred manufacturer or supplier part`,
        );
      }
    });

    // Steps.
    if (p.steps?.length) {
      const installed = new Map<string, number>();
      p.steps.forEach((s, i) => {
        s.usages?.forEach((u, j) => {
          if (!ids.has(u))
            add(
              "error",
              "unresolved-usage",
              at("steps", i, "usages", j),
              `usage "${u}" does not exist in "${id}"`,
            );
          installed.set(u, (installed.get(u) ?? 0) + 1);
        });
        docRefs(s.documents, at("steps", i, "documents"));
      });
      for (const u of ids) {
        const n = installed.get(u) ?? 0;
        if (n !== 1)
          add(
            "warning",
            "step-coverage",
            at("steps"),
            `usage "${u}" is installed by ${n} steps`,
          );
      }
    }
  }

  // Cycles in the usage graph, within this document.
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, trail: string[]) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      add(
        "error",
        "cycle",
        pointer("parts", id),
        `cycle: ${[...trail, id].join(" → ")}`,
      );
      return;
    }
    state.set(id, "visiting");
    for (const u of doc.parts[id]?.usages ?? [])
      if (!u.part.includes("#")) visit(u.part, [...trail, id]);
    state.set(id, "done");
  };
  Object.keys(doc.parts).forEach((id) => visit(id, []));

  // Issues.
  const issueIds = new Set<string>();
  doc.issues?.forEach((issue, i) => {
    const at = (...s: (string | number)[]) => pointer("issues", i, ...s);
    if (issueIds.has(issue.id))
      add(
        "error",
        "duplicate-issue",
        at("id"),
        `issue id "${issue.id}" is used twice`,
      );
    issueIds.add(issue.id);
    org(issue.raisedBy, at("raisedBy"));
    issue.answers?.forEach((a, j) => org(a.by, at("answers", j, "by")));
    provenance(issue.provenance, at("provenance"));
    issue.subjects?.forEach((s, j) => {
      if ("document" in s)
        return docRef(s.document, at("subjects", j, "document"));
      if (!doc.parts[s.part])
        add(
          "error",
          "unresolved-part",
          at("subjects", j, "part"),
          `part "${s.part}" does not exist`,
        );
      else if (s.usage !== undefined && !usageIds.get(s.part)?.has(s.usage))
        add(
          "error",
          "unresolved-usage",
          at("subjects", j, "usage"),
          `usage "${s.usage}" does not exist in "${s.part}"`,
        );
    });
    if (issue.severity === "error" && (issue.status ?? "open") === "open") {
      add(
        doc.status === "released" ? "warning" : "info",
        "open-error-issue",
        at(),
        `open blocking issue${doc.status === "released" ? " in a released document" : ""}: ${issue.text}`,
      );
    }
  });

  // A warning about something an issue already covers has been seen: it
  // is kept, as info, with a pointer to the issue.
  for (const f of findings) {
    if (f.severity !== "warning") continue;
    const m = /^\/parts\/([^/]+)(?:\/usages\/(\d+))?/.exec(f.path);
    if (!m) continue;
    const partId = m[1]!.replace(/~1/g, "/").replace(/~0/g, "~");
    const usageId =
      m[2] !== undefined
        ? doc.parts[partId]?.usages?.[Number(m[2])]?.id
        : undefined;
    const issue = doc.issues?.find((i) =>
      i.subjects?.some(
        (s) =>
          "part" in s &&
          s.part === partId &&
          (s.usage === undefined || s.usage === usageId),
      ),
    );
    if (issue) {
      f.severity = "info";
      f.message += ` (see issue ${issue.id})`;
    }
  }
  return findings;
}

/** A document and, recursively, the documents it imports. */
function closure(bom: LoadedBom, out = new Set<LoadedBom>()): Set<LoadedBom> {
  if (!out.has(bom)) {
    out.add(bom);
    bom.imports.forEach((b) => closure(b, out));
  }
  return out;
}

/**
 * Checks a document and, recursively, the documents it imports. `done`
 * holds the files already checked, when several roots are checked in a row.
 */
export function checkAll(bom: LoadedBom, done = new Set<string>()): Finding[] {
  const all = [...closure(bom)];
  const findings: Finding[] = [];
  // One document reached as several files (two revisions, or two copies):
  // their parts are kept apart, which is rarely what the author meant.
  const filesById = new Map<string, string[]>();
  for (const b of all)
    filesById.set(b.doc.id, [...(filesById.get(b.doc.id) ?? []), b.file]);
  for (const [id, files] of filesById) {
    if (files.length > 1) {
      findings.push({
        severity: "warning",
        code: "import-conflict",
        file: bom.file,
        path: "/imports",
        message: `document ${id} is imported as ${files.length} different files (${files.join(", ")}): their parts are counted separately`,
      });
    }
  }
  for (const b of all) {
    if (done.has(b.file)) continue;
    done.add(b.file);
    findings.push(...checkBom(b));
  }
  return findings;
}
