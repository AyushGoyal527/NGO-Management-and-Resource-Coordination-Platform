const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');

// Everything here is limited to the signed-in person: nobody can read or change someone else's notifications.
exports.list = async (user, q) => {
  const filter = { user: user._id };
  if (q.unread === 'true') filter.read = false;
  if (typeof q.type === 'string' && q.type) filter.type = q.type;
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), 50);
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: user._id, read: false }),
  ]);
  return { items, unread, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

exports.unreadCount = (user) => Notification.countDocuments({ user: user._id, read: false });

exports.markRead = async (user, id) => {
  const res = await Notification.updateOne({ _id: id, user: user._id }, { read: true });
  if (!res.matchedCount) throw new ApiError(404, 'Notification not found');
};

exports.markAllRead = async (user) => (await Notification.updateMany({ user: user._id, read: false }, { read: true })).modifiedCount;

exports.remove = async (user, id) => {
  const res = await Notification.deleteOne({ _id: id, user: user._id });
  if (!res.deletedCount) throw new ApiError(404, 'Notification not found');
};

exports.clearRead = async (user) => (await Notification.deleteMany({ user: user._id, read: true })).deletedCount;
