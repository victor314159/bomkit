# Standards and property mappings

Supporting references for the [bomkit model](../README.md).

## Relation to other standards

bomkit is a working format for the people who quote, buy and build: a BOM
received from a customer or exported from a design tool, cleaned, checked,
turned into a buying BOM and compared between revisions. It is meant to map
onto the following standards, not to replace them:

|                                | scope                                                                                                                      | where it is stronger                                                                                 | what bomkit adds                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **STEP AP242** (ISO 10303-242) | product data in PLM: structure, versions, effectivity, approvals, 3D geometry and PMI                                      | geometry, long-term archiving (LOTAR), support by CAD/PLM systems, aerospace and automotive adoption | a small JSON format with a free schema; sourcing data (MPN, supplier SKU, packs, approval status); messy source data with provenance and review issues; buying BOM; diffs |
| **IPC-2581**                   | PCB fabrication and assembly data, including a BOM with reference designators, characteristics and an approved vendor list | it comes with the board design: layers, footprints, placement                                        | mechanical and cabinet parts, several boards in one product, variants and effectivity, packs and per-lot quantities, revisions and diffs                                  |
| **ODB++**                      | PCB manufacturing data                                                                                                     | same as IPC-2581                                                                                     | same as IPC-2581, open specification                                                                                                                                      |
| **CycloneDX** (ECMA-424)       | software and hardware supply-chain inventories (SBOM/HBOM)                                                                 | security and licence tooling, signatures                                                             | assembly structure with quantities and positions, applicability, procurement                                                                                              |
| ECAD BOM exports (CSV, Excel)  | whatever the tool exports                                                                                                  | everyone can read them                                                                               | a schema, identity rules, units, validation                                                                                                                               |

Mapping, for importers and exporters (indicative):

| bomkit                            | STEP AP242                                                    | IPC-2581                                  |
| --------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| `Part` (+ `identifiers` revision) | product, product version, product definition (view)           | `BomItem`                                 |
| `Usage` (quantity, designators)   | next assembly usage occurrence                                | `BomItem` quantity, `RefDes`              |
| `Usage.fitted: false`             | — (effectivity or a separate view)                            | `RefDes` populate = false                 |
| `DesignatorSet.side`              | — (in the geometry)                                           | `RefDes` layer reference                  |
| `manufacturerParts` + `status`    | alternate products, supplier/manufacturer part identification | `AvlItem` / `AvlVmpn` (qualified, chosen) |
| `Usage.alternates`                | assembly component usage substitute                           | —                                         |
| `properties`                      | properties with units                                         | `Characteristics`                         |
| `applicability`                   | serial, lot and dated effectivity; configuration              | —                                         |
| `status`, `approvals`             | approvals, status                                             | —                                         |
| `documents`                       | document assignment                                           | —                                         |
| change set                        | change management (AP242, PLCS)                               | —                                         |

Also used: **IEC 81346** for reference designations (a designator scheme),
**UCUM** for units.

### Properties and IEC 61360-4

The electronics profile provides generic purchasing characteristics using
bomkit's own descriptions. It does not embed IEC CDD property tables or
value lists. `dielectric`, `mounting` and `msl` carry the source's text;
bomkit does not validate their values against an IEC enumeration.

For dictionary references, consult the official
[IEC Common Data Dictionary](https://cdd.iec.ch). Dictionary keys carry
identifiers and values without embedding the referenced dictionary.
Importers and exporters are responsible for selecting the appropriate
property and checking its meaning, type and unit. Dictionary content
remains subject to its owner's terms; see the
[IEC copyright conditions](https://webstore.iec.ch/en/copyright).

### ETIM attribution

The electrical and wiring profiles contain information from the ETIM
classification model, provided by ETIM International under the
[Open Data Commons Attribution License 1.0](https://opendatacommons.org/licenses/by/1-0/).
See [third-party notices](../THIRD_PARTY_NOTICES.md) for scope and adaptations.
The source classes and versions are recorded below.

### Properties and ETIM: electrical

Read in the English ETIM Viewer on 15 November 2026. Feature types and
units were read, as well as names and codes. The mappings depend on the
part category, as in the electronics profile. Source classes:

- [MCB, EC000042 v9, ETIM 10.0](https://viewer.etim-international.com/class/EC000042/9).
- [AC contactor, EC000066 v10, Dynamic](https://viewer.etim-international.com/class/EC000066).
- [Switching relay, EC001437 v8, Dynamic](https://viewer.etim-international.com/class/EC001437).
- [Feed-through terminal, EC000897 v11, Dynamic](https://viewer.etim-international.com/class/EC000897).
- [Control transformer, EC002486 v8, ETIM 10.0](https://viewer.etim-international.com/class/EC002486?lang=en-US).
- [Cylindrical fuse holder, EC002705 v6, ETIM 10.0](https://viewer.etim-international.com/class/EC002705/6), read in the browser.

| bomkit                            | ETIM feature (English meaning, code)                 | source class       |
| --------------------------------- | ---------------------------------------------------- | ------------------ |
| `poles`                           | total pole count `EF008618`; pole count `EF001391`   | EC000042; EC002705 |
| `curve`                           | release characteristic `EF000889`                    | EC000042           |
| `fuseSize`                        | compatible fuse size `EF008316`                      | EC002705           |
| `secondaryVoltage`                | voltage of first secondary `EF007472` (range, V)     | EC002486           |
| `normallyOpenContacts`            | main NO count `EF001374`; relay NO count `EF008256`  | EC000066; EC001437 |
| `normallyClosedContacts`          | main NC count `EF001375`; relay NC count `EF008255`  | EC000066; EC001437 |
| `changeoverContacts`              | relay change-over count `EF008257`                   | EC001437           |
| `auxiliaryNormallyOpenContacts`   | auxiliary NO count `EF001376`                        | EC000066           |
| `auxiliaryNormallyClosedContacts` | auxiliary NC count `EF001377`                        | EC000066           |
| `levels`                          | terminal level count `EF002659`                      | EC000897           |
| `solidConductorCrossSection`      | permitted solid-core section `EF007337` (range, mm²) | EC000897           |

Choice domains follow ETIM 10.0: `curve` uses `EF000889` in EC000042 v9;
`fuseSize` uses `EF008316` in EC002705 v6. Their accepted representations
are defined in [`ElectricalProperties`](../src/profiles/electrical.ts) and
the generated JSON Schema. An ETIM `Other` choice can be supplemented by
an `x-` property. Updating a domain requires checking its source release.

Numeric counts are whole numbers in bomkit. `EF008618` counts total poles;
other classes may count neutral poles differently.

### Properties and ETIM: wiring

Read in the English ETIM Viewer on 15 November 2026, including types,
units and the displayed conductor categories and identification methods:
[low-voltage installation cable, EC003248 v3, ETIM 10.0](https://viewer.etim-international.com/class/EC003248/3),
and [flexible power cable, EC000837 v9, ETIM 10.0](https://viewer.etim-international.com/class/EC000837/9).
These two classes cover every wiring feature used here.

| bomkit                | ETIM feature (English meaning, code)                                  |
| --------------------- | --------------------------------------------------------------------- |
| `cores`               | core count `EF001792`                                                 |
| `crossSection`        | nominal section per conductor `EF000060` (numeric, mm²)               |
| `protectiveEarth`     | protective conductor present `EF007468` (logical)                     |
| `conductorClass`      | conductor category `EF001632`                                         |
| `conductorMaterial`   | conductor metal `EF001622`                                            |
| `insulationMaterial`  | core insulation material `EF000061`                                   |
| `sheathMaterial`      | outer sheath material `EF001625`                                      |
| `coreIdentification`  | core identification method `EF000067`                                 |
| `shielded`            | screen present `EF001791` (logical)                                   |
| `conductorResistance` | resistance per conductor length at 20 °C `EF013551` (numeric, Ohm/km) |

Choice domains follow the union of the ETIM 10.0 lists in EC003248 v3
and EC000837 v9. The accepted representations are defined in
[`WiringProperties`](../src/profiles/wiring.ts) and the generated JSON Schema.
An exporter must select the values allowed by its target class. Text
choices preserve ETIM's case and spelling; additional details can use an
`x-` property alongside the dictionary's `Other` choice.

The value conventions refer to:

- [IEC 60228:2023, clauses 3.2 and 4, Tables 3–6](https://standards.iteh.ai/catalog/standards/iec/af25f2c8-60f0-437c-a14f-bf3b102bce91/iec-60228-2023):
  nominal conductor sections, conductor classes and resistance limits.
  The wiring profile checks the section's area unit without certifying
  cable conformity. Applicability depends on the cable standard; IEC 60228
  excludes telecommunication conductors.
- [IEC 60757:2021, Table 1 and clauses 4–5](https://cdn.standards.iteh.ai/samples/103882/e7a5e9308b7a45848379ac3ec2b8e061/IEC-60757-2021.pdf):
  colour codes, combinations and documented additional codes. Restrictions
  on the use of green/yellow refer to IEC 60445.

ETIM distinguishes core colour (`EF001703`) from outer sheath colour
(`EF001618`), both in EC003248 v3. An exporter must preserve which surface
a source designation describes. The shared core `color` remains text
across trades; no additional colour key is introduced.

### Property domains kept open

Core and profile properties use the following open domains:

| domain                                                                                   | representation            | reason                                                                                                          |
| ---------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| dimensions, mass, electrical ratings, operating temperature; profile measures and ranges | `Measure<U>` / `Range<U>` | numeric values remain open; `U` restricts units to the supported dimension and UCUM prefixes                    |
| poles, cores, contacts, levels, pins                                                     | integer counts            | counts are not a list of preferred catalogue values                                                             |
| `crossSection`                                                                           | area measure              | ETIM is numeric; IEC 60228 applicability depends on the cable standard and does not cover every wire            |
| `color`                                                                                  | text                      | shared by all trades; IEC 60757 clause 4 permits documented additional codes, and clause 5 permits combinations |
| `package`                                                                                | text                      | package designations are carried as source text without a built-in list                                         |
| `dielectric`, `mounting`, `msl`                                                          | text                      | source designations are preserved without embedding IEC value lists                                             |
| dictionary and `x-` keys                                                                 | `PropertyValue`           | dictionary-specific domains and private data are carried without a built-in vocabulary for every possible code  |

The ETIM choice domains in the electrical and wiring profiles are literal
unions in TypeScript and enumerations in the generated JSON Schema. Unknown
choices use the existing `x-` mechanism; where ETIM defines `Other`, that
choice is accepted. The three open electronics fields above accept text
directly, including designations outside the former enumerations.
