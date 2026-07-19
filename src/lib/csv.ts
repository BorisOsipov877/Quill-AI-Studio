// Small, dependency-free CSV helpers (RFC 4180-ish): handles quoted fields,
// escaped quotes (""), and commas / newlines inside quotes.

// Tokenize CSV text into an array of records (each a string[]).
export function parseCsvRecords(text: string): string[][] {
  const s = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Flush a trailing field/record (file without a final newline).
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export interface ProductRow {
  name: string;
  features: string;
}

export interface ParsedCsv {
  rows: ProductRow[];
  error?: string;
}

// Parse CSV text with a header row into product rows. Requires `name` and
// `features` columns (case-insensitive, any order).
export function parseProductCsv(text: string, maxRows = 100): ParsedCsv {
  const records = parseCsvRecords(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (records.length === 0) return { rows: [], error: "The file is empty." };

  const header = records[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const featuresIdx = header.indexOf("features");

  if (nameIdx === -1 || featuresIdx === -1) {
    return {
      rows: [],
      error: 'CSV must have a header row with "name" and "features" columns.',
    };
  }

  const rows: ProductRow[] = [];
  for (const record of records.slice(1)) {
    const name = (record[nameIdx] ?? "").trim();
    const features = (record[featuresIdx] ?? "").trim();
    if (!name && !features) continue; // skip blank lines
    rows.push({ name, features });
    if (rows.length >= maxRows) break;
  }

  if (rows.length === 0) return { rows: [], error: "No product rows found under the header." };
  return { rows };
}

// Escape a single CSV cell.
function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Serialize a header + rows into CSV text (CRLF line endings).
export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((r) => r.map((c) => escapeCell(c ?? "")).join(",")).join("\r\n");
}
