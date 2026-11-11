const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

module.exports = (service) => ({
  list: asyncHandler(async (req, res) => success(res, await service.list(req.query, req.user))),
  get: asyncHandler(async (req, res) => success(res, { item: await service.get(req.user, req.params.id) })),
  create: asyncHandler(async (req, res) => success(res, { item: await service.create(req.user, req.body) }, `${service.cfg.label} created`, 201)),
  update: asyncHandler(async (req, res) => success(res, { item: await service.update(req.user, req.params.id, req.body) }, `${service.cfg.label} updated`)),
  remove: asyncHandler(async (req, res) => {
    const { archived } = await service.remove(req.user, req.params.id);
    success(res, {}, archived ? `${service.cfg.label} archived` : `${service.cfg.label} deleted`);
  }),
  history: asyncHandler(async (req, res) => success(res, { items: await service.history(req.user, req.params.id) })),
  photo: asyncHandler(async (req, res) => success(res, { item: await service.setPhoto(req.user, req.params.id, req.file) }, 'Photo updated')),
  addDocuments: asyncHandler(async (req, res) => success(res, { item: await service.addDocuments(req.user, req.params.id, req.files) }, 'Documents uploaded')),
  removeDocument: asyncHandler(async (req, res) => success(res, { item: await service.removeDocument(req.user, req.params.id, req.params.docId) }, 'Document removed')),
});
