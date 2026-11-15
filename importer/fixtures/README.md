# Importer fixtures: licences and attribution

The source files below are unmodified copies of files published by their
projects. They keep their own licences, as do the `expected.bom.json`
documents derived from them. The MIT licence of bomkit covers the
`config.json` files and this notice only.

Attribution, upstream notices and licence texts are those of the
[examples](../../examples/README.md), which adapt the same files by hand.

| folder          | file                             | source                                                                  | licence                                                      | sha256                                                             |
| --------------- | -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `oresat-frames` | `framesBOM.xlsx`                 | [oresat-structure at c08159e][oresat], `Frames/build/`                  | [CERN-OHL-S-2.0](../../examples/LICENSES/CERN-OHL-S-2.0.txt) | `56e3be262b3d18892aa80873d5e82de5e66c6d538f502b32b8c9dd08516b96b0` |
| `planktoscope`  | `bom.csv`                        | [PlanktoScope at cd77777][plank], `hardware/`                           | [CERN-OHL-S-2.0](../../examples/LICENSES/CERN-OHL-S-2.0.txt) | `0e9906568fbcea7cceffb1c2db5debafd803b4e4c8e002ca93ec6b96b64a733f` |
| `rover`         | `parts_list.csv`                 | [open-source-rover at 6b2c5a9][rover], `parts_list/`                    | [Apache-2.0](../../examples/LICENSES/Apache-2.0.txt)         | `325e00b30f1f3bd914cc07de9a2b89eb81ccdeee3b32535cb7b7ae524a5f915e` |
| `control-board` | `bom_v2.0.3_board_ref_parts.csv` | [open-source-rover, master][board], `electrical/pcb/control_board/BOM/` | [Apache-2.0](../../examples/LICENSES/Apache-2.0.txt)         | `e14e7c45acec038a4cae8be47967c029de5d80876a3bdf356bc06fff922bea43` |

Copyright: Portland State Aerospace Society 2018-2021 (OreSat);
PlanktoScope contributors (PlanktoScope); 2018 California Institute of
Technology, Government Sponsorship Acknowledged (rover and control board).

The expected documents are produced by the importer from these files and
their configuration (victor314159, 2026). They are imports for testing,
not releases of the upstream projects.

[oresat]: https://github.com/oresat/oresat-structure/blob/c08159efe210101d7ea1123d4e0838270f017f5c/Frames/build/framesBOM.xlsx
[plank]: https://github.com/PlanktoScope/PlanktoScope/blob/cd7777708531889f8f3cbe368a70baa97c6959f2/hardware/bom.csv
[rover]: https://github.com/nasa-jpl/open-source-rover/blob/6b2c5a9c13f311e549aeddcfd11248b834bf0fd2/parts_list/parts_list.csv
[board]: https://github.com/nasa-jpl/open-source-rover/blob/master/electrical/pcb/control_board/BOM/bom_v2.0.3_board_ref_parts.csv
