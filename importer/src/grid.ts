// Reading source files as grids of text cells. Every cell is text, trimmed;
// an empty cell is `undefined`. Row and column positions are kept, so that
// values can be traced back to the file.

import { extname } from "node:path";
import readXlsxFile from "read-excel-file/node";

export interface Sheet {
  /** Absent for CSV files. */
  name?: string;
  /** `rows[r][c]` is the cell at 1-based row `r + 1`. */
  rows: (string | undefined)[][];
}

export interface Grid {
  sheets: Sheet[];
}

export class SourceError extends Error {}

const text = (value: string): string | undefined => {
  const t = value.trim();
  return t === "" ? undefined : t;
};

/**
 * RFC 4180 CSV. Quoted cells may contain delimiters, quotes (doubled) and
 * line breaks. A row is a record, as a spreadsheet would show it.
 */
export function parseCsv(
  input: string,
  delimiter?: string,
): (string | undefined)[][] {
  const src = input.startsWith("﻿") ? input.slice(1) : input;
  const delim = delimiter ?? sniffDelimiter(src);
  const rows: (string | undefined)[][] = [];
  let row: (string | undefined)[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;
  const endCell = () => {
    row.push(text(cell));
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };
  while (i < src.length) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else cell += c;
      i++;
    } else if (c === '"' && cell === "") {
      quoted = true;
      i++;
    } else if (c === delim) {
      endCell();
      i++;
    } else if (c === "\n" || c === "\r") {
      endRow();
      i += c === "\r" && src[i + 1] === "\n" ? 2 : 1;
    } else {
      cell += c;
      i++;
    }
  }
  if (quoted) throw new SourceError("CSV: a quoted cell is not closed");
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

/** The most frequent candidate outside quotes in the first line; `,` on a tie. */
function sniffDelimiter(src: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (const c of src) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === "\n" || c === "\r")) break;
    else if (!quoted && c in counts) counts[c]!++;
  }
  return Object.entries(counts).reduce((best, e) =>
    e[1] > best[1] ? e : best,
  )[0];
}

function cellText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return text(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date)
    return value.toISOString().replace(/T00:00:00\.000Z$/, "");
  throw new SourceError(`unsupported cell value ${String(value)}`);
}

/** Reads a `.csv`, `.tsv` or `.xlsx` file. */
export async function readGrid(
  file: string,
  bytes: Uint8Array,
  delimiter?: string,
): Promise<Grid> {
  const ext = extname(file).toLowerCase();
  if (ext === ".csv" || ext === ".tsv" || ext === ".txt") {
    let decoded: string;
    try {
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new SourceError(`${file} is not UTF-8 text`);
    }
    return {
      sheets: [
        {
          rows: parseCsv(
            decoded,
            delimiter ?? (ext === ".tsv" ? "\t" : undefined),
          ),
        },
      ],
    };
  }
  if (ext === ".xlsx") {
    const sheets = await readXlsxFile(Buffer.from(bytes));
    return {
      sheets: sheets.map((s) => ({
        name: s.sheet,
        rows: s.data.map((r) => r.map(cellText)),
      })),
    };
  }
  throw new SourceError(
    `${file}: unsupported file type "${ext}" (expected .csv, .tsv or .xlsx)`,
  );
}

export const mediaType = (file: string): string | undefined =>
  ({
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    ".txt": "text/plain",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })[extname(file).toLowerCase()];
