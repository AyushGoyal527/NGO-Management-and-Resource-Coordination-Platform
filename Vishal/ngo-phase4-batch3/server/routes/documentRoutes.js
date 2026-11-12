const path = require('path');
const router = require('express').Router();
const { param } = require('express-validator');
const Document = require('../models/Document');
const modules = require('../modules');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { uploadsRoot } = require('../services/documentService');

router.use(authenticate);

// Downloads go through here (never a public folder): needs `<module>.view` AND the record must be in the person's scope.
router.get('/:id/download', param('id').isMongoId(), validate, asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  const cfg = doc && modules[doc.module];
  if (!doc || !cfg) throw new ApiError(404, 'Document not found');
  const u = req.user;
  if (u.role !== 'admin' && !u.permissions.includes(`${doc.module}.view`)) throw new ApiError(403, 'You do not have permission to perform this action');
  // Each module can define who may see its records (tasks: mine, events: mine); otherwise the assigned-manager rule applies.
  const scope = cfg.scopeFilter ? cfg.scopeFilter(u) : u.role === 'admin' || cfg.scoped === false ? {} : { assignedManager: u._id };
  if (!(await cfg.model.exists({ _id: doc.recordId, ...scope }))) throw new ApiError(404, 'Document not found');
  res.download(path.join(uploadsRoot(), doc.path), doc.originalName);
}));

module.exports = router;
