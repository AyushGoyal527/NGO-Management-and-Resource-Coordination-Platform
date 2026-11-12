const Program = require('../models/Program');
const Event = require('../models/Event');
const Student = require('../models/Student');
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// Programs are shared by the whole organisation: anyone with programs.view sees them all.
// A manager can change only programs they run (or ones nobody runs yet); admins can change any.
module.exports = {
  module: 'programs', label: 'Program', model: Program, scoped: false, scopeFilter: () => ({}), dateField: 'startDate',
  searchFields: ['name', 'description', 'location'],
  sortable: ['name', 'startDate', 'endDate', 'budget', 'status', 'createdAt'],
  filters: { status: 'status', type: 'type', manager: 'manager' },
  populate: [{ path: 'manager', select: 'name' }],
  fields: ['name', 'description', 'type', 'startDate', 'endDate', 'location', 'budget', 'manager', 'status'],
  stamp(data, user) { if (user.role !== 'admin') data.manager = user._id; },

  async beforeSave(data, { user, existing }) {
    const admin = user.role === 'admin';
    if (existing && !admin && existing.manager && String(existing.manager) !== String(user._id)) {
      throw new ApiError(403, 'Only the manager of this program or an admin can change it');
    }
    if (!admin) delete data.manager;
    if (data.manager && !(await User.exists({ _id: data.manager, role: { $in: ['manager', 'admin'] }, status: 'active' }))) throw new ApiError(400, 'The selected manager was not found');
    const start = 'startDate' in data ? data.startDate : existing?.startDate;
    const end = 'endDate' in data ? data.endDate : existing?.endDate;
    if (start && end && new Date(end) < new Date(start)) throw new ApiError(400, 'The end date cannot be before the start date');
  },

  // Deleting a program that students, beneficiaries or events point to would leave them dangling, so ask for "completed" instead.
  async beforeRemove(program, { user }) {
    if (user.role !== 'admin' && program.manager && String(program.manager) !== String(user._id)) throw new ApiError(403, 'Only the manager of this program or an admin can delete it');
    const [events, students, beneficiaries] = await Promise.all([
      Event.countDocuments({ program: program._id }), Student.countDocuments({ program: program._id }), Beneficiary.countDocuments({ assignedProgram: program._id }),
    ]);
    const n = (count, one, many) => count && `${count} ${count === 1 ? one : many}`;
    const used = [n(events, 'event', 'events'), n(students, 'student', 'students'), n(beneficiaries, 'beneficiary', 'beneficiaries')].filter(Boolean);
    if (used.length) throw new ApiError(409, `This program is still used by ${used.join(', ')}. Mark it as completed instead of deleting it.`);
  },
};
