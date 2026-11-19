const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const dashboard = require('../services/dashboardService');

exports.admin = asyncHandler(async (req, res) => success(res, await dashboard.admin()));
exports.manager = asyncHandler(async (req, res) => success(res, await dashboard.manager(req.user)));
exports.volunteer = asyncHandler(async (req, res) => success(res, await dashboard.volunteer(req.user)));
