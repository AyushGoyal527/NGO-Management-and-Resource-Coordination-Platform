const router = require('express').Router();
const { query } = require('express-validator');
const service = require('../services/activityService');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { authenticate, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// The activity log shows who did what across the whole system, so it is for admins only.
router.use(authenticate, requireRole('admin'));

const rules = [
  query('user').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid person'),
  query('recordId').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid record'),
  query('module').optional().isString().isLength({ max: 40 }).withMessage('Invalid module'),
  query('action').optional().isString().isLength({ max: 60 }).withMessage('Invalid action'),
  query('from').optional({ checkFalsy: true }).isISO8601({ strict: true }).withMessage('Enter a valid start date'),
  query('to').optional({ checkFalsy: true }).isISO8601({ strict: true }).withMessage('Enter a valid end date'),
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  query('to').custom((to, { req }) => !to || !req.query.from || to >= req.query.from).withMessage('The start date is after the end date'),
];

router.get('/filters', asyncHandler(async (req, res) => success(res, await service.filters())));
router.get('/export', rules, validate, asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="activity-log-${new Date().toISOString().slice(0, 10)}.csv"`);
  await logActivity({ user: req.user._id, action: 'export', module: 'activity-logs', newValue: { filters: req.query } });
  await service.streamCsv(res, req.query);
}));
router.get('/', rules, validate, asyncHandler(async (req, res) => success(res, await service.list(req.query))));

module.exports = router;
