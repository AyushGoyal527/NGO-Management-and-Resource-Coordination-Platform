const router = require('express').Router;
const { param } = require('express-validator');
const createController = require('../controllers/crudController');
const validate = require('../middleware/validate');
const { createUpload } = require('../middleware/upload');
const { authenticate, requirePermission } = require('../middleware/auth');

const idRule = param('id').isMongoId().withMessage('Invalid id');
const docRule = param('docId').isMongoId().withMessage('Invalid document id');

// Standard REST routes + history + photo/document uploads for a module. `extend` adds module-specific routes.
module.exports = (service, rules, extend, before) => {
  const { module: m } = service.cfg;
  const r = router();
  const c = createController(service);
  const photo = createUpload('avatars', { imagesOnly: true });
  const docs = createUpload('documents');

  r.use(authenticate);
  if (before) before(r, { service, m, idRule }); // e.g. /stats and /export must be registered ahead of /:id
  r.get('/', requirePermission(`${m}.view`), c.list);
  r.post('/', requirePermission(`${m}.create`), rules(true), validate, c.create);
  r.get('/:id', requirePermission(`${m}.view`), idRule, validate, c.get);
  r.put('/:id', requirePermission(`${m}.edit`), idRule, rules(false), validate, c.update);
  r.delete('/:id', requirePermission(`${m}.delete`), idRule, validate, c.remove);
  r.get('/:id/history', requirePermission(`${m}.view`), idRule, validate, c.history);
  if (service.cfg.photoField) r.post('/:id/photo', requirePermission(`${m}.edit`), idRule, validate, photo.single('photo'), c.photo);
  if (service.cfg.hasDocuments) {
    r.post('/:id/documents', requirePermission(`${m}.edit`), idRule, validate, docs.array('files', 5), c.addDocuments);
    r.delete('/:id/documents/:docId', requirePermission(`${m}.edit`), idRule, docRule, validate, c.removeDocument);
  }

  if (extend) extend(r, { service, m, idRule });
  return r;
};
