const router = require('express').Router();
const { param, query } = require('express-validator');
const service = require('../services/reportService');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { authenticate, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const keyRule = param('key').matches(/^[a-z-]{1,40}$/).withMessage('Invalid report');
const rules = [
  query('from').optional({ checkFalsy: true }).isISO8601({ strict: true }).withMessage('Enter a valid start date'),
  query('to').optional({ checkFalsy: true }).isISO8601({ strict: true }).withMessage('Enter a valid end date'),
  query('to').custom((to, { req }) => !to || !req.query.from || to >= req.query.from).withMessage('The start date is after the end date'),
  query('*').optional().isString().isLength({ max: 60 }).withMessage('Invalid filter'),
];

router.use(authenticate, requirePermission('reports.view'));
router.get('/', asyncHandler(async (req, res) => success(res, { items: service.catalog(req.user), canExport: service.canExport(req.user) })));

router.get('/:key', keyRule, rules, validate, asyncHandler(async (req, res) => {
  const def = service.requireReport(req.user, req.params.key);
  success(res, await service.preview(req.user, def, req.query));
}));

// Downloads need the export permission on top of permission to run the report. Every download is written to the activity log.
router.get('/:key/export', requirePermission('reports.export'), keyRule, rules, query('format').isIn(['csv', 'pdf']).withMessage('Choose CSV or PDF'), validate, asyncHandler(async (req, res) => {
  const def = service.requireReport(req.user, req.params.key);
  const stamp = new Date().toISOString().slice(0, 10);
  const filters = service.cleanQuery(def, req.user, req.query);
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${def.key}-${stamp}.csv"`);
    const out = await service.streamCsv(res, req.user, def, req.query);
    await logActivity({ user: req.user._id, action: 'export', module: 'reports', newValue: { report: def.key, format: 'csv', filters, rows: out.rows } });
    return;
  }
  const { doc, rows } = await service.buildPdf(req.user, def, req.query);
  await logActivity({ user: req.user._id, action: 'export', module: 'reports', newValue: { report: def.key, format: 'pdf', filters, rows } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${def.key}-${stamp}.pdf"`);
  doc.pipe(res);
  doc.end();
}));

module.exports = router;
