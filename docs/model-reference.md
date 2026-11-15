# Model reference

Detailed rules for the bomkit model. Start with the [overview](../README.md).

## Parts

All parts share one type. The only distinction is `kind`, because it
changes how the part is identified and procured:

| kind       | identified by                                                                                                                  | procured                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `standard` | manufacturer + MPN (several approved MPNs are alternates), supplier catalog number, or structured properties for generic parts | bought by MPN or catalog number, or as any part meeting the properties |
| `custom`   | owner's part number + revision + documents                                                                                     | made, or quoted by a supplier against its documents                    |
| `material` | material spec or MPN; has a non-piece `unit`                                                                                   | bought in bulk, rounded to purchasable packs                           |
| `software` | name + version (+ binary hash)                                                                                                 | not bought; loaded onto a part                                         |

Designs often specify passives and connectors by value and package only
("22p 0603"). Such a generic `standard` part is identified by its
`properties`, which must then hold everything a buyer needs: value,
tolerance, rating, package.

Since properties are an identity, their keys are not free text: two tools
must describe the same resistor the same way. No single dictionary covers
every trade, so the authority depends on what the part is:

| trade                                                  | what identifies a part                             | authority                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| electronic and electromechanical components            | value, package, ratings                            | IEC 61360-4 (IEC Common Data Dictionary); JEDEC and EIA for package names, J-STD-020 for moisture sensitivity |
| electrical equipment (breakers, contactors, terminals) | manufacturer part number, else characteristics     | ETIM, ECLASS, IEC 62683                                                                                       |
| wires and cables                                       | cross-section, cores, construction                 | ETIM for keys; IEC 60228 for nominal sections, IEC 60757 for colour designations                              |
| fasteners and standard hardware                        | the standard designation itself (`ISO 4762 M3x10`) | an identifier of type `standard`                                                                              |
| raw material                                           | the grade (`EN AW-6061`)                           | `material`                                                                                                    |
| parts made to a drawing                                | part number, revision, documents                   | the drawing                                                                                                   |

The core therefore defines how a characteristic is written and how it is
named, and leaves the vocabulary of each trade to a profile. A key of
`properties` is one of four kinds:

**1. Core keys** ([`CoreProperties`](../src/properties.ts)), which mean the
same for a resistor, a contactor, a cable and a bracket:

| key                                                  | value                                     | example                              |
| ---------------------------------------------------- | ----------------------------------------- | ------------------------------------ |
| `length`, `width`, `height`, `diameter`, `thickness` | measure (a length)                        | `{ value: 2.54, unit: "mm" }`        |
| `mass`                                               | measure (a mass), of one unit of the part | `{ value: 25, unit: "g" }`           |
| `ratedVoltage`, `ratedCurrent`, `ratedPower`         | measure (`V`, `A`, `W` or `V.A`)          | `{ value: 16, unit: "V" }`           |
| `operatingTemperature`                               | range (`Cel`)                             | `{ min: -40, max: 85, unit: "Cel" }` |
| `color`                                              | text                                      | `"yellow"`                           |

Dimensions and mass are the quantities of ISO 80000-3 and ISO 80000-4.
Geometry itself (shape, placement) stays in the MCAD and ECAD files.

**2. Profile keys**, the short vocabulary of one trade. All profiles have
the same standing.

_Electronics_ ([`ElectronicsProperties`](../src/profiles/electronics.ts)), for
generic electronic and electromechanical components, each key a property of
IEC 61360-4 (see the [correspondence](standards.md#properties-and-iec-61360-4)):

| key                                                    | value                                                     | example                                                |
| ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------ |
| `resistance`, `capacitance`, `inductance`, `frequency` | measure (`Ohm`, `F`, `H`, `Hz`)                           | `{ value: 22, unit: "pF", tolerance: { percent: 5 } }` |
| `pitch`                                                | measure (a length)                                        | `{ value: 2.54, unit: "mm" }`                          |
| `pins`                                                 | whole number                                              | `8`                                                    |
| `mounting`                                             | IEC 61360-4 mounting method, value list `ASA214`          | `"surfaceMounted"`                                     |
| `package`                                              | text, standard or manufacturer package code               | `"0603"`                                               |
| `dielectric`                                           | IEC 61360-4 ceramic dielectric class, value list `ASA035` | `"CL2"`                                                |
| `msl`                                                  | IPC/JEDEC J-STD-020 level, represented as text            | `"3"`                                                  |

_Electrical_ ([`ElectricalProperties`](../src/profiles/electrical.ts)), for
breakers, contactors, relays, terminal blocks and control transformers.
Keys map to ETIM features (see the [correspondence](standards.md#properties-and-etim-electrical)):

| key                                                                    | value                                                                                  | example                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------- |
| `poles`                                                                | positive whole number; total for MCBs, otherwise the class-specific ETIM pole count    | `3`                                 |
| `curve`                                                                | ETIM 10.0 release characteristic (`EF000889`)                                          | `"D"`                               |
| `fuseSize`                                                             | ETIM 10.0 compatible fuse designation (`EF008316`)                                     | `"10x38 mm"`                        |
| `secondaryVoltage`                                                     | range (`V`), first secondary                                                           | `{ min: 24, max: 24, unit: "V" }`   |
| `normallyOpenContacts`, `normallyClosedContacts`, `changeoverContacts` | non-negative whole number; main contacts for contactors, switching contacts for relays | `2`                                 |
| `auxiliaryNormallyOpenContacts`, `auxiliaryNormallyClosedContacts`     | non-negative whole number, separate auxiliary contacts                                 | `1`                                 |
| `levels`                                                               | positive whole number, terminal block levels                                           | `2`                                 |
| `solidConductorCrossSection`                                           | range (area), connectable solid-core conductor                                         | `{ min: 0.2, max: 6, unit: "mm2" }` |

NO, NC and change-over counts are separate: a change-over contact is not
also counted as one NO and one NC. A fixed secondary voltage is a range
with equal bounds. Additional secondaries use dictionary keys; the core
`ratedVoltage` carries the part's rated voltage, not its secondary rating.

_Wiring_ ([`WiringProperties`](../src/profiles/wiring.ts)), for wires and cables,
with ETIM keys (see the [correspondence](standards.md#properties-and-etim-wiring)):

| key                                    | value                                                         | example                           |
| -------------------------------------- | ------------------------------------------------------------- | --------------------------------- |
| `cores`                                | positive whole number, including protective conductor         | `4`                               |
| `crossSection`                         | measure (area), nominal section of one conductor              | `{ value: 1.5, unit: "mm2" }`     |
| `protectiveEarth`                      | boolean, protective conductor present                         | `true`                            |
| `conductorClass`                       | IEC 60228 conductor class, mapped by ETIM `EF001632`          | `5`                               |
| `conductorMaterial`                    | ETIM conductor material (`EF001622`)                          | `"Copper"`                        |
| `insulationMaterial`, `sheathMaterial` | ETIM core insulation and outer sheath materials, respectively | `"Polyvinyl chloride (PVC)"`      |
| `coreIdentification`                   | ETIM identification method (`EF000067`)                       | `"Numbers"`                       |
| `shielded`                             | boolean, screen present                                       | `true`                            |
| `conductorResistance`                  | measure (resistance per length), at 20 °C                     | `{ value: 12.1, unit: "Ohm/km" }` |

`crossSection` is a nominal electrical section, not a measured geometric
area. IEC 60228 specifies nominal metric conductor sizes; the validator
checks the area unit, without claiming conformity to a cable standard.
`coreIdentification` describes the identification method, not the colours.
Use the existing core `color` for an IEC 60757 colour designation where
applicable, including combinations (see the [references](standards.md#properties-and-etim-wiring)).
The source must specify the colours: neither core count nor the presence
of protective earth determines the full colour assignment.
Outer dimensions, mass, colour, ratings and operating temperature use the
core keys in both profiles. No trade-specific mounting key is introduced:
the electronics `mounting` list does not describe DIN rails.

A characteristic that has a core or profile key MUST use it. Measures and
ranges of these properties constrain their units by dimension at all three
levels: TypeScript, typia validation and JSON Schema. For example,
`capacitance` uses `Measure<CapacitanceUnit>`: `pF` is accepted, `V` is
rejected. The corresponding range type is `Range<VoltageUnit>` for
`secondaryVoltage`.

Units follow the case-sensitive codes and decimal prefixes of
[UCUM 2.2, Table 1](https://ucum.org/ucum). The supported subset is defined
in [`src/units.ts`](../src/units.ts), shared by the types and conversions.
Prefix spelling, case and composition follow that edition; for example,
micro is encoded as ASCII `u`. Operating temperature uses `Cel`, as
specified by the core.

Other UCUM expressions are outside this typed subset. Unparameterized
`Measure` and `Range`, quantity/part units, dictionary keys and `x-` values
retain their extensible unit strings; importers can preserve unsupported
representations there. A measure is
`{ value, unit, tolerance? }`; a tolerance is relative,
`{ percent: 5 }` or `{ percent: { plus: 80, minus: 20 } }`, or absolute, in
the unit of the value, `{ absolute: 0.1 }`. A range is `{ min?, max?, unit }`
with at least one bound.

**3. Keys of a dictionary**, written `<dictionary>:<code>`, for what the
trade of the part defines and no profile does. The dictionary is the
authority on the meaning, type and unit; bomkit only carries the value.

| dictionary | for                                               | key                |
| ---------- | ------------------------------------------------- | ------------------ |
| `iec61360` | IEC 61360-4, electric and electronic components   | `iec61360:AAE525`  |
| `iec62683` | IEC 62683, low-voltage switchgear and controlgear | `iec62683:ACE444`  |
| `etim`     | ETIM features, electrotechnical products          | `etim:EF000008`    |
| `eclass`   | ECLASS properties                                 | `eclass:02-AAO715` |

**4. Private keys**, starting with `x-`, for what no dictionary defines
(`"x-drive": "hex socket"`) and for values that do not fit the defined type
(`"x-ratedVoltage": "see drawing"`). They are not understood by other tools.

Other keys are an error. Values of dictionary and private keys are a string, number,
boolean, measure or range.

When the source does not give a value the buyer needs, the importer leaves
it out and adds a `warning` note instead of guessing.

A manufacturer part may carry its `lifecycle` as known when the document was
issued: `active`, `nrnd` (not recommended for new designs), `lastTimeBuy`,
`obsolete`. It is a snapshot; tools that track availability live may override
it.

Some suppliers sell items under their own catalog number (McMaster-Carr,
Misumi, RS…): these go in `supplierParts`, which identify a part as well as
manufacturer part numbers do. Items sold in packs or bars carry a `packSize`
(25 for a 25-pack of screws): usage quantities always count pieces, and the
buying BOM rounds up to whole packs. Fasteners and other standard hardware are often
identified by a standard instead (ISO 4762 M3x10, NAS6604-12, ABS0365-08): an
identifier of type `standard`, which any qualified source may supply.

A `standard` part with no manufacturer part, supplier part, standard-part
number or properties is **incomplete**. Real sources contain such parts ("terminal",
a catalog number without description…), so it is valid in a document, but it
cannot be bought: tools report it, and the buying BOM lists it under
`unresolved` rather than as a line.

A part with usages is an assembly, whatever its kind. `phantom: true` marks a
grouping that is never built or stocked as such. `makeOrBuy: "buy"` marks an
assembly bought as a whole (a subcontracted sub-assembly, a module whose
content is documented): buying BOMs do not expand it.

Domain differences are expressed with data, not types:

- **discrete vs. continuous**: the `unit` (UCUM; `"1"` = pieces). A wire run is
  a usage of a `material` part with `{ value: 2.4, unit: "m" }`;
- **positions**: designators (see below);
- **what kind of component**: `category`, informational only.

## Designators

A usage names its positions with one or more designator sets, each in a
scheme:

| scheme       | for                                               | example            |
| ------------ | ------------------------------------------------- | ------------------ |
| `refdes`     | electronic reference designators                  | `R12`, `U3`        |
| `iec81346`   | formal reference designations                     | `=A1+K2-Q3`        |
| `tag`        | device or equipment tags as written in the source | `Q1`, `PPE`, `KA1` |
| `cable`      | cable and wire tags                               | `W12`              |
| `findNumber` | item / balloon numbers on a drawing               | `3A`               |
| `position`   | any other location text                           | `slot 5`           |

Rules:

- with `refdes`, one value is one piece: for a discrete per-unit usage the
  number of values equals the quantity;
- with other schemes, one device may carry several values (a reversing
  contactor tagged both `GA` and `DR`), so the count is not tied to the
  quantity;
- terminals, pins and connector contacts are designated within their device
  as `<device>:<terminal>`, as in IEC 81346: `X1:5`, `-X1:5`, `J3:2`;
- values are unique within a parent and scheme, except between usages with
  mutually exclusive applicability;
- a set may give the `side` of the board its positions are on (`top`,
  `bottom`), as assembly is quoted per side. A usage placed on both sides
  has one set per side; the refdes count is the total.

## Quantities

`quantity.basis`:

- `perUnit` (default): multiplied by the quantity of every parent above it;
- `perLot`: needed once per production lot whatever its size (stencil, fixture, tooling);
- `asRequired`: not defined by the BOM (glue, solder, cable ties). `value`, if
  given, is a per-unit estimate.

Quantities state what the product contains, never what the process loses.
Losses are a [`scrap`](../src/part.ts) allowance on the part: a `rate` (0.02
for 2 % attrition) and a quantity lost once `perLot` (the leader of a reel).
The buying BOM adds it; see [Buying BOM](#buying-bom).

The unit defaults to the part's `unit`, then to `"1"`. A usage may give
its quantity in another unit of the same dimension (`250 mm` of a wire
counted in `m`): quantities are converted to the part's unit before they are
added up. A quantity that cannot be converted (`kg` of a part counted in
`m`, `m` of a part counted in pieces) is an error, and is never added as is.

## Alternates

Three mechanisms cover "something else may be used", at different levels:

|                                            | what varies                 | who chooses                             | example                                 |
| ------------------------------------------ | --------------------------- | --------------------------------------- | --------------------------------------- |
| `Part.manufacturerParts` / `supplierParts` | the source of the same part | purchasing, anywhere the part is used   | Yageo or Vishay 10 kΩ resistor          |
| `Usage.alternates`                         | the part at one position    | builder or buyer, at that position only | one goRail nut, or three hurricane nuts |
| `options` + `applicability`                | the product                 | the configuration being built           | DIP or SMD microcontroller variant      |

A usage alternate names another part and, when it differs, its own quantity.
It may carry its own applicability, for instance to accept an old part only
until a date. The order of manufacturer and supplier parts carries no meaning: only their
`status` (`preferred`, `approved`, `notApproved`) does. The usage's `part` stays the preferred choice: quantity
roll-ups and buying BOMs use it unless the tool is told otherwise, and
alternates are listed for whoever has to substitute.

## Identity

Ids are what make revisions comparable, so they carry rules:

1. A part keeps its `PartId` across revisions of a BOM as long as it stays
   interchangeable (same form, fit and function); its revision is carried by
   its identifiers. A change that breaks interchangeability makes a new part,
   with a new id. A usage keeps its `UsageId` within its parent.
2. Importers SHOULD derive ids from natural keys rather than generating
   random ones: customer part number for parts; designator, find number or
   IEC 81346 designation for usages. Ids MUST NOT be derived from where the
   data sits in the source (row number, order of lines), which changes with
   every export. When one usage groups several designators (`R1, R2, R7`),
   its id SHOULD come from the part it uses rather than from the list, so
   that adding `R9` modifies the usage instead of replacing it.
3. When stable ids cannot be obtained, the match between old and new ids of
   parts and of usages is recorded explicitly in a change set
   (`identityMatches`), with how it was established (identifier, manual,
   heuristic/AI) and whether a human confirmed it.

Ids use ASCII letters, digits and `-` `_` `.` `:` `+` `=`, so that an IEC
81346 designation (`=A1+K2-Q3`) can be used as is. `#` and `/` are reserved.

Part numbers are always `{ issuer, value, revision }` where `issuer` is an
organization. A customer part number is simply an identifier issued by the
customer, which lets one part carry the customer's, the owner's and the
subcontractor's numbers at the same time.

## Revisions and effectivity

A BOM document is **one revision** of a BOM. Revisions are separate
documents sharing the same `id`; the difference between two of them is a
[change set](#change-set), whose `applicability` states the cut-over: which
serials, lots or dates are built to the new revision. That condition selects
between whole revisions and is not copied into their usages.

A revision has a `status`: `draft` (the default, may still change),
`released` (frozen: any change makes a new revision) or `obsolete`.
`approvals` record who signed it off, in which role and when. A released
revision should name its `revision`, and should not have open blocking
issues: tools warn about both.

`applicability` on usages is for what one revision must describe by itself:
variants (options), and effectivity that the revision's owner chooses to keep
inside one revision (a part used up to serial 199, another from 200). A tool
building a configuration first picks the revision, then evaluates usages.

## Applicability (effectivity and variants)

A usage may carry an `applicability` condition on the configuration being
built: option values, end-item serial range, production lot, build date,
combined with `all` / `any` / `not`. `fitted: false` covers the simple
"do not place" case.

Applicability is part of the core, not an optional module, because ignoring
it silently produces wrong quantities. Therefore:

- a consumer that cannot evaluate a condition (unknown option value, missing
  serial…) MUST report it and MUST NOT count or drop the usage on its own;
- a configuration that gives an option a value it does not have (`dip` for
  `DIP`, `true` for a valued option) makes its conditions unknown, not
  false: otherwise every variant would be dropped without a word;
- documents that do not need variants simply omit it.

A configuration carries one serial number, that of the product being built:
serial conditions, in every document of the product, are about it.

## Documents

Files are referenced, never embedded: `uri` (absolute, or relative to the BOM
file) and/or `sha256`. A _package_ is a folder or zip containing the
`.bom.json` file and the files it references by relative path.

The files an import was made from (customer spreadsheet, ECAD project…) are
ordinary documents listed in `generator.sources`; being a source is a role,
not a type. `provenance` on parts and usages points back into them: sheet,
row and column for spreadsheets, page for PDFs, element name for CAD files,
and optionally the `text` as it stands in the source (`"10k 1% 0603"`).
Every imported value can thus be checked against the original. `generator`
also records the tool and mapping configuration used, which makes an import
reproducible: same source + same configuration = same BOM.

Links break; `sha256` does not. Documents referenced by URL SHOULD carry
their digest so a reference stays verifiable after the URL changes.

## Review issues

Reading a real BOM raises questions: a capacitor without voltage rating, two
parts lists that disagree, a tag used twice. They are recorded as
[`issues`](../src/issues.ts) at document level, not as free text, so they can be
sent to the BOM's owner, answered and tracked:

- `severity`: `error` blocks use of the BOM (e.g. a part that cannot be
  bought), `warning` needs an answer, `info` is an assumption to confirm;
- `category`: `missing`, `conflict`, `ambiguous`, `assumption`;
- `subjects`: the parts, usages (as part + usage id), fields or documents
  concerned;
- `status` and `answers`: the conversation with the owner.

Notes, by contrast, only state facts and need no answer.

## Assembly steps

`steps` on an assembly part are executed in order. Each step lists the usages
it installs, plus documents, tools and Markdown instructions. Detailed process
planning (routings, work centers, cycle times) is out of scope for 0.1.

## Multi-file BOMs

`imports` declares other BOM documents under an alias. A usage then refers to
`"alias#partId"`; `"a#b#partId"` goes through two imports, which derived views
use to name any part from the root document. A large product is a tree of
files, each owned and revised independently (see [`examples/rover/rover.ts`](../examples/rover/rover.ts), which
uses the board defined in
[`examples/rover/control-board.ts`](../examples/rover/control-board.ts)).

Ids are local to their document. Across files:

- **organizations**: a document refers to an organization of an imported
  document as `"alias#orgId"` instead of declaring it again, which states
  that it is the same organization. Organizations declared in two documents
  are the same only if they share a registry `code`;
- **options**: a configuration names the options of the document it is
  evaluated on. An import gives values to the options of the imported
  document in `options`: a fixed value, or `{ option }` to forward an option
  of the importing document. An option with no binding takes its `default`;
  without one, conditions on it cannot be evaluated.

## Modules and extensions

`extensions` holds namespaced data:

- **modules** defined by this specification, currently `subcontract`
  ([`src/modules/subcontract.ts`](../src/modules/subcontract.ts)): customer and
  subcontractor, turnkey vs. consigned supply, substitution policy
  (`equivalent`, `approvedOnly`, `preferredOnly`);
- **private** data under keys starting with `x-`.

A document lists in `requires` the modules a consumer must understand to
interpret it correctly; a consumer MUST reject documents requiring a module
it does not support. Modules not listed in `requires` may be ignored safely.

## Derived views

These are computed, never edited, but have a format so that tools can
exchange and diff them.

### Buying BOM

[`BuyingBom`](../src/views.ts) lists what must be procured to build N units of a
product in a given configuration. Reference algorithm:

1. Start from the product with multiplier 1. Walk its usages depth-first.
2. Skip usages with `fitted: false` or whose applicability evaluates to
   false. Record usages whose applicability cannot be evaluated in
   `unresolved` and skip them.
   Usages of an imported document are evaluated with its options as bound
   by the import.
3. Quantities are converted to the unit of the part they count; a usage
   whose quantity cannot be converted goes to `unresolved`.
   `perUnit` quantities are multiplied by the multiplier of the path.
   A `perLot` usage is counted once per lot, whatever the path and however
   many paths reach it; below it (a fixture made of parts), quantities are
   multiplied from the per-lot usage down and are per lot too. `asRequired`
   usages set the `asRequired` flag and add nothing.
4. A part with usages is expanded (made), unless it is bought as a whole
   (`makeOrBuy: "buy"`), in which case it becomes a line itself. Phantom
   parts are always expanded. Software parts are not lines. Incomplete
   standard parts are listed in `unresolved`, not as lines.
5. Lines are merged by part. Each keeps the list of occurrences (paths of
   usage ids, with the usage's designators) it came from. A part reached
   through several imports of the same file is one part; two revisions of
   an imported document are different files, hence different parts.
6. `needed = quantityPerUnit × buildQuantity + quantityPerLot`. The part's
   scrap allowance is `scrapQuantity = needed × rate + perLot`, rounded up
   to whole pieces for parts counted in pieces, and zero when nothing is
   needed. `totalQuantity = needed + scrapQuantity`.
7. For each supplier part sold in packs, `packs` gives
   `ceil(totalQuantity / packSize)`; which one is ordered is the buyer's
   choice.

### Change set

[`ChangeSet`](../src/changes.ts) is the difference between two revisions of a BOM
document: parts and usages added, removed, modified (by JSON Pointer) or
moved, and fields of the document itself modified (options, organizations,
documents, imports…).
It can be carried through an engineering change process (`status`,
`reference`, `reason`) and states from when the new revision applies
(`applicability`, see [Revisions and effectivity](#revisions-and-effectivity)).

Fields are compared by JSON Pointer. Arrays are compared as a whole, never
element by element, so that inserting an element does not shift every index;
arrays whose order carries no meaning (designator sets and values,
manufacturer and supplier parts, identifiers, categories, documents) are
compared as sets.

What is compared is the content, not how it was obtained:

- `provenance` is ignored. Importing a re-exported spreadsheet in which
  every row moved, with nothing else changed, gives an empty change set;
- release data (`revision`, `status`, `approvals`, `issuedAt`, `generator`)
  and `issues` are ignored too;
- imported documents are not compared: each file has its own revisions and
  change sets. A new revision of an import shows in the importing document
  as a change of `/imports/<alias>/revision`.

Changes name parts and usages by their id in the new revision. With
`identityMatches`, a usage renamed in place is not a change, and a usage
renamed while moving to another parent is a `usageMoved` with `newUsage`.
A match that names a part or usage that does not exist is an error.

## Validation checks (non-normative)

The TypeScript types and Typia validators enforce structural constraints,
including property units, dictionary code formats, numeric serial bounds
(non-numeric serials use `list`), and the type of option defaults.

Beyond structure, tools are expected to warn about the following;
`bomkit validate` implements them. A warning about a part or usage that an
issue already covers is reported as information, with the issue's id.

- part references that do not resolve;
- cycles in the usage graph;
- `refdes` designator count (all sides together) ≠ quantity for discrete per-unit usages;
- quantities whose unit cannot be converted to the unit of the part;
- serial and date ranges that nothing satisfies;
- one document imported as several files (two revisions, or two copies):
  their parts are counted separately;
- the same designator used twice under one parent and scheme (unless the
  usages have mutually exclusive applicability);
- incomplete `standard` parts (no manufacturer part, supplier part,
  standard-part number or properties), and generic ones missing values a buyer needs, such as a
  capacitor without voltage rating;
- issue subjects that do not resolve, and open issues of severity `error`
  when a buying BOM is requested;
- `material` parts with unit `"1"`;
- `scrap` on a part that is not bought (software, an assembly that is made);
- usage alternates whose part does not resolve, or equals the usage's part;
- step usages that do not exist, and usages installed by no step or by
  several steps (when steps are present);
- options referenced but not declared, `equals` on a boolean option or
  missing on a valued one, defaults and import bindings that do not exist;
- `preferredOnly` substitution on a part with no preferred reference;
- parts whose approved manufacturer parts are all `obsolete`, with no supplier part;
- released documents without `revision`, or with open issues of severity `error`.

## Serialization

- File extension `.bom.json` (`.change.json` for change sets), UTF-8, JSON.
- Producers SHOULD write object keys in a stable order and parts sorted by id,
  so that text diffs of two revisions stay readable.
- Unknown properties outside `extensions` are an error; inside, only module
  names and `x-` keys are allowed.
