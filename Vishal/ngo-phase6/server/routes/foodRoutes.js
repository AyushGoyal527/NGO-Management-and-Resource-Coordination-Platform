const { param } = require('express-validator');
const createCrudService = require('../services/crudService');
const foodService = require('../services/foodService');
const crudRouter = require('./crudRouter');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { requirePermission } = require('../middleware/auth');
const { foodRules, distributionRules, dateQueryRules } = require('../validators/resources');

const service = createCrudService(require('../modules/food').config);

module.exports = crudRouter(service, foodRules, null, (r) => {
  // Fixed paths first, so they are never mistaken for /:id.
  r.get('/alerts', requirePermission('food.view'), asyncHandler(async (req, res) => success(res, await foodService.alerts())));
  r.get('/available', requirePermission('food.distribute'), asyncHandler(async (req, res) => success(res, { items: await foodService.available() })));

  r.get('/distributions', requirePermission('food.view'), dateQueryRules, validate, asyncHandler(async (req, res) =>
    success(res, await foodService.listDistributions(req.query, req.user))));
  r.post('/distributions', requirePermission('food.distribute'), distributionRules, validate, asyncHandler(async (req, res) =>
    success(res, { item: await foodService.distribute(req.user, req.body) }, 'Distribution recorded', 201)));
  r.delete('/distributions/:id', requirePermission('food.delete'), param('id').isMongoId().withMessage('Invalid id'), validate, asyncHandler(async (req, res) => {
    await foodService.removeDistribution(req.user, req.params.id);
    success(res, {}, 'Distribution deleted and stock restored');
  }));
});
