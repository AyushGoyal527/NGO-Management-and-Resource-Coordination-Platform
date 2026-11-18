const PDFDocument = require('pdfkit');

// The built-in PDF fonts only cover Latin text, so anything else (for example Devanagari names) is shown as "?" rather than garbage.
const safe = (v) => String(v ?? '').normalize('NFC').replace(/₹/g, 'Rs.').replace(/[^\x20-\x7E -ÿ]/g, '?');

// A landscape table report. Column widths follow each column's `weight`; the header row repeats on every page.
module.exports = function buildReportPdf({ org = {}, title, filtersText, generatedBy, generatedOn, summary = [], columns, rows, note }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true, info: { Title: title } });
  const left = 36;
  const W = doc.page.width - 72;
  const totalWeight = columns.reduce((s, c) => s + (c.weight || 1), 0);
  const widths = columns.map((c) => (W * (c.weight || 1)) / totalWeight);
  const ROW = 17;
  const bottom = () => doc.page.height - 50;

  doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f3d31').text(safe(org.name || 'NGO report'), left, 36);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(safe(title), left, doc.y + 2);
  doc.font('Helvetica').fontSize(8).fillColor('#475569').text(safe(`Generated on ${generatedOn}${generatedBy ? ` by ${generatedBy}` : ''}`), left, doc.y + 2);
  if (filtersText) doc.text(safe(`Filters: ${filtersText}`), left, doc.y + 1, { width: W });
  if (summary.length) {
    doc.moveDown(0.4).font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(safe(summary.map((s) => `${s.label}: ${s.value}`).join('   |   ')), left, doc.y, { width: W });
  }
  doc.moveDown(0.6);

  const header = (y) => {
    doc.rect(left, y, W, ROW).fill('#17805f');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    let x = left;
    columns.forEach((c, i) => { doc.text(safe(c.label), x + 4, y + 5, { width: widths[i] - 8, height: 10, ellipsis: true, lineBreak: false }); x += widths[i]; });
    return y + ROW;
  };

  let y = header(doc.y);
  rows.forEach((r, n) => {
    if (y + ROW > bottom()) { doc.addPage(); y = header(36); }
    if (n % 2) doc.rect(left, y, W, ROW).fill('#f1f5f9');
    doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
    let x = left;
    columns.forEach((c, i) => {
      const align = c.type === 'number' || c.type === 'money' ? 'right' : 'left';
      doc.text(safe(r[c.key]), x + 4, y + 5, { width: widths[i] - 8, height: 10, ellipsis: true, lineBreak: false, align });
      x += widths[i];
    });
    y += ROW;
  });
  if (!rows.length) doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569').text('No records match these filters.', left, y + 8);
  if (note && y + 30 > bottom()) { doc.addPage(); y = 36; }
  if (note) doc.font('Helvetica-Oblique').fontSize(8).fillColor('#475569').text(safe(note), left, y + 8, { width: W });

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // writing inside the bottom margin would otherwise make PDFKit add a blank page
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(`Page ${i + 1} of ${range.count}`, left, doc.page.height - 30, { width: W, align: 'right', lineBreak: false });
  }
  return doc;
};
