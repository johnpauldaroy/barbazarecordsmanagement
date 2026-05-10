import Papa from 'papaparse';

export function exportToCsv(filename, columns, rows) {
  const fields = columns.map((col) => col.header);
  const data = rows.map((row) =>
    columns.reduce((obj, col) => {
      obj[col.header] = col.accessor ? col.accessor(row) : row[col.key] ?? '';
      return obj;
    }, {})
  );

  const csv = Papa.unparse({ fields, data });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
