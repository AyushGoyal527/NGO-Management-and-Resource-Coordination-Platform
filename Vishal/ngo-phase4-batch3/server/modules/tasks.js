const Task = require('../models/Task');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { OPEN_TASK_STATUSES, todayStart } = require('../utils/dates');
const { notify } = require('../utils/notify');

const id = (v) => String(v?._id || v);
const ids = (t) => [t.assignedUser, ...(t.assignedTeam || [])].filter(Boolean).map(id);

// Admins see every task. A manager sees tasks they created. A volunteer sees tasks they (or their team) were given.
const scopeFilter = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'manager') return { $or: [{ createdBy: user._id }, { assignedUser: user._id }] };
  return { $or: [{ assignedUser: user._id }, { assignedTeam: user._id }] };
};

module.exports = {
  module: 'tasks', label: 'Task', model: Task, scoped: false, nameField: 'title', hasDocuments: true, scopeFilter,
  searchFields: ['title', 'description', 'category', 'location'], dateField: 'dueDate',
  sortable: ['title', 'dueDate', 'status', 'createdAt'],
  filters: { status: 'status', priority: 'priority', assignee: 'assignedUser', category: 'category' },
  extraFilter: (q) => (q.overdue === 'true' ? { status: { $in: OPEN_TASK_STATUSES }, dueDate: { $lt: todayStart() } } : null),
  populate: [
    { path: 'assignedUser', select: 'name' }, { path: 'assignedTeam', select: 'name' }, { path: 'createdBy', select: 'name' },
    { path: 'documents' }, { path: 'comments.user', select: 'name role' },
  ],
  // status is not here on purpose: it only changes through POST /:id/status, which enforces the allowed moves.
  fields: ['title', 'description', 'assignedUser', 'assignedTeam', 'priority', 'startDate', 'dueDate', 'location', 'category'],
  stamp(data, user) { data.createdBy = user._id; },

  async beforeSave(data, { user, isCreate, existing }) {
    const touchesPeople = 'assignedUser' in data || 'assignedTeam' in data;
    const wanted = [data.assignedUser, ...(data.assignedTeam || [])].filter(Boolean).map(id);
    const had = existing ? ids(existing) : [];
    const added = wanted.filter((x) => !had.includes(x));
    const changed = touchesPeople && (added.length || ('assignedUser' in data && id(data.assignedUser || '') !== id(existing?.assignedUser || ''))
      || ('assignedTeam' in data && (data.assignedTeam || []).length !== (existing?.assignedTeam || []).length));
    if (changed && user.role !== 'admin' && !user.permissions.includes('tasks.assign')) {
      throw new ApiError(403, 'You do not have permission to assign tasks');
    }
    if (added.length) {
      const unique = [...new Set(added)];
      const found = await User.countDocuments({ _id: { $in: unique }, role: 'volunteer', status: 'active' });
      if (found !== unique.length) throw new ApiError(400, 'Tasks can only be assigned to active volunteers');
    }
    const start = data.startDate ?? existing?.startDate;
    const due = data.dueDate ?? existing?.dueDate;
    if (start && due && new Date(due) < new Date(start)) throw new ApiError(400, 'The due date cannot be before the start date');
    if (isCreate && data.dueDate && new Date(data.dueDate) < todayStart()) throw new ApiError(400, 'The due date cannot be in the past');
  },

  async afterSave(task, { user, before }) {
    const had = before ? ids(before) : [];
    const added = ids(task).filter((x) => !had.includes(x));
    await notify(added, { type: 'task-assigned', title: `New task: ${task.title}`, message: task.dueDate ? `Due ${new Date(task.dueDate).toISOString().slice(0, 10)}` : undefined, link: '/volunteer/tasks' }, user._id);
  },
};

module.exports.ids = ids;
