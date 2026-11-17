const createCrudService = require('../services/crudService');
const crudRouter = require('./crudRouter');
const readOnlyFor = require('../middleware/readOnlyFor');
const { eventRules } = require('../validators/planning');

// Volunteers can see the events they are assigned to, nothing more (no edits, files or history).
module.exports = crudRouter(createCrudService(require('../modules/events')), eventRules, null,
  (r) => r.use(readOnlyFor('volunteer', { blockReads: [/^\/[a-f\d]{24}\/history$/] })));
