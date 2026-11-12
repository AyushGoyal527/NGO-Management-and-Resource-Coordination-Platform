const Donation = require('../models/Donation');
const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const { csvRow } = require('../utils/csv');
const buildReceipt = require('../utils/receiptPdf');

const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parseRange(q) {
  const range = {};
  if (q.from && !Number.isNaN(Date.parse(q.from))) range.$gte = new Date(q.from);
  if (q.to && !Number.isNaN(Date.parse(q.to))) range.$lte = new Date(new Date(q.to).getTime() + 24 * 60 * 60 * 1000 - 1);
  return range;
}

// "2026-10" for a date, in the NGO's time zone.
function yearMonth(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}`;
}

// Month buckets for the chart, zero-filled. No range = last 12 months. Never more than 36.
function monthBuckets(q) {
  const now = new Date();
  const end = q.to && !Number.isNaN(Date.parse(q.to)) ? new Date(q.to) : now;
  const start = q.from && !Number.isNaN(Date.parse(q.from)) ? new Date(q.from) : new Date(end.getFullYear(), end.getMonth() - 11, 1);
  const [ey, em] = yearMonth(end).split('-').map(Number);
  let [y, m] = yearMonth(start).split('-').map(Number);
  const keys = [];
  while ((y < ey || (y === ey && m <= em)) && keys.length < 120) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return keys.slice(-36);
}

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
};

exports.stats = async (q) => {
  const range = parseRange(q);
  const match = Object.keys(range).length ? { donationDate: range } : {};
  const received = { ...match, status: 'received' };
  const group = (key) => [
    { $match: received },
    { $group: { _id: { $ifNull: [key, 'unspecified'] }, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    { $sort: { amount: -1, count: -1 } },
  ];
  const buckets = monthBuckets(q);

  const [totals, awaiting, byType, byMethod, byCampaign, byMonth] = await Promise.all([
    Donation.aggregate([{ $match: received }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 }, paid: { $sum: { $cond: [{ $gt: ['$amount', 0] }, 1, 0] } } } }]),
    Donation.countDocuments({ ...match, status: { $in: ['inquiry', 'pending'] } }),
    Donation.aggregate(group('$donationType')),
    Donation.aggregate(group('$paymentMethod')),
    Donation.aggregate([...group('$campaign'), { $limit: 6 }]),
    Donation.aggregate([
      { $match: { ...received, donationDate: { ...(match.donationDate || {}), $gte: match.donationDate?.$gte || new Date(Date.UTC(+buckets[0].slice(0, 4), +buckets[0].slice(5) - 1, 1) - 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$donationDate', timezone: TZ } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const t = totals[0] || { amount: 0, count: 0, paid: 0 };
  const monthMap = Object.fromEntries(byMonth.map((r) => [r._id, r]));
  const pretty = (rows) => rows.map((r) => ({ name: String(r._id).replace(/-/g, ' '), count: r.count, amount: r.amount }));
  return {
    totals: { amount: t.amount, count: t.count, average: t.paid ? Math.round(t.amount / t.paid) : 0, awaiting },
    byMonth: buckets.map((k) => ({ label: monthLabel(k), amount: monthMap[k]?.amount || 0, count: monthMap[k]?.count || 0 })),
    byType: pretty(byType),
    byMethod: pretty(byMethod),
    byCampaign: byCampaign.map((r) => ({ name: r._id === 'unspecified' ? 'No campaign' : r._id, count: r.count, amount: r.amount })),
  };
};

exports.campaigns = async () => (await Donation.distinct('campaign')).filter(Boolean).sort((a, b) => a.localeCompare(b));

exports.donorHistory = async (donation) => {
  const match = donation.donorType === 'anonymous'
    ? { _id: donation._id }
    : donation.email
      ? { email: donation.email }
      : { donorName: new RegExp(`^${escapeRegex(donation.donorName)}$`, 'i'), donorType: { $ne: 'anonymous' } };
  const items = await Donation.find(match).sort({ donationDate: -1 }).limit(50)
    .select('donationDate amount donationType status receiptNumber campaign').lean();
  const received = items.filter((d) => d.status === 'received');
  return { items, totals: { count: received.length, amount: received.reduce((s, d) => s + (d.amount || 0), 0) } };
};

const HEADERS = ['Receipt no', 'Date', 'Donor', 'Donor type', 'Email', 'Phone', 'Donation type', 'Amount (INR)', 'Payment method',
  'Transaction ID', 'Campaign', 'Purpose', 'Status', 'Notes'];

// Streams the CSV so large exports do not sit in memory. The BOM makes Excel read UTF-8 names correctly.
exports.streamCsv = async (res, filter) => {
  const cursor = Donation.find(filter).sort({ donationDate: -1, _id: 1 }).lean().cursor();
  let started = false;
  try {
    for await (const d of cursor) {
      if (!started) {
        started = true;
        res.write('﻿');
        res.write(csvRow(HEADERS));
      }
      res.write(csvRow([d.receiptNumber, d.donationDate, d.donorName, d.donorType, d.email, d.phone, d.donationType, d.amount,
        d.paymentMethod, d.transactionId, d.campaign, d.purpose, d.status, d.notes]));
    }
    if (!started) { res.write('﻿'); res.write(csvRow(HEADERS)); }
    res.end();
  } catch (err) {
    res.destroy(err); // headers are already sent, so the only honest option is to cut the download
  }
};

exports.receipt = async (donation) => {
  if (donation.status !== 'received' || !donation.receiptNumber) throw new ApiError(400, 'A receipt is only available once the donation is received');
  const org = await Organization.findOne().lean();
  return buildReceipt(donation, org || {});
};

exports.monthBuckets = monthBuckets;
exports.monthLabel = monthLabel;
