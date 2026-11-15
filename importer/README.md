# bomkit importer

Turns CSV and Excel tables into [bomkit](../README.md) documents, from a
reusable configuration.

The import is deterministic: the same files and configuration always give
the same document. It reads no clock, no network and no random source, and
uses no AI model. An AI can help write the configuration.

Status: **draft 0.1**, tested on the published source files of four of the
[examples](../examples/README.md).

## Run

```sh
npm run bomkit -- import <config.json> <source>... [-o <out.bom.json>] [--revision <R>]
    [--previous <old.bom.json>] [--enrich [<id>=]<file.json>]...
```

```sh
npm run bomkit -- import importer/fixtures/planktoscope/config.json \
    importer/fixtures/planktoscope/bom.csv -o planktoscope.bom.json
npm run bomkit -- buy planktoscope.bom.json --qty 10
```

The document goes to the output file, or to standard output. The report
goes to standard error: header row found, rows by role, items each
emission applied to, columns that were not read, remarks on the
configuration, findings of the [validation checks](../docs/model-reference.md#validation-checks-non-normative),
and counts of parts, usages and issues.

## Revisions

To import the next revision of a file, run the same configuration on it
with another `--revision`, and give the import of the previous revision,
with the answers it has received since:

```sh
npm run bomkit -- import config.json bom-rev-b.xlsx --revision B \
    --previous rev-a.bom.json -o rev-b.bom.json
npm run bomkit -- diff rev-a.bom.json rev-b.bom.json
```

An issue keeps its id from one revision to the next as long as it is about
the same thing: its id is a digest of what the issue is about (the part or
usage, the cell contents of the row, the rule that raised it), never of a
row number. With `--previous`, the status and answers of each issue of the
previous revision go to the issue of the same id. The report lists the
answered issues that are no longer raised.

A rule's issue is identified by its `text` expression. Before rewording the
text of an issue that has answers, give the issue a `key`, which then
identifies it instead:

```json
"issue": { "key": "undescribed-frame", "severity": "info", "text": "'…'" }
```

## How it works

```text
file ─► cells ─► header and columns ─► rows with a role ─► items ─► parts and usages ─► document
```

1. **Cells.** Every cell is read as text and trimmed. An empty cell is absent.
2. **Header.** The header row is the first row in which every required
   column is found. Headers match whatever their case and spacing.
3. **Rows.** Each row gets a role: it starts an item, continues the item
   above, sets values for the rows below, or is skipped.
4. **Items.** An item is one row and its continuations.
5. **Parts and usages.** Each item emits parts and usages. A part emitted
   by several items is one part.
6. **Document.** The result is checked against the specification types,
   then by the validation checks.

Every part and usage records the rows it came from in `provenance`.
`generator` records the tool, the configuration and its digest, and the
source files with their digests.

## Configuration

The [types](src/config.ts) are the reference. `npm run schema` writes their
JSON Schema to `generated/schema/import-config.schema.json`; it is also
attached to each [release](../docs/tooling.md). Name it in `$schema` and an
editor completes and checks the configuration as it is written. A minimal
configuration:

```json
{
  "$schema": "../generated/schema/import-config.schema.json",
  "kind": "importConfig",
  "configVersion": "0.1",
  "sources": { "bom": {} },
  "document": {
    "id": "urn:example:bom:widget",
    "products": ["widget"],
    "parts": { "widget": { "kind": "custom", "name": "Widget" } }
  },
  "tables": [
    {
      "columns": {
        "ref": ["Reference", "Designator"],
        "qty": "Qty",
        "mpn": "MPN",
        "maker": "Manufacturer"
      },
      "emit": [
        {
          "part": {
            "id": "$id(mpn)",
            "kind": "'standard'",
            "name": "mpn",
            "manufacturerParts": [
              { "manufacturer": "$org(maker)", "mpn": "mpn" }
            ]
          },
          "usage": {
            "parent": "'widget'",
            "id": "$id(ref)",
            "quantity": { "value": "$num(qty)" },
            "designators": "$designators(ref)"
          }
        }
      ]
    }
  ]
}
```

| key                | meaning                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `sources`          | the files to read, by id; each becomes a document of the BOM, with its digest                                         |
| `document`         | everything that does not come from the tables: id, products, organizations, and parts declared by hand                |
| `tables[].sheets`  | sheets to read, by name or `{ "match": "<regular expression>" }`; all by default                                      |
| `tables[].columns` | name used in expressions → accepted header texts; `{ "header": …, "optional": true }` for a column that may be absent |
| `tables[].derive`  | values computed once per row and used like columns                                                                    |
| `tables[].rows`    | the role of each row; without it, every row is an item                                                                |
| `tables[].emit`    | the parts and usages an item produces                                                                                 |

### Expressions

Values and conditions are [JSONata](https://docs.jsonata.org) expressions.
In `part`, `usage` and rules, every string is an expression: a constant is
written `"'standard'"`.

| in an expression | is                                                 |
| ---------------- | -------------------------------------------------- |
| `qty`, `mpn`     | the cell of that column, or a `derive` value       |
| `$sheet`, `$row` | sheet name and 1-based row number                  |
| `$ctx.key`       | a value set by a `section` row above               |
| `$prev.column`   | the previous non-empty row; in `rows` and `derive` |
| `$rows.column`   | the values of all rows of the item; in `emit`      |

| function                     | gives                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$id(text)`                  | a valid id: accents dropped, other characters replaced by `-`                                                                                                                                                                                                                                                       |
| `$org(name)`                 | the id of the organization with that name or alias, declared if new                                                                                                                                                                                                                                                 |
| `$num(text)`                 | a number written with a decimal point; `$num(text, ",")` reads a decimal comma                                                                                                                                                                                                                                      |
| `$quantity(text, options)`   | `{ value, unit }` from `250 mm`, `2.5m` or `7`; a unit in the cell must be a UCUM code of common atoms (`mm`, `[ft_i]`, `N.m`, `mL/min`, `%`); `options.units` maps other spellings (`{ "pcs": "1", "ft": "[ft_i]" }`), and the codes it maps to are taken as given; `options.decimal` is `","` for a decimal comma |
| `$designators(text, scheme)` | designator sets from a list; scheme `refdes` by default, with ranges expanded (`R1-R4`; `R01-R04` keeps its leading zeros)                                                                                                                                                                                          |
| `$nth(key)`                  | in `derive` only: how many rows of the sheet, this one included, gave that key so far                                                                                                                                                                                                                               |

All JSONata functions are available except `$now`, `$millis`, `$random`,
`$shuffle` and `$eval`.

A value that evaluates to nothing is left out, as are empty texts, arrays
and objects.

Two rules of JSONata surprise configuration authors:

- A path that matches once gives a value, not a list of one. Where the
  specification expects a list (`manufacturerParts`, `notes`…) and gets a
  single value, the importer puts it in a list.
- A comparison with an empty cell is false, whatever the operator:
  `type != 'Part'` is false when `type` is empty. The report warns about
  each `!=` on a cell; write `$not(type = 'Part')` if empty cells should
  match, or `$exists(type) and $not(type = 'Part')` if they should not.

### Rows and items

```json
"rows": [
    { "role": "section", "when": "type = 'Assembly'", "ctx": { "assembly": "$id(desc)" } },
    { "role": "item", "when": "type = 'Part'" },
    { "role": "continuation", "when": "$not($exists(type)) and $prev.type = 'Part'" },
    { "role": "skip", "when": "type = 'Total'" }
]
```

The first rule whose `when` holds gives the role. A row matching no rule
stops the import: add a rule for it, or a last rule `{ "role": "skip" }`.

### Rules and corrections

An emission has `rules`, applied in order when their `when` holds. A rule
replaces values of the part or usage, raises a review issue, or both:

```json
"rules": [
    { "when": "$contains(note, /DNP|not fitted/i)", "usage": { "fitted": "false" } },
    { "when": "pn = '84985A46'", "part": { "supplierParts": "[]" },
      "issue": { "severity": "warning", "category": "ambiguous", "text": "'CAD stand-in; do not buy.'" } }
]
```

Corrections belong here, not in the output file: they are applied again
when the next revision is imported.

Parts declared in `document.parts` take precedence over emitted values.
Each emitted value they hide is raised as an `info` issue, identified by
that value: when the source changes it, a new issue opens, even if the
previous one was answered.

## Enrichment

Properties, documents and curated names that the tables cannot give can be
kept apart from the configuration, in an enrichment file
([schema](../generated/schema/import-enrichment.schema.json)):

```json
{
  "$schema": "../generated/schema/import-enrichment.schema.json",
  "kind": "importEnrichment",
  "configVersion": "0.1",
  "parts": {
    "RC0603-10K": {
      "name": "Resistor 10k 1% 0603",
      "properties": { "resistance": { "value": 10, "unit": "kOhm" } }
    }
  }
}
```

```sh
npm run bomkit -- import config.json bom.csv --enrich curation.json
```

Each key is the id of an imported part. Values replace the imported ones,
objects being merged key by key; each imported value they hide is raised
as an `info` issue, as for `document.parts`. A part that the import no
longer produces is reported, and its values are not used. The enrichment
file becomes a document of the BOM, with its digest, like the sources. Its
id is the file name (`curation`), with `-2`, `-3`… if a source or document
already has it; `--enrich <id>=<file>` gives one instead.

Set `"shared": true` on an emission whose usage is repeated by several
items with the same content, such as an assembly named on each of its rows.

## What stops the import, and what becomes an issue

The importer never guesses. A mismatch between the configuration and the
file stops it, and nothing is written. A problem with one row costs that
row, and is recorded as a review issue in the document.

| situation                                                            | result                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| a name in an expression is not a declared column                     | error when the configuration is loaded                      |
| a required column is not in the file                                 | error, naming the column and the closest row                |
| a row matches no row rule                                            | error, naming the row                                       |
| a usage is emitted in a part that does not exist                     | error                                                       |
| a number or designator list is not understood                        | value left out; `warning` issue                             |
| a part or usage lacks a required value, or has an invalid one        | not imported; `error` issue                                 |
| an expression fails on a row (`derive` or emission)                  | that row's item not imported; `error` issue                 |
| two rows give the same usage id                                      | both kept, the second as `<id>:2`; `error` issue            |
| a part is emitted twice with different values                        | first value kept; `warning` issue of category `conflict`    |
| a column of the file is read by no configuration column              | listed in the report                                        |
| a value of `document.parts` or of an enrichment hides an emitted one | the hand value is kept; `info` issue of category `conflict` |
| an enrichment names a part the import does not produce               | its values are not used; listed in the report               |
| an expression compares a cell with `!=`                              | listed in the report                                        |

An `error` issue blocks use of the BOM until it is resolved, by a rule or
by a corrected source.

## Stable ids

Revisions can be compared only if ids are stable. Derive them from what
identifies the thing in the source: part number, manufacturer part number,
designator, find number. Never use `$row` for an id or in a correction: a
row inserted above moves every row below. When rows are told apart only by
their order, use `$nth`, which counts among the rows of the same key only,
and check what can be checked. The OreSat configuration reads three rows
numbered `1.5U_Frame` without a description, as Y, +X and -X by their order
among themselves and their quantity (2, 1, 1):

```json
"frame": "$contains(pn, /_Frame$/) ? (desc ? desc : $lookup({ '1/2': 'Y Frame', '2/1': '+X Frame', '3/1': '-X Frame' }, $string($nth(pn)) & '/' & qty))"
```

A fourth such row, or other quantities, match nothing: the row keeps its
plain id and the import reports it.

## Limits

- Files: `.csv`, `.tsv` (UTF-8) and `.xlsx`. No `.xls`.
- Excel numbers are read as plain numbers: number formats are not applied,
  so leading zeros shown by a format are lost. Merged cells are not filled.
- Provenance records rows, not columns.
- `$num` and `$quantity` read plain numbers: no thousands separators.
- Characteristics in free text (`10k 1% 0603`) are not interpreted.
- A row cannot look at the rows below it.
- Imports of other BOM documents (`document.imports`) are carried but not checked.
- Speed: about 20,000 rows per second for a table with four columns and one
  rule (`npx ttsx importer/bench/bench.ts 20000`).

## Tests

`npm test` imports the [fixtures](fixtures/README.md) and compares each
result with the expected document kept next to it, and with the
hand-written example on what both state: structure, quantities,
designators and source rows. `UPDATE_EXPECTED=1 npm test` rewrites the
expected documents.
