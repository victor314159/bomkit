// Writes the JSON Schemas to generated/schema/. Run: npm run schema

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchemas } from "./lib/schemas.js";

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "generated",
  "schema",
);
mkdirSync(outDir, { recursive: true });
copyFileSync(join(outDir, "..", "..", "LICENSE"), join(outDir, "LICENSE"));
for (const [file, schema] of Object.entries(buildSchemas())) {
  writeFileSync(join(outDir, file), JSON.stringify(schema, null, 2) + "\n");
  console.log("generated/schema/" + file);
}
