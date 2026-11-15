// Writes the examples as JSON to generated/examples/. Run: npm run examples

import { copyFileSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { serialize } from "./lib/canonical.js";
import { EXAMPLES } from "./examples.js";
import { renderHtml } from "./lib/html.js";
import { renderDiffHtml } from "./lib/diff-html.js";
import { diff } from "./lib/diff.js";
import { loadBomFile } from "./lib/load.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(rootDir, "generated", "examples");
mkdirSync(outDir, { recursive: true });
copyFileSync(join(rootDir, "LICENSE"), join(outDir, "LICENSE"));
copyFileSync(
  join(rootDir, "THIRD_PARTY_NOTICES.md"),
  join(outDir, "THIRD_PARTY_NOTICES.md"),
);
copyFileSync(join(rootDir, "examples", "README.md"), join(outDir, "README.md"));
cpSync(join(rootDir, "examples", "LICENSES"), join(outDir, "LICENSES"), {
  recursive: true,
});
for (const [path, doc] of Object.entries(EXAMPLES)) {
  const file = join(outDir, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, serialize(doc));
  console.log(relative(process.cwd(), file));
}

// Load only after all JSON files exist so relative imports can resolve.
if (process.argv.includes("--html")) {
  for (const [path, doc] of Object.entries(EXAMPLES)) {
    if (doc.kind !== "bom") continue;
    const { bom, findings } = loadBomFile(join(outDir, path));
    if (!bom || findings.some((f) => f.severity === "error"))
      throw new Error(JSON.stringify(findings));
    const file = join(outDir, path.replace(/\.bom\.json$/, ".html"));
    writeFileSync(file, renderHtml(bom, findings));
    console.log(relative(process.cwd(), file));
  }
  const before = loadBomFile(
    join(outDir, "rover/rover-before-change.bom.json"),
  ).bom!;
  const after = loadBomFile(join(outDir, "rover/rover.bom.json")).bom!;
  const file = join(outDir, "rover/change-gorail-nut.html");
  writeFileSync(
    file,
    renderDiffHtml(before, after, diff(before.doc, after.doc)),
  );
  console.log(relative(process.cwd(), file));
}
