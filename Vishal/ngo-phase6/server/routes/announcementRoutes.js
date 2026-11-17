const createCrudService = require('../services/crudService');
const crudRouter = require('./crudRouter');
const { announcementRules } = require('../validators/planning');

module.exports = crudRouter(createCrudService(require('../modules/announcements')), announcementRules);
