// CSV helpers. Cells that start with = + - @ are prefixed with ' so Excel never runs them as formulas.
const cell = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

exports.csvCell = cell;
exports.csvRow = (values) => `${values.map(cell).join(',')}\r\n`;
