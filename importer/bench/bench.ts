// Times an import of a generated table. Run: npx ttsx importer/bench/bench.ts [rows]
import { parseConfig, runImport } from "../src/import.js";

const n = Number(process.argv[2] ?? 5000);
const lines = ["Ref,Qty,MPN,Maker,Description"];
for (let i = 1; i <= n; i++)
  lines.push(
    `R${i},${(i % 7) + 1},MPN-${i % 900},Maker ${i % 40},Resistor ${i % 900}`,
  );
const config = parseConfig({
  kind: "importConfig",
  configVersion: "0.1",
  sources: { src: {} },
  document: {
    id: "urn:bench",
    products: ["top"],
    parts: { top: { kind: "custom", name: "Top" } },
  },
  tables: [
    {
      columns: {
        ref: "Ref",
        qty: "Qty",
        mpn: "MPN",
        maker: "Maker",
        desc: "Description",
      },
      emit: [
        {
          part: {
            id: "$id(mpn)",
            kind: "'standard'",
            name: "desc",
            manufacturerParts: [{ manufacturer: "$org(maker)", mpn: "mpn" }],
          },
          usage: {
            parent: "'top'",
            id: "$id(ref)",
            quantity: { value: "$num(qty)" },
            designators: "$designators(ref)",
          },
          rules: [
            { when: "$contains(desc, /DNP/)", usage: { fitted: "false" } },
          ],
        },
      ],
    },
  ],
});
const bytes = new TextEncoder().encode(lines.join("\n"));
const t0 = performance.now();
const r = await runImport(config, [{ id: "src", file: "bench.csv", bytes }]);
const t1 = performance.now();
console.log(
  `${n} rows: ${(t1 - t0).toFixed(0)} ms; ${Object.keys(r.doc?.parts ?? {}).length} parts; ${r.findings.length} findings`,
);
