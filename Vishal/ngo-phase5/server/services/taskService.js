const Task = require('../models/Task');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');
const { notify } = require('../utils/notify');
const { ids } = require('../modules/tasks');

// What a volunteer may do to their own task. Managers and admins can move a task to any other status (reopen, cancel, ...).
const VOLUNTEER_MOVES = { assigned: ['accepted', 'inProgress'], accepted: ['inProgress', 'completed'], inProgress: ['completed'] };
const STATUS_WORDS = { assigned: 'assigned', accepted: 'accepted', inProgress: 'in progress', completed: 'completed', cancelled: 'cancelled' };
const MAX_COMMENTS = 200;
const forbidden = (msg = 'You do not have permission to perform this action') => new ApiError(403, msg);

module.exports = (service) => {
  // Each person's link points at their own area (/admin/tasks, /manager/tasks or /volunteer/tasks).
  async function notifyMany(userIds, payload, actorId) {
    try {
      const uniq = [...new Set(userIds.filter(Boolean).map(String))].filter((x) => x !== String(actorId));
      const users = uniq.length ? await User.find({ _id: { $in: uniq } }).select('role') : [];
      const byRole = {};
      users.forEach((u) => { (byRole[u.role] = byRole[u.role] || []).push(u._id); });
      await Promise.all(Object.entries(byRole).map(([role, list]) => notify(list, { ...payload, link: `/${role}/tasks` })));
    } catch (err) { console.error('Notification failed:', err.message); }
  }

  async function setStatus(user, taskId, next) {
    const task = await service.findInScope(user, taskId);
    if (task.status === next) throw new ApiError(400, `This task is already ${STATUS_WORDS[next]}`);
    if (user.role === 'volunteer' && !(VOLUNTEER_MOVES[task.status] || []).includes(next)) {
      throw forbidden(`You cannot move a task from ${STATUS_WORDS[task.status]} to ${STATUS_WORDS[next]}`);
    }
    // Only applies if nobody changed the status in between, so two people cannot overwrite each other.
    const set = { status: next, ...(next === 'completed' ? { completedAt: new Date() } : {}) };
    const update = next === 'completed' ? { $set: set } : { $set: set, $unset: { completedAt: '' } };
    const changed = await Task.findOneAndUpdate({ _id: task._id, status: task.status }, update);
    if (!changed) throw new ApiError(409, 'This task was just changed by someone else. Refresh and try again');

    await logActivity({ user: user._id, action: 'update', module: 'tasks', recordId: task._id, previousValue: { status: task.status }, newValue: { status: next } });
    const targets = user.role === 'volunteer' ? [task.createdBy] : ids(task);
    await notifyMany(targets, { type: 'task-status', title: `${user.name} marked "${task.title}" as ${STATUS_WORDS[next]}` }, user._id);
    return service.get(user, taskId);
  }

  async function addComment(user, taskId, text) {
    const task = await service.findInScope(user, taskId);
    const res = await Task.updateOne({ _id: task._id, [`comments.${MAX_COMMENTS - 1}`]: { $exists: false } }, { $push: { comments: { user: user._id, text } } });
    if (!res.modifiedCount) throw new ApiError(400, `A task can have up to ${MAX_COMMENTS} comments`);
    await notifyMany([task.createdBy, ...ids(task)], { type: 'task-status', title: `${user.name} commented on "${task.title}"`, message: text.slice(0, 120) }, user._id);
    return service.get(user, taskId);
  }

  async function removeComment(user, taskId, commentId) {
    const task = await service.findInScope(user, taskId);
    const comment = task.comments.id(commentId);
    if (!comment) throw new ApiError(404, 'Comment not found');
    const isAuthor = String(comment.user) === String(user._id);
    const canModerate = user.role !== 'volunteer' && (user.role === 'admin' || user.permissions.includes('tasks.edit'));
    if (!isAuthor && !canModerate) throw forbidden('You can only delete your own comments');
    await Task.updateOne({ _id: task._id }, { $pull: { comments: { _id: comment._id } } });
    return service.get(user, taskId);
  }

  return { setStatus, addComment, removeComment, VOLUNTEER_MOVES };
};
