const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const { csvRow } = require('../utils/csv');
const { TZ } = require('../utils/dates');
const buildReportPdf = require('../utils/reportPdf');
const { REPORTS, byKey } = require('../config/reports');

const CAP = 20000; // rows in a CSV or preview
const PDF_CAP = 1000; // rows in a PDF (it is a printout, not a data dump)
const PREVIEW = 50;

const isAdmin = (u) => u.role === 'admin';
const has = (u, p) => isAdmin(u) || (u.permissions || []).includes(p);
// To run a report you need reports.view AND permission to see the data it is built from.
exports.canRun = (u, def) => has(u, 'reports.view') && has(u, `${def.source}.view`);
exports.canExport = (u) => has(u, 'reports.export');

exports.catalog = (user) => REPORTS.filter((d) => exports.canRun(user, d)).map((d) => ({
  key: d.key, title: d.title, description: d.description,
  filters: d.filters.filter((f) => !f.adminOnly || isAdmin(user)),
}));

exports.requireReport = (user, key) => {
  const def = byKey(key);
  if (!def) throw new ApiError(404, 'Report not found');
  if (!exports.canRun(user, def)) throw new ApiError(403, 'You do not have permission to perform this action');
  return def;
};

const cleanQuery = (def, user, q) => Object.fromEntries(def.filters
  .filter((f) => !f.adminOnly || isAdmin(user)).map((f) => f.param)
  .filter((p) => typeof q[p] === 'string' && q[p]).map((p) => [p, q[p]]));
exports.cleanQuery = cleanQuery;

const fmtNum = (n, dp) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
// What a person reads (preview and PDF). Date-only values are stored at midnight UTC, so they are shown as that UTC day.
function display(col, v) {
  if (v === undefined || v === null || v === '') return '';
  if (col.type === 'date') return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (col.type === 'datetime') return new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ });
  if (col.type === 'money') return fmtNum(v, 2);
  if (col.type === 'number') return fmtNum(v, 0 + (Number.isInteger(Number(v)) ? 0 : 2));
  return String(v);
}
// What a spreadsheet gets: plain numbers and ISO dates, so sorting and sums work.
function raw(col, v) {
  if (v === undefined || v === null) return '';
  if (col.type === 'date') return new Date(v).toISOString().slice(0, 10);
  if (col.type === 'datetime') return new Date(v).toISOString();
  return v;
}

async function fetchRows(def, user, q, cap) {
  const { filter, model, populate, sort } = def.query(user, cleanQuery(def, user, q));
  const query = populate.reduce((acc, p) => acc.populate(p), model.find(filter).sort(sort).limit(cap + 1));
  const rows = await query.lean();
  return { rows: rows.slice(0, cap), truncated: rows.length > cap };
}

const fmtSummary = (items) => items.map((s) => ({ label: s.label, value: typeof s.value === 'number' ? fmtNum(s.value, s.type === 'money' ? 2 : (Number.isInteger(s.value) ? 0 : 2)) : s.value }));
const cols = (def) => def.columns.map((c) => ({ key: c.key, label: c.label, type: c.type || 'text', weight: c.weight }));
const shape = (def, rows) => rows.map((r) => Object.fromEntries(def.columns.map((c) => [c.key, display(c, c.value(r))])));

exports.preview = async (user, def, q) => {
  const { rows, truncated } = await fetchRows(def, user, q, CAP);
  return { report: { key: def.key, title: def.title, description: def.description }, columns: cols(def), rows: shape(def, rows.slice(0, PREVIEW)), total: rows.length, truncated, previewLimit: PREVIEW, summary: fmtSummary(def.summary(rows)) };
};

exports.streamCsv = async (res, user, def, q) => {
  const { rows, truncated } = await fetchRows(def, user, q, CAP);
  res.write('﻿');
  res.write(csvRow(def.columns.map((c) => c.label)));
  rows.forEach((r) => res.write(csvRow(def.columns.map((c) => raw(c, c.value(r))))));
  res.end();
  return { rows: rows.length, truncated };
};

exports.buildPdf = async (user, def, q) => {
  const { rows, truncated } = await fetchRows(def, user, q, CAP);
  const org = (await Organization.findOne().lean()) || {};
  const applied = def.filters.map((f) => {
    const v = cleanQuery(def, user, q)[f.param];
    if (!v) return null;
    return `${f.label}: ${f.options?.find((o) => o.value === v)?.label || v}`;
  }).filter(Boolean).join('  |  ');
  const shown = rows.slice(0, PDF_CAP);
  const note = rows.length > PDF_CAP || truncated ? `Showing the first ${shown.length} of ${truncated ? `more than ${CAP}` : rows.length} rows. Download the CSV for everything.` : null;
  const doc = buildReportPdf({
    org, title: def.title, filtersText: applied, generatedBy: user.name, summary: fmtSummary(def.summary(rows)),
    generatedOn: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }),
    columns: cols(def), rows: shape(def, shown), note,
  });
  return { doc, rows: rows.length };
};
