/**
 * C4 — shared CSV export (lifted from the mortgage schedule view). Values
 * are stringified verbatim; anything containing a comma, quote or newline
 * is quoted per RFC 4180.
 */
export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
