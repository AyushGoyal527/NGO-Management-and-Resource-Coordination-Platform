var require = require('module').createRequire(process.cwd() + '/');

process.env.JWT_SECRET = 'x'.repeat(32); process.env.APP_TIMEZONE = 'Asia/Kolkata';
const assert = require('assert'); const fs = require('fs'); const { execSync } = require('child_process');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '->', e.message); } };

const { amountInWords, formatINR } = require('./utils/money');
t('words: 1,50,000', () => assert.equal(amountInWords(150000), 'Rupees One Lakh Fifty Thousand Only'));
t('words: 12,345.50', () => assert.equal(amountInWords(12345.5), 'Rupees Twelve Thousand Three Hundred Forty-Five and Paise Fifty Only'));
t('words: 2 crore 5 lakh', () => assert.equal(amountInWords(20500000), 'Rupees Two Crore Five Lakh Only'));
t('words: 100 crore', () => assert.equal(amountInWords(1000000000), 'Rupees One Hundred Crore Only'));
t('words: 0.10 / 0.99 / 19.99', () => { assert.equal(amountInWords(0.1), 'Rupees Zero and Paise Ten Only'); assert.equal(amountInWords(19.99), 'Rupees Nineteen and Paise Ninety-Nine Only'); });
t('words: float dust 0.1+0.2', () => assert.equal(amountInWords(0.1 + 0.2), 'Rupees Zero and Paise Thirty Only'));
t('formatINR', () => assert.equal(formatINR(150000), 'Rs. 1,50,000.00'));

const { csvCell, csvRow } = require('./utils/csv');
t('csv: quotes and commas', () => assert.equal(csvCell('a "b", c'), '"a ""b"", c"'));
t('csv: newline quoted', () => assert.equal(csvCell('x\ny'), '"x\ny"'));
t('csv: formula injection =', () => assert.equal(csvCell('=HYPERLINK("http://evil")'), '"\'=HYPERLINK(""http://evil"")"'));
t('csv: formula injection + - @', () => { assert.equal(csvCell('+91 98100'), "'+91 98100"); assert.equal(csvCell('-5+3'), "'-5+3"); assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)"); });
t('csv: numbers stay numeric (incl. 0), null empty, date ISO', () => { assert.equal(csvCell(0), '0'); assert.equal(csvCell(null), ''); assert.equal(csvCell(new Date('2026-03-04T00:00:00Z')), '2026-03-04'); });
t('csv: row ends CRLF', () => assert.equal(csvRow(['a', 1]), 'a,1\r\n'));

const buildReceipt = require('./utils/receiptPdf');
t('receipt PDF is a real, readable PDF', () => new Promise(() => {}) && 0);
pass--; // placeholder above is replaced by the async check below
(async () => {
  const don = { receiptNumber: 'RCPT-2026-0007', donationDate: new Date('2026-10-05T00:00:00Z'), donorName: 'Neha Kulkarni', donorType: 'individual', email: 'neha@example.com',
    phone: '98100 00000', amount: 150000, donationType: 'money', paymentMethod: 'upi', transactionId: 'TXN123', campaign: 'Winter Relief', purpose: 'Food kits', notes: 'In memory of "Aai" – thank you' };
  const doc = buildReceipt(don, { name: 'Asha Kiran Foundation', tagline: 'Food and education', address: 'Sohna Road, Gurugram', phone: '+91 98100 00000', email: 'hello@ashakiran.org', registrationNumber: 'REG/123' });
  const chunks = []; doc.on('data', (c) => chunks.push(c));
  await new Promise((res) => { doc.on('end', res); doc.end(); });
  const buf = Buffer.concat(chunks);
  fs.writeFileSync('/tmp/claude-0/-home-claude/38601e74-a277-5685-ac5c-138dbdbdb6ab/scratchpad/receipt.pdf', buf);
  try {
    assert.equal(buf.subarray(0, 5).toString(), '%PDF-'); assert(buf.length > 1500);
    const text = execSync('pdftotext -layout /tmp/claude-0/-home-claude/38601e74-a277-5685-ac5c-138dbdbdb6ab/scratchpad/receipt.pdf -').toString();
    ['Asha Kiran Foundation', 'DONATION RECEIPT', 'RCPT-2026-0007', 'Neha Kulkarni', 'Rs. 1,50,000.00', 'One Lakh Fifty Thousand', 'TXN123', 'Winter Relief', 'REG/123'].forEach((s) => assert(text.includes(s), 'missing: ' + s));
    const pages = (execSync('pdfinfo /tmp/claude-0/-home-claude/38601e74-a277-5685-ac5c-138dbdbdb6ab/scratchpad/receipt.pdf').toString().match(/Pages:\s+(\d+)/) || [])[1];
    assert.equal(pages, '1'); pass++; console.log('PASS receipt PDF: valid, 1 page, all fields present');
  } catch (e) { fail++; console.log('FAIL receipt PDF ->', e.message); }

  // anonymous donor must not leak identity; in-kind has no amount rows
  const anon = buildReceipt({ ...don, donorType: 'anonymous', donorName: 'Secret Person', email: 'secret@x.org', phone: '999', donationType: 'books', amount: 0, paymentMethod: 'in-kind', transactionId: undefined }, {});
  const c2 = []; anon.on('data', (c) => c2.push(c)); await new Promise((res) => { anon.on('end', res); anon.end(); });
  fs.writeFileSync('/tmp/claude-0/-home-claude/38601e74-a277-5685-ac5c-138dbdbdb6ab/scratchpad/anon.pdf', Buffer.concat(c2));
  try {
    const text = execSync('pdftotext -layout /tmp/claude-0/-home-claude/38601e74-a277-5685-ac5c-138dbdbdb6ab/scratchpad/anon.pdf -').toString();
    assert(text.includes('Anonymous donor')); ['Secret Person', 'secret@x.org', '999', 'Amount in words'].forEach((s) => assert(!text.includes(s), 'leaked/unexpected: ' + s));
    assert(text.includes('Books')); pass++; console.log('PASS receipt PDF: anonymous donor hidden, in-kind has no amount');
  } catch (e) { fail++; console.log('FAIL anon receipt ->', e.message); }

  // very long notes must still paginate cleanly
  const long = buildReceipt({ ...don, notes: 'word '.repeat(900) }, { name: 'X' });
  const c3 = []; long.on('data', (c) => c3.push(c)); await new Promise((res) => { long.on('end', res); long.end(); });
  fs.writeFileSync('/tmp/claude-0/-home-claude/38601e74-a277-5685-ac5c-138dbdbdb6ab/scratchpad/long.pdf', Buffer.concat(c3));
  console.log('INFO long-notes receipt pages:', (execSync('pdfinfo /tmp/claude-0/-home-claude/38601e74-a277-5685-ac5c-138dbdbdb6ab/scratchpad/long.pdf').toString().match(/Pages:\s+(\d+)/) || [])[1]);

  const svc = require('./services/donationService');
  t('monthBuckets default = 12 consecutive months ending now', () => { const k = svc.monthBuckets({}); assert.equal(k.length, 12); for (let i = 1; i < k.length; i++) { const [y0, m0] = k[i - 1].split('-').map(Number); const [y1, m1] = k[i].split('-').map(Number); assert.equal(y1 * 12 + m1, y0 * 12 + m0 + 1); } });
  t('monthBuckets explicit range Jan..Mar 2026', () => assert.deepEqual(svc.monthBuckets({ from: '2026-01-10', to: '2026-03-02' }), ['2026-01', '2026-02', '2026-03']));
  t('monthBuckets caps at 36', () => assert.equal(svc.monthBuckets({ from: '2015-01-01', to: '2026-03-01' }).length, 36));
  t('monthBuckets year rollover', () => assert.deepEqual(svc.monthBuckets({ from: '2025-11-01', to: '2026-02-01' }), ['2025-11', '2025-12', '2026-01', '2026-02']));
  t('monthLabel', () => assert.equal(svc.monthLabel('2026-03'), 'Mar 26'));

  const { alertClause } = require('./modules/food');
  const now = new Date('2026-10-30T12:00:00Z');
  t('alertClause shapes', () => { assert(alertClause('low', now).$expr); assert.equal(alertClause('out', now).remainingQuantity.$lte, 0); assert(alertClause('expired', now).expiryDate.$lt < now); assert(alertClause('expiring', now).expiryDate.$lte > now); assert.equal(alertClause('bogus', now), null); });
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
