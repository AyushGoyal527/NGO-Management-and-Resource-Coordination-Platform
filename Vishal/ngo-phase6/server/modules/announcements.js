const Announcement = require('../models/Announcement');
const ApiError = require('../utils/ApiError');
const { notifyRoles } = require('../utils/notify');

const same = (a, b) => String(a?._id || a) === String(b);

// Admins see every announcement. A manager sees the ones they wrote plus those addressed to everyone or to managers.
const scopeFilter = (user) => (user.role === 'admin' ? {} : { $or: [{ createdBy: user._id }, { audience: { $in: ['all', 'managers'] } }] });

module.exports = {
  module: 'announcements', label: 'Announcement', model: Announcement, scoped: false, nameField: 'title', scopeFilter,
  searchFields: ['title', 'message'], sortable: ['title', 'createdAt', 'expiresAt', 'audience'],
  filters: { audience: 'audience' },
  populate: [{ path: 'createdBy', select: 'name' }],
  fields: ['title', 'message', 'audience', 'expiresAt'],
  stamp(data, user) { data.createdBy = user._id; if (user.role !== 'admin' && !data.audience) data.audience = 'volunteers'; },

  async beforeSave(data, { user, isCreate, existing }) {
    const admin = user.role === 'admin';
    if (!admin && data.audience && data.audience !== 'volunteers') throw new ApiError(403, 'Managers can post announcements to volunteers only');
    if (existing && !admin && !same(existing.createdBy, user._id)) throw new ApiError(403, 'You can only change announcements you posted');
    if (isCreate && data.expiresAt && new Date(data.expiresAt) <= new Date()) throw new ApiError(400, 'The expiry date must be in the future');
  },
  async beforeRemove(doc, { user }) {
    if (user.role !== 'admin' && !same(doc.createdBy, user._id)) throw new ApiError(403, 'You can only delete announcements you posted');
  },
  // Tell the people it is addressed to. (Editing later does not notify again.)
  async afterSave(doc, { user, isCreate }) {
    if (!isCreate) return;
    const roles = { all: ['admin', 'manager', 'volunteer'], managers: ['manager'], volunteers: ['volunteer'] }[doc.audience] || [];
    await notifyRoles(roles, { type: 'announcement', title: `Announcement: ${doc.title}`, message: String(doc.message).slice(0, 120) }, user._id);
  },
};
