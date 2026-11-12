const Event = require('../models/Event');
const Program = require('../models/Program');
const User = require('../models/User');
const Student = require('../models/Student');
const Beneficiary = require('../models/Beneficiary');
const Resource = require('../models/Resource');
const ApiError = require('../utils/ApiError');
const { todayStart } = require('../utils/dates');
const { notify } = require('../utils/notify');

const id = (v) => String(v?._id || v);
const added = (next, prev = []) => [...new Set((next || []).map(id))].filter((x) => !prev.map(id).includes(x));
const allExist = async (Model, list, filter = {}) => !list.length || (await Model.countDocuments({ _id: { $in: list }, ...filter })) === list.length;

// Admins see every event. A manager sees events they manage or organised. A volunteer sees events they are assigned to.
const scopeFilter = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'manager') return { $or: [{ manager: user._id }, { organizer: user._id }] };
  return { assignedVolunteers: user._id };
};

module.exports = {
  module: 'events', label: 'Event', model: Event, scoped: false, hasDocuments: true, scopeFilter, dateField: 'date',
  searchFields: ['name', 'description', 'location', 'programType'],
  sortable: ['name', 'date', 'status', 'location', 'createdAt'],
  filters: { status: 'status', program: 'program', manager: 'manager', volunteer: 'assignedVolunteers', type: 'programType' },
  extraFilter: (q) => (q.when === 'upcoming' ? { date: { $gte: todayStart() } } : q.when === 'past' ? { date: { $lt: todayStart() } } : null),
  populate: [
    { path: 'program', select: 'name' }, { path: 'manager', select: 'name' }, { path: 'organizer', select: 'name' },
    { path: 'assignedVolunteers', select: 'name' }, { path: 'documents' },
    { path: 'beneficiaries', select: 'name' }, { path: 'students', select: 'name' }, { path: 'requiredResources', select: 'name' },
  ],
  fields: ['name', 'description', 'date', 'startTime', 'endTime', 'location', 'programType', 'program', 'manager', 'assignedVolunteers',
    'beneficiaries', 'students', 'requiredResources', 'isPublic', 'status'],
  stamp(data, user) {
    data.organizer = user._id;
    if (user.role !== 'admin') data.manager = user._id; // admins may pick a manager; managers always own what they create
  },

  async beforeSave(data, { user, existing }) {
    const admin = user.role === 'admin';
    if (!admin) delete data.manager;
    if (data.manager && !(await User.exists({ _id: data.manager, role: { $in: ['manager', 'admin'] }, status: 'active' }))) throw new ApiError(400, 'The selected manager was not found');
    if (data.program && !(await Program.exists({ _id: data.program }))) throw new ApiError(400, 'The selected program was not found');

    const vols = added(data.assignedVolunteers, existing?.assignedVolunteers);
    if (!(await allExist(User, vols, { role: 'volunteer', status: 'active' }))) throw new ApiError(400, 'Only active volunteers can be assigned to an event');
    const mine = admin ? {} : { assignedManager: user._id }; // a manager can only attach their own students and beneficiaries
    if (!(await allExist(Beneficiary, added(data.beneficiaries, existing?.beneficiaries), mine))) throw new ApiError(400, 'One or more beneficiaries were not found');
    if (!(await allExist(Student, added(data.students, existing?.students), mine))) throw new ApiError(400, 'One or more students were not found');
    if (!(await allExist(Resource, added(data.requiredResources, existing?.requiredResources)))) throw new ApiError(400, 'One or more resources were not found');

    const start = 'startTime' in data ? data.startTime : existing?.startTime;
    const end = 'endTime' in data ? data.endTime : existing?.endTime;
    if (start && end && end <= start) throw new ApiError(400, 'The end time must be after the start time');
  },

  async afterSave(event, { user, isCreate, before }) {
    const when = new Date(event.date).toISOString().slice(0, 10);
    await notify(added(event.assignedVolunteers, before?.assignedVolunteers), { type: 'event-upcoming', title: `You are assigned to: ${event.name}`, message: `On ${when}${event.location ? ` at ${event.location}` : ''}`, link: '/volunteer/events' }, user._id);
    if (event.manager && (isCreate || id(before?.manager) !== id(event.manager))) {
      await notify([event.manager], { type: 'manager-assigned', title: `You manage the event: ${event.name}`, message: `On ${when}`, link: '/manager/events' }, user._id);
    }
  },
};
