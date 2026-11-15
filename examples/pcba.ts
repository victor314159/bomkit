// SPDX-License-Identifier: CC-BY-SA-4.0
// Arduino UNO Rev3; Arduino. See README.md for attribution and CAD licence.
// Adapted to bomkit by victor314159, 2026-11-15; see README.md.
// Licence text: LICENSES/CC-BY-SA-4.0.txt
//
// Arduino Uno Rev3 (A000066), checked against Arduino's published
// UNO-TH_Rev3e.brd / .sch CAD files. Component values, packages, reference
// designators and quantities below follow that through-hole design.
// Fiducials, test points and solder jumpers belong to the PCB, not purchasing.
//
// This is a subcontracting example, not Arduino's production purchasing BOM.
// Catalog references for the socket, connectors and 100 nF capacitors are
// illustrative sourcing choices, not verified Arduino-approved parts. Where
// the CAD supplies only a value/package, no exact MPN is invented.
// The SMD MCU option requires a different PCB and is an illustrative variant;
// only the default DIP configuration is checked against the cited CAD.
// Firmware, consignment, solder paste and stencil are example process data.

import { BomDocument, BuyingBom } from "../src/index.js";

export const pcba: BomDocument = {
  kind: "bom",
  specVersion: "0.1",
  id: "urn:example:bom:uno-r3",
  revision: "3e",
  name: "Arduino Uno Rev3",
  owner: "arduino",
  products: ["uno-r3"],
  requires: ["subcontract"],
  organizations: {
    arduino: { name: "Arduino", website: "https://www.arduino.cc" },
    acme: { name: "ACME Maker Kits" },
    fab: { name: "Fab Subcontracting" },
    microchip: { name: "Microchip Technology", aliases: ["Atmel"] },
    onsemi: { name: "onsemi", aliases: ["ON Semiconductor", "Fairchild"] },
    ti: { name: "Texas Instruments", aliases: ["TI"] },
    murata: { name: "Murata" },
    bourns: { name: "Bourns" },
    wurth: { name: "Würth Elektronik", aliases: ["Wurth", "WE"] },
    assmann: { name: "Assmann WSW" },
    kester: { name: "Kester" },
  },
  options: {
    mcu: {
      name: "Microcontroller package",
      description:
        "Verified Uno Rev3 DIP design or illustrative SMD variant (requires different PCB)",
      values: ["DIP", "SMD"],
      default: "DIP",
    },
  },
  documents: {
    schematic: {
      name: "Arduino Uno Rev3 schematic (UNO-TH_Rev3e)",
      type: "drawing",
      uri: "https://docs.arduino.cc/resources/schematics/A000066-schematics.pdf",
    },
    design: {
      name: "Arduino Uno Rev3 schematic and board (EAGLE)",
      type: "ecad",
      uri: "https://docs.arduino.cc/static/6bb7a3ca51ebee82a252f60c0b418787/A000066-cad-files.zip",
      sha256:
        "532b306cb153846eafc0ca9fe991d7a4dfa0c52dcefafa2efeaebf4b845ec820",
      size: 303265,
      notes: [{ text: "Published by Arduino under CC BY-SA 4.0" }],
    },
    gerbers: {
      name: "Arduino Uno Rev3 gerbers",
      type: "fabrication",
      uri: "files/arduino_Uno_Rev3-gerbers.zip",
    },
    "ds-328p": {
      name: "ATmega328P datasheet",
      type: "datasheet",
      uri: "files/ATmega328P.pdf",
    },
    "ds-16u2": {
      name: "ATmega16U2 datasheet",
      type: "datasheet",
      uri: "files/ATmega16U2.pdf",
    },
    optiboot: {
      name: "optiboot_atmega328.hex",
      type: "software",
      uri: "files/optiboot_atmega328.hex",
    },
    "usbserial-fw": {
      name: "Arduino-usbserial-atmega16u2-Uno-Rev3.hex",
      type: "software",
      uri: "files/Arduino-usbserial-atmega16u2-Uno-Rev3.hex",
    },
  },
  parts: {
    "uno-r3": {
      kind: "custom",
      name: "Arduino Uno Rev3, assembled",
      identifiers: [
        { issuer: "arduino", value: "A000066", revision: "3e" },
        { issuer: "acme", value: "KIT-UNO-01", revision: "A" },
      ],
      documents: ["design", "schematic"],
      provenance: {
        locations: [{ document: "design" }, { document: "schematic", page: 1 }],
      },
      usages: [
        {
          id: "PCB",
          part: "pcb",
          quantity: { value: 1 },
          applicability: { option: "mcu", equals: "DIP" },
        },
        {
          id: "PCB-smd",
          part: "pcb-smd",
          quantity: { value: 1 },
          applicability: { option: "mcu", equals: "SMD" },
        },
        {
          id: "ZU4",
          part: "atmega328p-pu",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["ZU4"] }],
          applicability: { option: "mcu", equals: "DIP" },
          extensions: {
            subcontract: {
              supply: "customer",
              substitution: "preferredOnly",
            },
          },
        },
        {
          id: "ZU4-socket",
          part: "dip28-socket",
          quantity: { value: 1 },
          // A position, not a refdes: the socket has no designator of its own.
          designators: [{ scheme: "position", values: ["ZU4"] }],
          notes: [
            {
              text: "Socket shares the ZU4 footprint; separate socket MPN is an example sourcing choice.",
            },
          ],
          applicability: { option: "mcu", equals: "DIP" },
        },
        {
          id: "ZU4-smd",
          part: "atmega328p-au",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["ZU4"] }],
          applicability: { option: "mcu", equals: "SMD" },
        },
        { id: "FW-328P", part: "bootloader", quantity: { value: 1 } },
        {
          id: "U3",
          part: "atmega16u2",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["U3"] }],
        },
        { id: "FW-16U2", part: "usbserial-fw", quantity: { value: 1 } },
        {
          id: "U1",
          part: "reg-5v",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["U1"] }],
        },
        {
          id: "U2",
          part: "reg-3v3",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["U2"] }],
        },
        {
          id: "U5",
          part: "opamp",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["U5"] }],
        },
        {
          id: "T1",
          part: "pmos",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["T1"] }],
        },
        {
          id: "F1",
          part: "polyfuse",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["F1"] }],
        },
        {
          id: "Y2",
          part: "resonator-16m",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["Y2"] }],
        },
        {
          id: "RN1",
          part: "network-10k",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["RN1"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "C-100n",
          part: "cap-100n",
          quantity: { value: 7 },
          designators: [
            {
              scheme: "refdes",
              values: ["C1", "C2", "C4", "C5", "C6", "C7", "C10"],
            },
          ],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "X2",
          part: "usb-b",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["X2"] }],
        },
        {
          id: "ICSP1",
          part: "header-2x3",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["ICSP1"] }],
          notes: [
            {
              text: "ATmega16U2 programming header; populated in the reference design.",
            },
          ],
        },
        {
          id: "ICSP",
          part: "header-2x3",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["ICSP"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "JP2",
          part: "header-2x2",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["JP2"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
          fitted: false,
          notes: [
            {
              text: "Marked 2x2 M - NM (not mounted) in the Arduino schematic.",
            },
          ],
        },
        {
          id: "R-1M",
          part: "res-1m",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["R1", "R2"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "RN-1k",
          part: "network-1k",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["RN2", "RN4"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "RN3",
          part: "network-22r",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["RN3"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "C-1u",
          part: "cap-1u",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["C3", "C8"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "C-22p",
          part: "cap-22p",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["C9", "C11"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "PC-47u",
          part: "cap-47u",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["PC1", "PC2"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "Y1",
          part: "crystal-16m",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["Y1"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "D1",
          part: "diode-m7",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["D1"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "D-bridge",
          part: "diode-signal",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["D2", "D3"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "Z-usb",
          part: "varistor",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["Z1", "Z2"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "L1",
          part: "ferrite",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["L1"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "L2",
          part: "inductor",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["L2"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "LED-green",
          part: "led-green",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["ON"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "LED-yellow",
          part: "led-yellow",
          quantity: { value: 3 },
          designators: [{ scheme: "refdes", values: ["L", "RX", "TX"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "RESET",
          part: "reset-switch",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["RESET"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "X1",
          part: "dc-jack",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["X1"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "HDR-8",
          part: "header-1x8",
          quantity: { value: 2 },
          designators: [{ scheme: "refdes", values: ["IOL", "POWER"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "IOH",
          part: "header-1x10",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["IOH"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "AD",
          part: "header-1x6",
          quantity: { value: 1 },
          designators: [{ scheme: "refdes", values: ["AD"] }],
          provenance: {
            locations: [{ document: "schematic", page: 1 }],
          },
        },
        {
          id: "paste",
          part: "solder-paste",
          quantity: { basis: "asRequired", value: 0.9, unit: "g" },
        },
        {
          id: "stencil",
          part: "stencil",
          quantity: { basis: "perLot", value: 1 },
        },
      ],
      steps: [
        {
          id: "smt",
          title: "SMT print, placement and reflow",
          usages: [
            "PCB",
            "PCB-smd",
            "ZU4-smd",
            "U3",
            "U1",
            "U2",
            "U5",
            "T1",
            "F1",
            "Y2",
            "RN1",
            "C-100n",
            "R-1M",
            "RN-1k",
            "RN3",
            "C-1u",
            "C-22p",
            "PC-47u",
            "Y1",
            "D1",
            "D-bridge",
            "Z-usb",
            "L1",
            "L2",
            "LED-green",
            "LED-yellow",
            "RESET",
            "paste",
            "stencil",
          ],
          tools: ["stencil printer", "pick-and-place", "reflow oven"],
        },
        {
          id: "tht",
          title: "Through-hole: DIP socket, connectors and headers",
          usages: [
            "ZU4-socket",
            "X2",
            "X1",
            "ICSP",
            "ICSP1",
            "JP2",
            "HDR-8",
            "IOH",
            "AD",
          ],
          tools: ["selective soldering or hand soldering"],
        },
        {
          id: "mcu",
          title:
            "Insert ATmega328P in its socket (pin 1 towards the notch mark)",
          usages: ["ZU4"],
        },
        {
          id: "prog",
          title: "Program both microcontrollers",
          instructions:
            "Flash `Arduino-usbserial-atmega16u2-Uno-Rev3.hex` into U3 and `optiboot_atmega328.hex` into ZU4 over ICSP, then set fuses.",
          usages: ["FW-16U2", "FW-328P"],
          documents: ["usbserial-fw", "optiboot"],
        },
      ],
      makeOrBuy: "make",
    },
    pcb: {
      kind: "custom",
      name: "Bare PCB Arduino Uno Rev3, 2 layers FR4 1.6 mm",
      documents: ["gerbers", "design"],
    },
    "pcb-smd": {
      kind: "custom",
      name: "Uno Rev3 SMD variant PCB (illustrative, design files required)",
      notes: [
        {
          text: "The cited UNO-TH_Rev3e PCB cannot accept a TQFP-32 MCU. Separate SMD fabrication files are required.",
        },
      ],
    },
    "atmega328p-pu": {
      kind: "standard",
      name: "MCU ATmega328P, DIP-28",
      category: [{ system: "free", code: "microcontroller" }],
      manufacturerParts: [
        {
          manufacturer: "microchip",
          mpn: "ATMEGA328P-PU",
          status: "preferred",
          documents: ["ds-328p"],
        },
      ],
    },
    "atmega328p-au": {
      kind: "standard",
      name: "MCU ATmega328P, TQFP-32",
      category: [{ system: "free", code: "microcontroller" }],
      manufacturerParts: [
        {
          manufacturer: "microchip",
          mpn: "ATMEGA328P-AU",
          documents: ["ds-328p"],
        },
      ],
    },
    "dip28-socket": {
      kind: "standard",
      name: "IC socket DIP-28 narrow",
      manufacturerParts: [{ manufacturer: "assmann", mpn: "A 28-LC-TT" }],
    },
    atmega16u2: {
      kind: "standard",
      name: "MCU ATmega16U2 (USB-serial), QFN-32",
      manufacturerParts: [
        {
          manufacturer: "microchip",
          mpn: "ATMEGA16U2-MU",
          documents: ["ds-16u2"],
        },
      ],
    },
    bootloader: {
      kind: "software",
      name: "Optiboot bootloader for ATmega328P",
      documents: ["optiboot"],
    },
    "usbserial-fw": {
      kind: "software",
      name: "USB-serial firmware for ATmega16U2",
      documents: ["usbserial-fw"],
    },
    "reg-5v": {
      kind: "standard",
      name: "LDO regulator 5 V 1 A, SOT-223",
      manufacturerParts: [{ manufacturer: "onsemi", mpn: "NCP1117ST50T3G" }],
    },
    "reg-3v3": {
      kind: "standard",
      name: "LDO regulator 3.3 V 150 mA, SOT-23-5",
      manufacturerParts: [{ manufacturer: "ti", mpn: "LP2985-33DBVR" }],
    },
    opamp: {
      kind: "standard",
      name: "Dual op-amp LMV358",
      manufacturerParts: [{ manufacturer: "ti", mpn: "LMV358IDGKR" }],
    },
    pmos: {
      kind: "standard",
      name: "P-channel MOSFET, SOT-23",
      manufacturerParts: [{ manufacturer: "onsemi", mpn: "FDN340P" }],
    },
    polyfuse: {
      kind: "standard",
      name: "PTC resettable fuse 500 mA",
      manufacturerParts: [{ manufacturer: "bourns", mpn: "MF-MSMF050-2" }],
    },
    "resonator-16m": {
      kind: "standard",
      name: "Ceramic resonator 16 MHz",
      manufacturerParts: [{ manufacturer: "murata", mpn: "CSTCE16M0V53-R0" }],
    },
    "network-10k": {
      kind: "standard",
      name: "Resistor network, 4 isolated 10 kOhm resistors, CAY16",
      category: [{ system: "free", code: "resistor network" }],
      properties: {
        resistance: { value: 10, unit: "kOhm" },
        "x-resistors": 4,
        package: "CAY16",
      },
      provenance: { locations: [{ document: "design", element: "RN1" }] },
    },
    "cap-100n": {
      kind: "standard",
      name: "Capacitor 100 nF 50 V X7R 0603",
      category: [{ system: "free", code: "capacitor" }],
      properties: {
        capacitance: { value: 100, unit: "nF" },
        ratedVoltage: { value: 50, unit: "V" },
        "iec61360:AAE037": "X7R",
        package: "0603",
      },
      notes: [
        {
          text: "Design gives 100n 0603 only; 50 V X7R is the subcontractor's sourcing choice.",
          kind: "info",
        },
      ],
      manufacturerParts: [
        { manufacturer: "murata", mpn: "GRM188R71H104KA93D" },
      ],
    },
    "usb-b": {
      kind: "standard",
      name: "USB type B receptacle, through-hole",
      manufacturerParts: [{ manufacturer: "wurth", mpn: "61400416121" }],
    },
    "header-2x3": {
      kind: "standard",
      name: "Pin header 2x3 2.54 mm",
      manufacturerParts: [{ manufacturer: "wurth", mpn: "61300621121" }],
    },
    "network-1k": {
      kind: "standard",
      name: "Resistor network, 4 isolated 1 kOhm resistors, CAY16",
      category: [{ system: "free", code: "resistor network" }],
      properties: {
        resistance: { value: 1, unit: "kOhm" },
        "x-resistors": 4,
        package: "CAY16",
      },
      provenance: { locations: [{ document: "design", element: "RN2" }] },
    },
    "network-22r": {
      kind: "standard",
      name: "Resistor network, 4 isolated 22 Ohm resistors, CAY16",
      category: [{ system: "free", code: "resistor network" }],
      properties: {
        resistance: { value: 22, unit: "Ohm" },
        "x-resistors": 4,
        package: "CAY16",
      },
      provenance: { locations: [{ document: "design", element: "RN3" }] },
    },
    "res-1m": {
      kind: "standard",
      name: "Resistor 1 MOhm 0603",
      category: [{ system: "free", code: "resistor" }],
      properties: {
        resistance: { value: 1, unit: "MOhm" },
        package: "0603",
      },
      provenance: { locations: [{ document: "design", element: "R1" }] },
    },
    "cap-1u": {
      kind: "standard",
      name: "Capacitor 1 uF 0603",
      category: [{ system: "free", code: "capacitor" }],
      properties: {
        capacitance: { value: 1, unit: "uF" },
        package: "0603",
      },
      provenance: { locations: [{ document: "design", element: "C3" }] },
    },
    "cap-22p": {
      kind: "standard",
      name: "Capacitor 22 pF 0603",
      category: [{ system: "free", code: "capacitor" }],
      properties: {
        capacitance: { value: 22, unit: "pF" },
        package: "0603",
      },
      provenance: { locations: [{ document: "design", element: "C9" }] },
    },
    "cap-47u": {
      kind: "standard",
      name: "Electrolytic capacitor 47 uF, case D",
      category: [{ system: "free", code: "capacitor" }],
      properties: {
        capacitance: { value: 47, unit: "uF" },
        "x-polarized": true,
        package: "PANASONIC_D",
      },
      provenance: { locations: [{ document: "design", element: "PC1" }] },
    },
    "crystal-16m": {
      kind: "standard",
      name: "Crystal 16 MHz",
      category: [{ system: "free", code: "crystal" }],
      properties: {
        frequency: { value: 16, unit: "MHz" },
        package: "QS",
      },
      provenance: { locations: [{ document: "design", element: "Y1" }] },
    },
    "diode-m7": {
      kind: "standard",
      name: "Rectifier diode M7 (1 A, 1000 V), SMB",
      category: [{ system: "free", code: "diode" }],
      properties: {
        "x-type": "M7",
        ratedCurrent: { value: 1, unit: "A" },
        ratedVoltage: { value: 1000, unit: "V" },
        package: "SMB",
      },
      provenance: { locations: [{ document: "design", element: "D1" }] },
    },
    "diode-signal": {
      kind: "standard",
      name: "Signal diode CD1206-S01575",
      category: [{ system: "free", code: "diode" }],
      manufacturerParts: [{ manufacturer: "bourns", mpn: "CD1206-S01575" }],
      properties: { package: "MINIMELF" },
      provenance: { locations: [{ document: "design", element: "D2" }] },
    },
    varistor: {
      kind: "standard",
      name: "USB varistor CG0603MLC-05E",
      category: [{ system: "free", code: "varistor" }],
      manufacturerParts: [{ manufacturer: "bourns", mpn: "CG0603MLC-05E" }],
      properties: { package: "0603" },
      provenance: { locations: [{ document: "design", element: "Z1" }] },
    },
    ferrite: {
      kind: "standard",
      name: "Ferrite bead BLM21 series, 0805",
      category: [{ system: "free", code: "ferrite bead" }],
      properties: { "x-series": "BLM21", package: "0805" },
      provenance: { locations: [{ document: "design", element: "L1" }] },
    },
    inductor: {
      kind: "standard",
      name: "Inductor 10 uH 0805",
      category: [{ system: "free", code: "inductor" }],
      properties: {
        inductance: { value: 10, unit: "uH" },
        package: "0805",
        "x-designPartNumber": "CV201210-100K",
      },
      notes: [
        {
          text: "Design names part number CV201210-100K without manufacturer.",
          kind: "info",
        },
      ],
      provenance: { locations: [{ document: "design", element: "L2" }] },
    },
    "led-green": {
      kind: "standard",
      name: "LED green 0805",
      category: [{ system: "free", code: "LED" }],
      properties: { color: "green", package: "0805" },
      provenance: { locations: [{ document: "design", element: "ON" }] },
    },
    "led-yellow": {
      kind: "standard",
      name: "LED yellow 0805",
      category: [{ system: "free", code: "LED" }],
      properties: { color: "yellow", package: "0805" },
      provenance: { locations: [{ document: "design", element: "L" }] },
    },
    "reset-switch": {
      kind: "standard",
      name: "Reset switch TS42031-160R-TR-7260",
      category: [{ system: "free", code: "switch" }],
      properties: {
        "x-type": "tactile",
        package: "TS42",
        "x-designPartNumber": "TS42031-160R-TR-7260",
      },
      provenance: { locations: [{ document: "design", element: "RESET" }] },
    },
    "dc-jack": {
      kind: "standard",
      name: "DC barrel jack 2.1 mm, through-hole",
      category: [{ system: "free", code: "connector" }],
      properties: {
        "x-pinDiameter": { value: 2.1, unit: "mm" },
        package: "POWERSUPPLY_DC-21MM",
      },
      provenance: { locations: [{ document: "design", element: "X1" }] },
    },
    "header-1x8": {
      kind: "standard",
      name: "Female header 1x8, 2.54 mm, height 8.5 mm",
      category: [{ system: "free", code: "connector" }],
      properties: {
        "x-gender": "female",
        pins: 8,
        pitch: { value: 2.54, unit: "mm" },
        height: { value: 8.5, unit: "mm" },
        package: "1X08",
      },
      provenance: { locations: [{ document: "design", element: "IOL" }] },
    },
    "header-1x10": {
      kind: "standard",
      name: "Female header 1x10, 2.54 mm, height 8.5 mm",
      category: [{ system: "free", code: "connector" }],
      properties: {
        "x-gender": "female",
        pins: 10,
        pitch: { value: 2.54, unit: "mm" },
        height: { value: 8.5, unit: "mm" },
        package: "1X10",
      },
      provenance: { locations: [{ document: "design", element: "IOH" }] },
    },
    "header-1x6": {
      kind: "standard",
      name: "Female header 1x6, 2.54 mm, height 8.5 mm",
      category: [{ system: "free", code: "connector" }],
      properties: {
        "x-gender": "female",
        pins: 6,
        pitch: { value: 2.54, unit: "mm" },
        height: { value: 8.5, unit: "mm" },
        package: "1X06",
      },
      provenance: { locations: [{ document: "design", element: "AD" }] },
    },
    "header-2x2": {
      kind: "standard",
      name: "Male header 2x2, 2.54 mm",
      category: [{ system: "free", code: "connector" }],
      properties: {
        "x-gender": "male",
        pins: 4,
        pitch: { value: 2.54, unit: "mm" },
        package: "2X02",
      },
      provenance: { locations: [{ document: "design", element: "JP2" }] },
    },
    "solder-paste": {
      kind: "material",
      name: "Solder paste SAC305 type 4",
      unit: "g",
      manufacturerParts: [{ manufacturer: "kester", mpn: "NP505-HR" }],
    },
    stencil: {
      kind: "custom",
      name: "SMT stencil Uno Rev3 top, 120 µm",
      documents: ["gerbers"],
    },
  },
  issues: [
    {
      id: "I1",
      severity: "warning",
      category: "missing",
      raisedBy: "fab",
      subjects: [{ part: "cap-1u" }],
      text: "Voltage rating and dielectric not specified in the design; to confirm with the customer.",
    },
    {
      id: "I2",
      severity: "warning",
      category: "missing",
      raisedBy: "fab",
      subjects: [{ part: "cap-22p" }],
      text: "Voltage rating and dielectric not specified in the design; to confirm with the customer.",
    },
    {
      id: "I3",
      severity: "warning",
      category: "missing",
      raisedBy: "fab",
      subjects: [{ part: "cap-47u" }],
      text: "Voltage rating not specified in the design; to confirm with the customer.",
    },
    {
      id: "I4",
      severity: "warning",
      category: "missing",
      raisedBy: "fab",
      subjects: [{ part: "crystal-16m" }],
      text: "Load capacitance and tolerance not specified in the design; to confirm with the customer.",
    },
    {
      id: "I5",
      severity: "warning",
      category: "missing",
      raisedBy: "fab",
      subjects: [{ part: "ferrite" }],
      text: "Exact BLM21 suffix (impedance, current) not specified in the design; to confirm with the customer.",
    },
  ],
  generator: {
    tool: "bomkit",
    version: "1.0.0",
    config: { name: "acme-standard-bom", version: "3" },
    sources: ["design", "schematic"],
  },
  extensions: {
    subcontract: {
      customer: "acme",
      subcontractor: "fab",
      reference: "PO-2026-118",
      supply: "subcontractor",
      substitution: "approvedOnly",
    },
  },
};

/** What a tool would derive for 100 classic (DIP) boards. Excerpt. */
export const pcbaBuying: BuyingBom = {
  kind: "buyingBom",
  source: { id: "urn:example:bom:uno-r3", revision: "3e" },
  product: "uno-r3",
  buildQuantity: 100,
  configuration: { options: { mcu: "DIP" } },
  lines: [
    {
      part: "pcb",
      kind: "custom",
      name: "Bare PCB Arduino Uno Rev3, 2 layers FR4 1.6 mm",
      unit: "1",
      quantityPerUnit: 1,
      quantityPerLot: 0,
      totalQuantity: 100,
      occurrences: [{ path: ["PCB"], quantity: 1 }],
    },
    {
      part: "dip28-socket",
      kind: "standard",
      name: "IC socket DIP-28 narrow",
      manufacturerParts: [{ manufacturer: "assmann", mpn: "A 28-LC-TT" }],
      unit: "1",
      quantityPerUnit: 1,
      quantityPerLot: 0,
      totalQuantity: 100,
      occurrences: [
        { path: ["ZU4-socket"], quantity: 1, designators: ["ZU4"] },
      ],
    },
    {
      part: "network-10k",
      kind: "standard",
      name: "Resistor network, 4 isolated 10 kOhm resistors, CAY16",
      unit: "1",
      quantityPerUnit: 1,
      quantityPerLot: 0,
      totalQuantity: 100,
      occurrences: [{ path: ["RN1"], quantity: 1, designators: ["RN1"] }],
    },
    {
      // One part used at two positions: merged into a single line.
      part: "header-2x3",
      kind: "standard",
      name: "Pin header 2x3 2.54 mm",
      manufacturerParts: [{ manufacturer: "wurth", mpn: "61300621121" }],
      unit: "1",
      quantityPerUnit: 2,
      quantityPerLot: 0,
      totalQuantity: 200,
      occurrences: [
        { path: ["ICSP1"], quantity: 1, designators: ["ICSP1"] },
        { path: ["ICSP"], quantity: 1, designators: ["ICSP"] },
      ],
    },
    {
      part: "solder-paste",
      kind: "material",
      name: "Solder paste SAC305 type 4",
      unit: "g",
      quantityPerUnit: 0,
      quantityPerLot: 0,
      asRequired: true,
      totalQuantity: 0,
      occurrences: [{ path: ["paste"] }],
    },
    {
      part: "stencil",
      kind: "custom",
      name: "SMT stencil Uno Rev3 top, 120 µm",
      unit: "1",
      quantityPerUnit: 0,
      quantityPerLot: 1,
      totalQuantity: 1,
      occurrences: [{ path: ["stencil"] }],
    },
    // ZU4 (ATmega328P-PU) is consigned (supply: customer) and listed by tools
    // in a separate "to receive" section. Firmwares are software;
    // JP2 is DNP; ZU4-smd and PCB-smd do not apply to the DIP configuration.
  ],
};
