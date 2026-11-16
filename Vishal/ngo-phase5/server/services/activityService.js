const ActivityLog = require('../models/ActivityLog');
const { zoneDayStart } = require('../utils/dates');
const { csvRow } = require('../utils/csv');

const DAY = 24 * 60 * 60 * 1000;

// from/to are whole days in the organisation's timezone, both included.
function buildFilter(q) {
  const f = {};
  ['module', 'action'].forEach((k) => { if (typeof q[k] === 'string' && q[k]) f[k] = q[k]; });
  if (q.user) f.user = q.user;
  if (q.recordId) f.recordId = q.recordId;
  const range = {};
  if (q.from) range.$gte = zoneDayStart(q.from);
  if (q.to) range.$lt = new Date(zoneDayStart(q.to).getTime() + DAY);
  if (Object.keys(range).length) f.timestamp = range;
  return f;
}
exports.buildFilter = buildFilter;

exports.list = async (q) => {
  const filter = buildFilter(q);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ timestamp: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name role').lean(),
    ActivityLog.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

// Values for the filter dropdowns.
exports.filters = async () => {
  const User = require('../models/User');
  const [modules, actions, userIds] = await Promise.all([ActivityLog.distinct('module'), ActivityLog.distinct('action'), ActivityLog.distinct('user')]);
  const users = await User.find({ _id: { $in: userIds.filter(Boolean).slice(0, 500) } }).sort('name').select('name role').lean();
  return { modules: modules.sort(), actions: actions.sort(), users };
};

const MAX_EXPORT = 50000;
exports.streamCsv = async (res, q) => {
  res.write('﻿');
  res.write(csvRow(['Time', 'Person', 'Role', 'Module', 'Action', 'Record id', 'Before', 'After']));
  const cursor = ActivityLog.find(buildFilter(q)).sort({ timestamp: -1, _id: -1 }).limit(MAX_EXPORT).populate('user', 'name role').lean().cursor();
  try {
    for await (const a of cursor) {
      res.write(csvRow([a.timestamp.toISOString(), a.user?.name || 'Unknown', a.user?.role, a.module, a.action, a.recordId ? String(a.recordId) : '',
        a.previousValue === undefined ? '' : JSON.stringify(a.previousValue), a.newValue === undefined ? '' : JSON.stringify(a.newValue)]));
    }
    res.end();
  } catch (err) { res.destroy(err); }
};
