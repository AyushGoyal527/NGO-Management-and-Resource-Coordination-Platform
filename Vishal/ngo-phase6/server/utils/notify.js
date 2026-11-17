const Notification = require('../models/Notification');
const User = require('../models/User');

// Creates in-app notifications. Never lets a failure here break the request that caused it.
exports.notify = async (userIds, { type, title, message, link }, exceptId) => {
  try {
    const ids = [...new Set((userIds || []).filter(Boolean).map(String))].filter((id) => id !== String(exceptId || ''));
    if (ids.length) await Notification.insertMany(ids.map((user) => ({ user, type, title, message, link })));
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

// Inserts rows, silently skipping any that were already sent (same user and dedupeKey). Returns how many were new.
exports.createOnce = async (rows) => {
  if (!rows.length) return 0;
  try {
    return (await Notification.insertMany(rows, { ordered: false })).length;
  } catch (err) {
    const failed = err.writeErrors || [];
    const code = (e) => e.err?.code ?? e.code;
    if (!(err.code === 11000 || (failed.length && failed.every((e) => code(e) === 11000)))) throw err; // only "already sent" is expected
    return err.insertedDocs?.length ?? err.insertedCount ?? Math.max(rows.length - (failed.length || 1), 0);
  }
};

// Active people who may see a module: admins plus anyone granted `permission`. Used for alerts like "donation received".
exports.usersWithPermission = (permission) =>
  User.find({ status: 'active', $or: [{ role: 'admin' }, { permissions: permission }] }).select('role').lean();

// Notify everyone who has `permission`; each person's link points into their own area, e.g. /manager/donations.
exports.notifyByPermission = async (permission, { path, ...payload }, exceptId) => {
  try {
    const people = (await exports.usersWithPermission(permission)).filter((u) => String(u._id) !== String(exceptId || ''));
    if (!people.length) return;
    await Notification.insertMany(people.map((u) => ({ ...payload, user: u._id, link: `/${u.role}${path}` })));
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

// Notify everyone with one of these roles (active accounts only); each role's link points into its own area.
exports.notifyRoles = async (roles, payload, exceptId) => {
  try {
    const people = await User.find({ status: 'active', role: { $in: roles } }).select('role').lean();
    await Promise.all(roles.map((role) => exports.notify(people.filter((u) => u.role === role).map((u) => u._id), { ...payload, link: `/${role}` }, exceptId)));
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};
