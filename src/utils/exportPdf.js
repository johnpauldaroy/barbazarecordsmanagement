import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToPdf(filename, title, columns, rows, subtitle) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 40);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(subtitle, 40, 58);
    doc.setTextColor(0);
  }

  const generated = `Generated: ${new Date().toLocaleString('en-PH')}`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130);
  doc.text(generated, 40, subtitle ? 72 : 58);
  doc.setTextColor(0);

  const head = [columns.map((col) => col.header)];
  const body = rows.map((row) =>
    columns.map((col) => (col.accessor ? col.accessor(row) : String(row[col.key] ?? '')))
  );

  autoTable(doc, {
    startY: subtitle ? 86 : 72,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${filename}.pdf`);
}
