/**
 * CSV export utility — generates and downloads CSV files from tabular data.
 * No external dependencies. Works in all modern browsers.
 */

export function downloadCsv(
  rows: Record<string, string | number | boolean | null | undefined>[],
  columns: { key: string; header: string }[],
  filename: string,
): void {
  if (rows.length === 0) {
    return;
  }

  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerRow = columns.map((c) => escape(c.header)).join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '';
        return escape(String(val));
      })
      .join(','),
  );

  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
