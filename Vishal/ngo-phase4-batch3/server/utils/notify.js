const Notification = require('../models/Notification');

// Creates in-app notifications. Never lets a failure here break the request that caused it.
exports.notify = async (userIds, { type, title, message, link }, exceptId) => {
  try {
    const ids = [...new Set((userIds || []).filter(Boolean).map(String))].filter((id) => id !== String(exceptId || ''));
    if (ids.length) await Notification.insertMany(ids.map((user) => ({ user, type, title, message, link })));
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};
