const { body } = require('express-validator');
const createCrudService = require('../services/crudService');
const crudRouter = require('./crudRouter');
const validate = require('../middleware/validate');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { studentRules } = require('../validators/resources');

const service = createCrudService(require('../modules/students'));
const day = (d) => new Date(d).toISOString().slice(0, 10);

module.exports = crudRouter(service, studentRules, (r, { idRule }) => {
  // Attendance tracking: one record per day, re-posting a date updates it.
  r.post('/:id/attendance', requirePermission('students.edit'), idRule,
    body('date').isISO8601().withMessage('Enter a valid date'), body('present').isBoolean().withMessage('Present must be true or false'),
    validate, asyncHandler(async (req, res) => {
      const student = await service.findInScope(req.user, req.params.id);
      const when = new Date(req.body.date);
      if (when > new Date(Date.now() + 24 * 60 * 60 * 1000)) throw new ApiError(400, 'Attendance cannot be marked for a future date');
      const present = req.body.present === true || req.body.present === 'true';
      const existing = student.attendance.find((a) => day(a.date) === day(when));
      if (existing) existing.present = present; else student.attendance.push({ date: when, present });
      student.attendance.sort((a, b) => b.date - a.date);
      await student.save();
      await logActivity({ user: req.user._id, action: 'attendance', module: 'students', recordId: student._id, newValue: { date: day(when), present } });
      success(res, { item: await service.get(req.user, req.params.id) }, 'Attendance saved');
    }));
});
