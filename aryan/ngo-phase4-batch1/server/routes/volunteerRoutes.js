const createCrudService = require("../services/crudService");
const crudRouter = require("./crudRouter");
const { volunteerRules } = require("../validators/resources");

module.exports = crudRouter(
  createCrudService(require("../modules/volunteers")),
  volunteerRules,
);
