const createCrudService = require('../services/crudService');
const crudRouter = require('./crudRouter');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { requirePermission } = require('../middleware/auth');
const Event = require('../models/Event');
const Student = require('../models/Student');
const Beneficiary = require('../models/Beneficiary');
const { programRules } = require('../validators/planning');
const { todayStart } = require('../utils/dates');

const service = createCrudService(require('../modules/programs'));

module.exports = crudRouter(service, programRules, (r, { idRule }) => {
  // How much is linked to this program. Students and beneficiaries are counted within the person's own scope.
  r.get('/:id/summary', requirePermission('programs.view'), idRule, validate, asyncHandler(async (req, res) => {
    const program = await service.findInScope(req.user, req.params.id);
    const own = req.user.role === 'admin' ? {} : { assignedManager: req.user._id };
    const [events, upcoming, students, beneficiaries] = await Promise.all([
      Event.countDocuments({ program: program._id }),
      Event.countDocuments({ program: program._id, date: { $gte: todayStart() }, status: { $in: ['upcoming', 'ongoing'] } }),
      Student.countDocuments({ program: program._id, status: { $ne: 'archived' }, ...own }),
      Beneficiary.countDocuments({ assignedProgram: program._id, status: { $ne: 'archived' }, ...own }),
    ]);
    success(res, { summary: { events, upcomingEvents: upcoming, students, beneficiaries } });
  }));
});
