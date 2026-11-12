const createCrudService = require('../services/crudService');
const crudRouter = require('./crudRouter');
const { resourceRules } = require('../validators/resources');

module.exports = crudRouter(createCrudService(require('../modules/resources')), resourceRules);
