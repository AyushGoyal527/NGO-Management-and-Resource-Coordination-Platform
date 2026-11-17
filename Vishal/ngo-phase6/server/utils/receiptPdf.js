const PDFDocument = require('pdfkit');
const { amountInWords, formatINR } = require('./money');

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const label = (s) => String(s).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

// Standard PDF fonts have no rupee sign, so amounts are written as "Rs.".
module.exports = function buildReceipt(donation, org = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Donation receipt ${donation.receiptNumber}` } });
  const W = doc.page.width - 100;
  const orgName = org.name || 'Our Organisation';

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f3d31').text(orgName, { align: 'center' });
  if (org.tagline) doc.font('Helvetica-Oblique').fontSize(10).fillColor('#475569').text(org.tagline, { align: 'center' });
  const contact = [org.address, org.phone, org.email].filter(Boolean).join('  |  ');
  if (contact) doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#475569').text(contact, { align: 'center' });
  if (org.registrationNumber) doc.font('Helvetica').fontSize(9).text(`Registration no. ${org.registrationNumber}`, { align: 'center' });

  doc.moveDown(0.8);
  const y = doc.y;
  doc.moveTo(50, y).lineTo(50 + W, y).strokeColor('#17805f').lineWidth(1.5).stroke();
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text('DONATION RECEIPT', { align: 'center' });
  doc.moveDown(1);

  const meta = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Receipt no.', 50, meta).text('Date', 50 + W / 2, meta);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(donation.receiptNumber, 50, meta + 14).text(fmtDate(donation.donationDate), 50 + W / 2, meta + 14);
  doc.y = meta + 44;

  const rows = [
    ['Received with thanks from', donation.donorType === 'anonymous' ? 'Anonymous donor' : donation.donorName],
    donation.email && donation.donorType !== 'anonymous' ? ['Email', donation.email] : null,
    donation.phone && donation.donorType !== 'anonymous' ? ['Phone', donation.phone] : null,
    donation.donationType === 'money' || donation.amount > 0 ? ['Amount', formatINR(donation.amount)] : null,
    donation.donationType === 'money' || donation.amount > 0 ? ['Amount in words', amountInWords(donation.amount)] : null,
    ['Donation type', label(donation.donationType)],
    donation.paymentMethod ? ['Payment method', label(donation.paymentMethod)] : null,
    donation.transactionId ? ['Transaction ID', donation.transactionId] : null,
    donation.campaign ? ['Campaign', donation.campaign] : null,
    donation.purpose ? ['Purpose', donation.purpose] : null,
    donation.notes ? ['Notes', donation.notes] : null,
  ].filter(Boolean);

  rows.forEach(([k, v]) => {
    const top = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(k, 50, top, { width: 150 });
    const valueHeight = doc.font('Helvetica-Bold').fontSize(11).heightOfString(String(v), { width: W - 170 });
    doc.fillColor('#0f172a').text(String(v), 210, top, { width: W - 160 });
    doc.y = top + Math.max(valueHeight, 14) + 10;
    doc.moveTo(50, doc.y - 5).lineTo(50 + W, doc.y - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  });

  doc.moveDown(2);
  doc.font('Helvetica').fontSize(11).fillColor('#0f172a').text(`Thank you for supporting ${orgName}. Your generosity makes our work possible.`, 50, doc.y, { width: W, align: 'center' });
  doc.moveDown(3);
  doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text('This is a computer-generated receipt and does not need a signature.', 50, doc.y, { width: W, align: 'center' });
  return doc;
};
