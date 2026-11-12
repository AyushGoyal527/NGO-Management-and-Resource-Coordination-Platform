const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate, requireRole } = require('../middleware/auth');

// Each dashboard is locked to its own role; the data is scoped on the server.
router.use(authenticate);
router.get('/admin', requireRole('admin'), ctrl.admin);
router.get('/manager', requireRole('manager'), ctrl.manager);
router.get('/volunteer', requireRole('volunteer'), ctrl.volunteer);

module.exports = router;
