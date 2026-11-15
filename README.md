# bomkit

> [!WARNING]
> **Work in progress.** bomkit is an early draft (0.1). The data model,
> schemas, file format and tools will change without notice and without
> backward compatibility. Do not rely on it for production data yet.

An open data model for **manufacturing bills of materials**.

Specification: **draft 0.1**.

The model describes what a product contains, how its parts are identified,
which documents define them, and how they are assembled.

The same model covers a circuit board, an electrical cabinet or a machine.
Use it to turn spreadsheets and design exports into data you can validate,
buy from and compare across revisions. Small products fit in one file;
large products can be split across files owned and revised independently.

The [TypeScript types](src/) define the specification. JSON Schemas and
validators are generated from them. bomkit is designed for exchange with
PLM and ECAD formats; see [Interoperability](#interoperability).
Detailed rules are in the [model reference](docs/model-reference.md).

## Use cases

These are the workflows we want to support with bomkit. The repository
currently provides the model, validation, buying BOMs, revision diffs and a
draft [configurable importer](importer/README.md) for CSV and Excel tables;
quotation tools and a web GUI add-on are applications to build on top of them.

### Import customer BOMs and track updates

An integrator or electronics manufacturing services (EMS) provider receives
a customer's spreadsheet for an initial quote. A tabular importer uses a
reusable configuration to describe the table's structure and mapping rules,
including complex conditions. It normalizes the data into bomkit; a
procurement view provides the quantities and sourcing information for costing.

Two weeks later, the customer sends additional specifications and updated
BOMs. Reuse the same import configuration, link the new specifications and
compare revisions to see what changed. The goal is to get that diff in
seconds, without repeating the manual cleanup.

AI helps write the import configuration. The import itself runs
deterministically, without an AI model, so the same sources and configuration
produce the same BOM.

### Clean and consolidate BOMs

Replace inconsistent column names, free-text characteristics and mixed units
with shared property names, types and units based on standards and trade
profiles. Missing or ambiguous values become review issues.

For products split across files from several engineering offices, consolidate
the BOMs and resolve inconsistent references while preserving each source's
ownership, revisions and provenance.

### Explore and understand a product

A future web GUI add-on would let users navigate from a product to its
sub-assemblies and parts, inspect quantities and properties, and open linked
drawings or specifications. The goal is to make the product's structure easy
to understand, even when its BOM spans many files.

### Prepare subcontracting quotes and offers

Use the consolidated BOM, procurement demand and subcontracting rules to
prepare quotes and commercial offers for full or partial subcontracting.
Identify what the customer supplies, what the subcontractor must buy, and
which assemblies or assembly tasks belong in the quoted scope. Pricing and
offer preparation happen in tools built around the model.

This list is a starting point; more use cases will be added as they emerge.

## Interoperability

Importers and exporters are planned so bomkit can fit into existing customer,
engineering and manufacturing workflows. The repository currently reads and
writes bomkit JSON and [imports CSV and Excel tables](importer/README.md);
the other converters are not implemented yet.

| format           | intended exchange                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| CSV / Excel      | configurable import of customer tables and ECAD BOM exports; export BOMs and procurement views for quoting and purchasing |
| STEP AP242       | exchange product structure and revision data with CAD/PLM systems                                                         |
| IPC-2581 / ODB++ | exchange the BOM-related data in PCB manufacturing packages                                                               |
| CycloneDX        | map relevant component identity and sourcing data to supply-chain inventories                                             |

The standardized formats above are candidate integration targets. Each
converter will need an explicit mapping and reports for unsupported data;
conversion may preserve only part of a format's content. See the
[standards comparison and indicative mappings](docs/standards.md).

## Core concepts

A **part** defines what something is. A **usage** says how much of that part
an assembly contains, and at which positions.

For example, 40 identical resistors share one part definition. A usage can
group several positions (`R1`, `R2`, …), or each position can have its own
usage. The same part or sub-assembly can belong to several products: the
structure is a graph.

```text
BomDocument                         one revision of a BOM
├── products                        end items described by this file
├── parts                           part definitions, keyed by stable id
│   └── Part
│       ├── kind                    standard | custom | material | software
│       ├── identifiers             part numbers and revisions
│       ├── manufacturerParts       manufacturer part numbers (MPNs)
│       ├── supplierParts           supplier catalog references
│       ├── properties              dimensions, ratings, trade characteristics
│       ├── documents               links to drawings, datasheets, CAD…
│       ├── usages                  parts contained, quantities and positions
│       └── steps                   assembly instructions referencing usages
├── documents                       referenced files, never embedded
├── organizations                   owners, customers, manufacturers, suppliers
├── options                         configuration choices
├── imports                         references to other BOM files
├── issues                          review questions and answers
└── extensions                      optional modules and private data
```

## Parts and sourcing

All parts use the same type. Their `kind` describes how they are identified
and procured:

| kind       | identity                                                    | procurement                                   |
| ---------- | ----------------------------------------------------------- | --------------------------------------------- |
| `standard` | MPN, supplier reference, standard designation or properties | buy a matching approved item                  |
| `custom`   | owner's part number, revision and documents                 | make it, or request a quote                   |
| `material` | material specification or MPN; a non-piece unit             | buy by length, area, mass or volume           |
| `software` | name, version and optionally binary hash                    | load it onto a part; excluded from purchasing |

A standard designation such as `ISO 4762 M3x10` can identify a fastener
without naming a manufacturer. A generic component such as a capacitor can
be specified by properties, provided they include everything needed to buy
it: value, tolerance, rating and package.

A `standard` part without any usable identity is allowed so incomplete
source data can be preserved. Tools report it, and the buying BOM puts it
in `unresolved`. Importers leave missing values out and add a warning
rather than guessing.

A part with usages is an **assembly**, whatever its kind:

- normally, its contents are expanded when calculating purchases;
- `makeOrBuy: "buy"` means buy the assembly as a whole;
- `phantom: true` means a grouping that is always expanded, never built or stocked.

Supplier references can have a `packSize`: usages count units of the part,
and purchasing rounds up to whole packs. Manufacturer references may carry
a lifecycle snapshot (`active`, `nrnd`, `lastTimeBuy`, `obsolete`).

### Properties and units

Property names are shared so tools can recognize the same characteristics.
Use the first applicable vocabulary:

| vocabulary    | examples                                      | definition                                                                                                             |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| core          | dimensions, mass, ratings, temperature, color | [Core properties](src/properties.ts)                                                                                   |
| trade profile | resistance, poles, cable cross-section        | [Electronics](src/profiles/electronics.ts), [electrical](src/profiles/electrical.ts), [wiring](src/profiles/wiring.ts) |
| dictionary    | `iec61360:AAE525`, `etim:EF000008`            | IEC 61360-4, IEC 62683, ETIM or ECLASS                                                                                 |
| private       | `x-drive`, `x-ratedVoltage`                   | data other tools need not understand                                                                                   |

A characteristic with a core or profile key MUST use that key. Other names
must be dictionary keys or start with `x-`. Dictionary support carries
references and values; it does not supply the dictionaries or grant rights
to their contents.

Measures carry a value and unit, with optional tolerance:

```json
{ "value": 22, "unit": "pF", "tolerance": { "percent": 5 } }
```

Ranges use `{ min, max, unit }` with at least one bound. Units follow
case-sensitive UCUM codes (`mm`, `pF`, `Cel`, ASCII `u` for micro).
Core and profile measures accept only the [supported units](src/units.ts)
for their dimension: capacitance accepts `pF`, not `V`. Dictionary and
private values can preserve representations outside that typed subset.

See the [property rules](docs/model-reference.md#parts) for the full
vocabulary and the [standards mappings](docs/standards.md) for its sources.

## Usages: quantities and positions

A usage connects an assembly to a part. It carries the quantity, positions,
possible alternates and conditions for including it.

| `quantity.basis`    | meaning                                                   | example                 |
| ------------------- | --------------------------------------------------------- | ----------------------- |
| `perUnit` (default) | multiplied by parent quantities                           | four screws per bracket |
| `perLot`            | needed once per production lot                            | a stencil or fixture    |
| `asRequired`        | quantity is unspecified; an optional value is an estimate | glue or solder          |

The unit defaults to the part's unit, then to `"1"` (pieces). Compatible
units are converted before summing: `250 mm` of wire can be added to `2 m`.
Incompatible units are an error.

Quantities describe what the product contains. Manufacturing losses belong
in the part's `scrap` allowance: a proportional `rate` and/or a fixed
`perLot` loss.

**Designators** name positions using a scheme: `refdes` (`R12`), `iec81346`
(`=A1+K2-Q3`), `tag`, `cable`, `findNumber` or `position`. Electronic `refdes`
counts must match discrete per-unit quantities. Other schemes may give
several names to one device. Sets can specify board `side` (`top`, `bottom`).
Designators are unique within a parent and scheme, except for mutually
exclusive usages.

### Alternates and variants

Three mechanisms express different choices:

| mechanism                             | what changes                                              | example                          |
| ------------------------------------- | --------------------------------------------------------- | -------------------------------- |
| `manufacturerParts` / `supplierParts` | source of the same part, wherever used                    | Yageo or Vishay resistor         |
| `Usage.alternates`                    | replacement at one usage, with its own quantity if needed | one nut replaced by three others |
| `options` + `applicability`           | product configuration                                     | DIP or SMD microcontroller       |

Source references use `preferred`, `approved` or `notApproved`; list order
has no meaning. A usage's `part` remains the default choice for calculations.

`applicability` combines option values, product serial ranges, lots and build
dates with `all`, `any` and `not`. Use `fitted: false` for a simple “do not
place”. Documents without variants can omit these fields.

A consumer that cannot evaluate a condition MUST report it and MUST NOT
silently include or exclude the usage. Buying BOMs put these cases in
`unresolved`. Serial conditions always refer to the product being built.

## Identity and revisions

Stable ids make revisions comparable:

- keep a `PartId` while the part remains interchangeable (same form, fit and
  function); a non-interchangeable replacement gets a new id;
- keep a `UsageId` within its parent; derive ids from natural keys, never
  source row numbers or line order;
- when ids cannot be kept stable, record explicit `identityMatches` in the
  change set, including how the match was established and confirmed.

Part numbers record their issuing organization, value and revision, so one
part can carry customer, owner and subcontractor identifiers.

Each BOM document is **one revision**. Revisions share a document `id` and
have a status: `draft`, `released` or `obsolete`. A released revision is
frozen; changes create a new revision. `approvals` record sign-offs.

A change set can specify when a new revision takes effect. Select the
revision first, then evaluate applicability within it. Revision cut-over
conditions do not need to be copied into every usage.

## Documents, review and assembly

Drawings, datasheets, CAD and other files are linked by `uri` and/or
`sha256`. A folder or zip can package a `.bom.json` file with its relative
references. URL references SHOULD include a digest so they remain verifiable.

`generator` records the import tool, mapping configuration and source
files. `provenance` links parts and usages to source rows, pages or CAD
elements so imported data can be checked.

`issues` track questions that need an answer, with subjects, severity,
category, status and answers. An `error` blocks use, a `warning` needs an
answer, and `info` records an assumption to confirm. Notes only state facts.

Assembly `steps` run in order. Each lists the usages it installs, with
instructions, documents and tools.

## Multi-file BOMs and extensions

`imports` assigns aliases to other BOMs. Reference its parts as
`"alias#partId"`, or `"a#b#partId"` through nested imports. Each file keeps
its own ids, ownership and revisions.

Imported organizations can be referenced as `"alias#orgId"`. Import bindings
set the imported document's options to fixed values or forward local
options; unbound options use their defaults.

`extensions` holds specification modules and private `x-` data. The
[`subcontract` module](src/modules/subcontract.ts) covers customer and
subcontractor, turnkey or consigned supply, and substitution policy.

`requires` lists modules that affect interpretation. Consumers MUST reject
a document requiring a module they do not support.

## Derived views

Derived views are computed from the BOM, rather than edited by hand.

### Buying BOM

A [BuyingBom](src/views.ts) lists what to procure for a build quantity and
configuration. It filters usages, expands made assemblies, merges demand
for the same part, then adds scrap and rounds supplier quantities to packs.
It keeps occurrence paths so each demand can be traced back to the assembly.

```text
needed = quantityPerUnit × buildQuantity + quantityPerLot
totalQuantity = needed + scrapQuantity
packs = ceil(totalQuantity / packSize)
```

Software is excluded. `asRequired` items are flagged without adding a
quantity. Missing identities, unevaluable conditions and incompatible units
go in `unresolved`. See the [full calculation rules](docs/model-reference.md#buying-bom).

### Change set

A [ChangeSet](src/changes.ts) records added, removed, modified or moved parts
and usages, plus changes to document fields. It can carry an engineering
change reference, reason, status and effectivity.

Comparison uses stable ids and content. Provenance, release metadata and
review issues are ignored; unordered lists are compared as sets. Imported
files have their own change sets: changing an import's revision appears as
an import field change. See the [comparison rules](docs/model-reference.md#change-set).

## Quick start

Tested with Node 26 and TypeScript 7. Install dependencies, export the
examples, then validate a BOM or calculate purchases:

```sh
npm install
npm run examples
npm run bomkit -- validate generated/examples/pcba.bom.json
npm run bomkit -- buy generated/examples/pcba.bom.json --qty 100 --option mcu=DIP
npm run bomkit -- diff old.bom.json new.bom.json
npm run bomkit -- import importer/fixtures/planktoscope/config.json importer/fixtures/planktoscope/bom.csv
```

| command                 | purpose                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run check`         | type-check the model, examples and tools                                                                           |
| `npm run schema`        | generate JSON Schemas in `generated/schema/`, including those of the importer's configuration and enrichment files |
| `npm run examples`      | export JSON examples to `generated/examples/`                                                                      |
| `npm run examples:html` | export JSON examples and standalone HTML viewers to `generated/examples/`                                          |
| `npm test`              | validate examples with typia, JSON Schema and semantic checks; test tools and the importer                         |

To browse the examples, run `npm run examples:html` and open
`generated/examples/pcba.html` or `generated/examples/rover/rover.html` in a browser.
Export any BOM with:

```sh
npm run bomkit -- html generated/examples/pcba.bom.json --output generated/pcba.html
```

The HTML is one self-contained file with no JavaScript or network dependencies.
Switch between **Manufacturing BOM**, a multi-level tree with clickable
subassemblies (including imported parts), and **Purchasing BOM**, a flat list
with merged quantities, scrap and pack counts. The manufacturing view shows all
variants and not-fitted usages with their per-parent quantities; purchasing
uses the selected configuration and option defaults, and flags unresolved items.
Dark mode follows your system setting; System, Light and Dark controls override it.

The HTML command accepts the same `--product`, `--qty`, `--option`, `--serial`,
`--lot` and `--date` flags as `buy`, so you can export a purchasing list for a
specific build, for example:

```sh
npm run bomkit -- html generated/examples/pcba.bom.json --qty 100 --option mcu=DIP --output generated/pcba-100.html
```

Without `--output`, HTML goes to
stdout (use `npm run --silent bomkit -- html <file>` when redirecting).

Compare two BOMs as a standalone HTML report with before/after values:

```sh
npm run bomkit -- diff old.bom.json new.bom.json --html diff.html
```

This uses the same comparison as the JSON diff, including `--matches` for
renamed IDs. It shows additions, removals, field changes and moved usages.
Imported documents are compared by their references, without recursively
comparing their contents. `npm run examples:html` also generates
`generated/examples/rover/change-gorail-nut.html` using a reconstructed earlier BOM.

Files use UTF-8 JSON: `.bom.json` for BOMs and `.change.json` for change sets.
Producers SHOULD use stable key order and sort parts by id. Unknown fields
are rejected outside the defined property and extension mechanisms.

Validation checks structure and semantics, including references, cycles,
units, designators, options and release readiness. See the
[full checks](docs/model-reference.md#validation-checks-non-normative).

Generated files are not committed. Tagged releases provide schemas and
exported examples for consumers who do not use TypeScript. See
[tooling and releases](docs/tooling.md) for CLI options and release details.

## Examples

These examples adapt real published project data; see their
[source notes and licences](examples/README.md) for scope and illustrative additions.

| example                                             | demonstrates                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Arduino Uno Rev3](examples/pcba.ts)                | PCB components, sourcing and variants                                         |
| [Machine cabinet](examples/machine-cabinet.ts)      | electrical equipment from QElectroTech                                        |
| [OreSat CubeSat frames](examples/cubesat-frames.ts) | mechanical parts from a spreadsheet                                           |
| [PlanktoScope](examples/planktoscope.ts)            | an instrument with DIN/ISO fasteners                                          |
| [NASA JPL Open Source Rover](examples/rover/)       | a multi-file BOM and a [revision change](examples/rover/change-gorail-nut.ts) |

The examples do not include published production data for serial or lot effectivity.

## Scope and open questions

The core covers product structure, sourcing identity, quantities,
configuration, documents, basic assembly instructions and revision changes.
Prices, live stock, supplier offers, detailed routings, geometry and
regulatory declarations are outside scope for now.

Open questions:

- Should options support incompatibility constraints?
- How should ranges compare non-numeric serial numbers?
- Should effectivity also refer to another item's serial, such as an aircraft engine?

## License

Original bomkit contributions to the specification, documentation, types,
generated schemas and reference tools use the [MIT licence](LICENSE).
ETIM-derived content in the electrical and wiring profiles, their documented
mappings and generated schemas retains its third-party terms; see
[third-party notices](THIRD_PARTY_NOTICES.md). Generated schema and example
directories include a copy of these notices.

Third-party examples retain their [own licences and attributions](examples/README.md),
including generated JSON. Exports include the relevant notices and licence texts.
Your BOM data, designs and linked documents keep their owners' licences.
