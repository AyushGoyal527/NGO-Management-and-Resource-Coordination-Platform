const router = require('express').Router();
const { param, query } = require('express-validator');
const service = require('../services/notificationService');
const alerts = require('../services/alertService');
const Notification = require('../models/Notification');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { authenticate, requireRole } = require('../middleware/auth');

const idRule = param('id').isMongoId().withMessage('Invalid id');
const types = Notification.schema.path('type').enumValues;

// Every route works on the signed-in person's own notifications only.
router.use(authenticate);
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'), query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit'),
  query('unread').optional().isIn(['true', 'false']).withMessage('Invalid filter'), query('type').optional({ checkFalsy: true }).isIn(types).withMessage('Invalid type'),
], validate, asyncHandler(async (req, res) => success(res, await service.list(req.user, req.query))));
router.get('/unread-count', asyncHandler(async (req, res) => success(res, { unread: await service.unreadCount(req.user) })));
router.patch('/read-all', asyncHandler(async (req, res) => success(res, { updated: await service.markAllRead(req.user) }, 'All marked as read')));
router.delete('/read', asyncHandler(async (req, res) => success(res, { removed: await service.clearRead(req.user) }, 'Read notifications cleared')));
// Admin only: run the deadline, event and stock checks now instead of waiting for the hourly run.
router.post('/run-checks', requireRole('admin'), asyncHandler(async (req, res) => success(res, await alerts.runAlerts(), 'Checks completed')));
router.patch('/:id/read', idRule, validate, asyncHandler(async (req, res) => { await service.markRead(req.user, req.params.id); success(res, {}, 'Marked as read'); }));
router.delete('/:id', idRule, validate, asyncHandler(async (req, res) => { await service.remove(req.user, req.params.id); success(res, {}, 'Notification removed'); }));

module.exports = router;
