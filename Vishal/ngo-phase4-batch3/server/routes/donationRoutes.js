const createCrudService = require('../services/crudService');
const donationService = require('../services/donationService');
const crudRouter = require('./crudRouter');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { donationRules, dateQueryRules } = require('../validators/resources');

const service = createCrudService(require('../modules/donations'));

module.exports = crudRouter(
  service,
  donationRules,
  (r, { idRule }) => {
    r.get('/:id/receipt', requirePermission('donations.view'), idRule, validate, asyncHandler(async (req, res) => {
      const donation = await service.findInScope(req.user, req.params.id);
      const pdf = await donationService.receipt(donation);
      await logActivity({ user: req.user._id, action: 'receipt', module: 'donations', recordId: donation._id, newValue: { receiptNumber: donation.receiptNumber } });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${donation.receiptNumber}.pdf"`);
      pdf.pipe(res);
      pdf.end();
    }));

    r.get('/:id/donor-history', requirePermission('donations.view'), idRule, validate, asyncHandler(async (req, res) => {
      const donation = await service.findInScope(req.user, req.params.id);
      success(res, await donationService.donorHistory(donation));
    }));
  },
  (r) => {
    r.get('/stats', requirePermission('donations.view'), dateQueryRules, validate, asyncHandler(async (req, res) => success(res, await donationService.stats(req.query))));
    r.get('/campaigns', requirePermission('donations.view'), asyncHandler(async (req, res) => success(res, { items: await donationService.campaigns() })));
    // Exporting needs the dedicated export permission as well as permission to see donations.
    r.get('/export', requirePermission('donations.view'), requirePermission('reports.export'), dateQueryRules, validate, asyncHandler(async (req, res) => {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="donations-${new Date().toISOString().slice(0, 10)}.csv"`);
      await logActivity({ user: req.user._id, action: 'export', module: 'donations', newValue: { filters: req.query } });
      await donationService.streamCsv(res, service.buildFilter(req.query, req.user));
    }));
  },
);
