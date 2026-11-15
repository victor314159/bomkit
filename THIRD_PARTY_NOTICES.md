# Third-party notices

Original bomkit contributions are licensed under the MIT licence in
`LICENSE`. The following third-party information retains its own terms.

## ETIM classification model

Contains information from the [ETIM classification model](https://www.etim-international.com/classification/model-information/),
provided by ETIM International and made available under the
[Open Data Commons Attribution License (ODC-BY) 1.0](https://opendatacommons.org/licenses/by/1-0/).
The licence permits commercial use, subject to its conditions.

This attribution applies to the ETIM-derived feature mappings and choice
lists in `src/profiles/electrical.ts`, `src/profiles/wiring.ts`, their
associated documentation and tests, and generated schemas containing those
properties or choices. Retain this notice with distributions of those
materials. The MIT licence does not replace the terms for ETIM-derived
information.

Sources: English ETIM Viewer records consulted on 15 November 2026,
principally ETIM 10.0, with some Dynamic class records. The source classes,
versions and links are recorded in `docs/standards.md` in the source
repository. See also [ETIM licence information](https://www.etim-aunz.com/wp-content/uploads/2024/07/ETIM_LICENSE_INFORMATION.pdf).

bomkit adaptations include selecting a subset of features, assigning bomkit
property names, representing units and types using bomkit structures,
combining selected class value lists, and generating validation schemas.
These adaptations are maintained by bomkit and are not an official ETIM
release or a claim of endorsement.

## External dictionaries

Support for IEC 61360-4, IEC 62683 and ECLASS keys transports references and
user-supplied values. It does not distribute those dictionaries or grant a
licence to their contents. Referenced dictionary content remains subject
to its owner's terms.

## Third-party examples

Examples and importer fixtures retain their source licences and
attributions. See `examples/README.md`, `examples/LICENSES/` and
`importer/fixtures/README.md` in the source repository. Exported examples
include their source notes and licence texts alongside this notice.
