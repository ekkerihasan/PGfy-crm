type Cell = string | number | boolean | Date | null | undefined;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** "2026-11-05 17:00" in IST — readable in Excel. */
export function formatIST(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * RFC 4180 escaping: wrap in quotes when the value contains a comma, quote or newline; double inner quotes.
 * Also neutralises spreadsheet formula injection (values starting with = + - @ are prefixed with ').
 */
export function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? formatIST(value) : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  // BOM so Excel opens UTF-8 correctly.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
