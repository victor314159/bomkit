# Example licences and attribution

The MIT licence of bomkit does not replace the licences of these examples.
Each adaptation below is distributed under its source licence, including
bomkit-specific additions by victor314159 (2026). The same licence applies
to its generated JSON, buying BOM excerpts and other derived example data.
The files form a collection of independent examples; the core specification
and tools remain MIT. This notice is itself under the bomkit MIT licence.

| TypeScript source              | Generated file                        | Licence                                       |
| ------------------------------ | ------------------------------------- | --------------------------------------------- |
| `pcba.ts`                      | `pcba.bom.json`                       | [CC-BY-SA-4.0](LICENSES/CC-BY-SA-4.0.txt)     |
| `cubesat-frames.ts`            | `cubesat-frames.bom.json`             | [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt) |
| `planktoscope.ts`              | `planktoscope.bom.json`               | [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt) |
| `machine-cabinet.ts`           | `machine-cabinet.bom.json`            | [GPL-2.0-only](LICENSES/GPL-2.0-only.txt)     |
| `rover/rover.ts`               | `rover/rover.bom.json`                | [Apache-2.0](LICENSES/Apache-2.0.txt)         |
| `rover/rover-before-change.ts` | `rover/rover-before-change.bom.json`  | [Apache-2.0](LICENSES/Apache-2.0.txt)         |
| `rover/control-board.ts`       | `rover/control-board.bom.json`        | [Apache-2.0](LICENSES/Apache-2.0.txt)         |
| `rover/change-gorail-nut.ts`   | `rover/change-gorail-nut.change.json` | [Apache-2.0](LICENSES/Apache-2.0.txt)         |

Keep the relevant attribution, change notices and licence texts with any
redistributed examples, including generated JSON. When distributing adapted
examples, comply with the applicable share-alike or source requirements.
The editable TypeScript sources, their helpers and build instructions are
available in the [bomkit source repository](https://github.com/victor314159/bomkit).
For a release, use the source at the matching release tag.

## Arduino Uno Rev3

Attribution: Arduino, Arduino UNO Rev3 (A000066), design UNO-TH_Rev3e.
The [official CAD archive][arduino-cad] contains `UNO-TH_Rev3e.brd`,
`UNO-TH_Rev3e.sch` and `License.txt`. That licence notice specifies
Creative Commons Attribution-ShareAlike **4.0 International**. The archive
also contains the notice “Copyright (c) 2016-2017 Arduino LLC. All right reserved.”
The [published schematic][arduino-schematic] is a supplementary reference.
The licence version here follows the downloaded archive, not assumptions
based on earlier Arduino boards.

Changes by victor314159, 15 November 2026: transcribed components, packages,
reference designators and quantities into bomkit; separated parts and usages;
added illustrative sourcing, subcontracting, process data, an MCU variant and
a buying BOM excerpt. These additions are examples, not Arduino-approved
purchasing or production data. Arduino does not endorse this adaptation.

## OreSat CubeSat frames

Copyright Portland State Aerospace Society © 2018-2021.
Source: `Frames/build/framesBOM.xlsx`, [oresat-structure at c08159e][oresat-bom].
The [source README][oresat-readme] says CERN OHL v2; the same revision's
[LICENSE directory][oresat-license] supplies `cern_ohl_s_v2.pdf`, establishing
**CERN-OHL-S-2.0**.

Upstream warranty notice: This documentation is distributed WITHOUT ANY
EXPRESS OR IMPLIED WARRANTY, INCLUDING OF MERCHANTABILITY, SATISFACTORY
QUALITY AND FITNESS FOR A PARTICULAR PURPOSE. Please see the CERN OHL v2
for applicable conditions.

Upstream `LICENSE/PRODUCT.TXT` notice:

> If you manufacture something described in this repository or modify its documentation, please tell us!
> PSAS loves to hear about how our work gets used.
> Send general messages to info@psas.pdx.edu.
> If you wish to contact individual contributors, please check the commit logs of this repository for their emails.

Changes by victor314159, 15 November 2026: transcribed the spreadsheet into
bomkit, shared common parts between frame sizes, linked drawings and models,
and marked inferred data and source issues. Source location for the modified
Covered Source: [bomkit examples][bomkit-examples].

## PlanktoScope

Attribution: PlanktoScope contributors and the curious.bio project.
Source: `hardware/bom.csv`, [curious.bio fork at cd77777][plank-bom].
The [README at the identical commit in the upstream repository][plank-readme]
expressly licenses everything in `hardware/` under CERN-OHL-S-2.0.
The curious.bio server was unavailable during verification; the upstream
README at the identical Git commit was used to verify this hardware licence.
The README's own CC-BY-SA licence and the software's GPL licence do not
replace the hardware directory's licence.

Changes by victor314159, 15 November 2026: transcribed the CSV into bomkit,
structured fastener identifiers and procurement references, added provenance
and recorded incomplete or ambiguous source data. Source location for the
modified Covered Source: [bomkit examples][bomkit-examples].

## QElectroTech sharpening-machine cabinet

Attribution: TDP, 2014, project `affuteuse_250h.qet`, distributed by the
QElectroTech project. Source: [schematic at 2032ba7][qet-source].
This adaptation is distributed under the repository's [GNU GPL version 2][qet-license].
The [repository README][qet-readme] identifies that licence. In the project's
[official call for example projects][qet-example-policy] (25 March 2009),
developer Xavier Guerrin explicitly states that contributed example projects
will be distributed under GNU GPL, like the application, and asks for projects
whose authors are authorised to publish them under that licence.
The [initial addition of this exact file][qet-example-addition] by scorpio810
on 27 May 2014 (SVN revision 3081) places it in that example collection.
Together with the repository licence, this supports treating the example
as GPL-covered; no separate file-specific grant from TDP was located.
Its embedded symbol licence notices concern the symbol collection.
No symbol artwork is reproduced here.

Changes by victor314159, 15 November 2026: transcribed folio 12's parts list
and schematic metadata into bomkit, translated names, structured assemblies,
and preserved disagreements as review issues. The editable TypeScript is
provided as the preferred source form of this adaptation.

## NASA JPL Open Source Rover

Copyright 2018 California Institute of Technology. Government Sponsorship Acknowledged.
Source: [open-source-rover at 6b2c5a9][rover-source], `parts_list/parts_list.csv`,
`parts_list/screws.md`, and
`electrical/pcb/control_board/BOM/bom_v2.0.3_board_ref_parts.csv`.
The engineering change also compares revision `41a1156`.
`rover-before-change.ts` reconstructs a comparison fixture by undoing the
documented goRail nut change; it is not a full transcription of the old source.
The [upstream LICENSE.txt][rover-license] is reproduced verbatim in
`LICENSES/Apache-2.0.txt`, including its copyright and government sponsorship
notice. No upstream NOTICE file was present at the source revision.

Changes by victor314159, 15 November 2026: converted mechanical and control
board parts lists into bomkit; added structured suppliers, pack sizes,
provenance, source-conflict notes, cross-file imports and an engineering
change set for the goRail nut replacement. These files are adaptations of
upstream data, not official JPL BOM releases.

[arduino-cad]: https://docs.arduino.cc/static/6bb7a3ca51ebee82a252f60c0b418787/A000066-cad-files.zip
[arduino-schematic]: https://docs.arduino.cc/resources/schematics/A000066-schematics.pdf
[oresat-bom]: https://github.com/oresat/oresat-structure/blob/c08159efe210101d7ea1123d4e0838270f017f5c/Frames/build/framesBOM.xlsx
[oresat-readme]: https://github.com/oresat/oresat-structure/blob/c08159efe210101d7ea1123d4e0838270f017f5c/README.md
[oresat-license]: https://github.com/oresat/oresat-structure/tree/c08159efe210101d7ea1123d4e0838270f017f5c/LICENSE
[plank-bom]: https://code.curious.bio/curious.bio/planktoscope/src/commit/cd7777708531889f8f3cbe368a70baa97c6959f2/hardware/bom.csv
[plank-readme]: https://github.com/PlanktoScope/PlanktoScope/blob/cd7777708531889f8f3cbe368a70baa97c6959f2/README.md
[qet-source]: https://github.com/qelectrotech/qelectrotech-source-mirror/blob/2032ba76ed7971c1fcd709592daa8f3f2d8bfe01/examples/affuteuse_250h.qet
[qet-license]: https://github.com/qelectrotech/qelectrotech-source-mirror/blob/2032ba76ed7971c1fcd709592daa8f3f2d8bfe01/LICENSE
[qet-readme]: https://github.com/qelectrotech/qelectrotech-source-mirror/blob/2032ba76ed7971c1fcd709592daa8f3f2d8bfe01/README.md
[qet-example-policy]: https://qelectrotech.org/forum/viewtopic.php?id=3
[qet-example-addition]: https://github.com/qelectrotech/qelectrotech-source-mirror/commit/a68955dec79c229905fd75225c3b4a2303b14771
[rover-source]: https://github.com/nasa-jpl/open-source-rover/tree/6b2c5a9c13f311e549aeddcfd11248b834bf0fd2
[rover-license]: https://github.com/nasa-jpl/open-source-rover/blob/6b2c5a9c13f311e549aeddcfd11248b834bf0fd2/LICENSE.txt
[bomkit-examples]: https://github.com/victor314159/bomkit/tree/main/examples
