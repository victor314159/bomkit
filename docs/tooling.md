# Tooling and releases

Build, validation and release details. See the [quick start](../README.md#quick-start).

## Tooling

Tested with Node 26 and TypeScript 7. The reference tool lives in [`tools/`](../tools/) and runs
with [`ttsx`](https://ttsc.dev), as typia needs its compiler plugin.

| command                                                                             | does                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                     | type-checks the types, the examples and the tool                                                                                                                       |
| `npm run schema`                                                                    | writes the JSON Schemas to `generated/schema/` (not versioned)                                                                                                         |
| `npm run examples`                                                                  | writes the examples as `.bom.json` / `.change.json` to `generated/examples/` (not versioned)                                                                           |
| `npm run examples:html`                                                             | also writes a standalone `.html` viewer beside each BOM example; open directly in a browser                                                                            |
| `npm test`                                                                          | exports the examples to a temporary folder, checks that they pass typia, the JSON Schema (with ajv, independently) and the semantic checks, and tests the tool         |
| `npm run bomkit -- validate <file>...`                                              | structure (typia) and [validation checks](model-reference.md#validation-checks-non-normative), imports included                                                        |
| `npm run bomkit -- html <file> --output bom.html`                                   | self-contained expandable manufacturing tree and flat purchasing view, with dark mode; accepts the same build/configuration flags as `buy`; omit `--output` for stdout |
| `npm run bomkit -- buy generated/examples/pcba.bom.json --qty 100 --option mcu=DIP` | [buying BOM](model-reference.md#buying-bom); also `--product`, `--serial`, `--lot`, `--date`                                                                           |
| `npm run bomkit -- import <config> <source>...`                                     | [imports CSV and Excel tables](../importer/README.md) with a configuration; `-o <file>`, `--revision <R>`, `--previous <old.bom.json>`, `--enrich [<id>=]<file>`       |
| `npm run bomkit -- diff <old> <new>`                                                | [change set](model-reference.md#change-set) between two revisions; `--matches <file>` gives identity matches as a JSON array                                           |
| `npm run bomkit -- diff <old> <new> --html diff.html`                               | compact before/after HTML report, with dark mode; supports `--matches`                                                                                                 |

`buy` and `diff` refuse what they cannot interpret (unknown flag, option
value that does not exist, build quantity that is not a whole number) rather
than computing something else, and check their own output against its schema
before writing it.

### Releases

The types in `src/` are the only source. Nothing generated is committed.
Automated releases are not set up yet; until they are, generate the JSON
Schemas and the example files locally:

```
npm run schema
npm run examples
```

The output goes to `generated/`. Release versions will start with
`SPEC_VERSION` (`0.1.x` releases all describe specification `0.1`).

Distribute the generated schema and example directories with their
`LICENSE` and `THIRD_PARTY_NOTICES.md` files. Example exports also include
their source notes and third-party licence texts; keep those alongside them.

Typia's runtime validators check everything; the JSON Schema checks all but
what it cannot express. The generator adds two fix-ups for what typia does
not emit (`x-` extension keys, keys of id maps); see
[`tools/lib/schemas.ts`](../tools/lib/schemas.ts).
