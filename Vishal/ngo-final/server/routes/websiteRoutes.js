const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { success: ok } = require('../utils/response');
const { authenticate, requirePermission } = require('../middleware/auth');
const { createUpload } = require('../middleware/upload');
const { verifyFiles } = require('../utils/fileCheck');
const svc = require('../services/websiteService');
const { SECTIONS } = require('../config/websiteSchema');

const upload = createUpload('site', { imagesOnly: true });
router.use(authenticate);

router.get('/', requirePermission('settings.view'), asyncHandler(async (req, res) => ok(res, await svc.get())));
router.put('/organization', requirePermission('settings.edit'), asyncHandler(async (req, res) => ok(res, await svc.saveOrganization(req.body, req.user._id), 'Organisation details saved')));
router.put('/sections/:section', requirePermission('settings.edit'), asyncHandler(async (req, res) => {
  if (!Object.prototype.hasOwnProperty.call(SECTIONS, req.params.section)) throw new ApiError(404, 'Unknown website section');
  ok(res, await svc.saveSection(req.params.section, req.body, req.user._id), `${SECTIONS[req.params.section].label} saved`);
}));
router.post('/images', requirePermission('settings.edit'), upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload');
  await verifyFiles([req.file]);
  ok(res, { url: `/uploads/site/${req.file.filename}` }, 'Image uploaded', 201);
}));

module.exports = router;
