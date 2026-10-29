const router = require('express').Router();
const ctrl = require('../controllers/userController');
const validate = require('../middleware/validate');
const { authenticate, requireRole, requirePermission } = require('../middleware/auth');
const v = require('../validators/users');

router.use(authenticate);

router.get('/stats', requirePermission('users.view'), ctrl.stats);
router.get('/permission-catalog', requirePermission('users.view'), ctrl.catalog);
router.get('/', requirePermission('users.view'), ctrl.list);
router.post('/', requirePermission('users.create'), v.createUserRules, validate, ctrl.create);

router.get('/:id', requirePermission('users.view'), v.idRules, validate, ctrl.get);
router.put('/:id', requirePermission('users.edit'), v.updateUserRules, validate, ctrl.update);
router.patch('/:id/status', requirePermission('users.edit'), v.statusRules, validate, ctrl.setStatus);
router.delete('/:id', requirePermission('users.delete'), v.idRules, validate, ctrl.archive);

// Admin-only: these control who can do what.
router.patch('/:id/role', requireRole('admin'), v.roleRules, validate, ctrl.setRole);
router.patch('/:id/permissions', requireRole('admin'), v.permissionsRules, validate, ctrl.setPermissions);
router.post('/:id/reset-password', requireRole('admin'), v.resetPasswordRules, validate, ctrl.resetPassword);

module.exports = router;
