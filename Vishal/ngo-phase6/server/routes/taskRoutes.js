const { body, param } = require('express-validator');
const createCrudService = require('../services/crudService');
const createTaskService = require('../services/taskService');
const crudRouter = require('./crudRouter');
const validate = require('../middleware/validate');
const readOnlyFor = require('../middleware/readOnlyFor');
const { requirePermission } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { taskRules, statusRules, commentRules } = require('../validators/planning');

const service = createCrudService(require('../modules/tasks'));
const tasks = createTaskService(service);
const commentId = param('commentId').isMongoId().withMessage('Invalid comment id');
const OID = '[a-f\\d]{24}';

// Volunteers can see their tasks, move them forward and comment. Everything else (edit, delete, files, history) is for managers and admins.
const volunteerGuard = readOnlyFor('volunteer', {
  allow: [new RegExp(`^/${OID}/status$`), new RegExp(`^/${OID}/comments$`), new RegExp(`^/${OID}/comments/${OID}$`)],
  blockReads: [new RegExp(`^/${OID}/history$`)],
});
// Managers need tasks.edit to change a status; a volunteer only needs to be on the task.
const canMove = (req, res, next) => (req.user.role === 'volunteer' ? next() : requirePermission('tasks.edit')(req, res, next));

module.exports = crudRouter(service, taskRules, (r, { idRule }) => {
  r.post('/:id/status', requirePermission('tasks.view'), canMove, idRule, statusRules, validate,
    asyncHandler(async (req, res) => success(res, { item: await tasks.setStatus(req.user, req.params.id, req.body.status) }, 'Status updated')));
  r.post('/:id/comments', requirePermission('tasks.view'), idRule, commentRules, validate,
    asyncHandler(async (req, res) => success(res, { item: await tasks.addComment(req.user, req.params.id, req.body.text) }, 'Comment added', 201)));
  r.delete('/:id/comments/:commentId', requirePermission('tasks.view'), idRule, commentId, validate,
    asyncHandler(async (req, res) => success(res, { item: await tasks.removeComment(req.user, req.params.id, req.params.commentId) }, 'Comment deleted')));
}, (r) => r.use(volunteerGuard));

module.exports.service = service;
