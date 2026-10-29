const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const authService = require("../services/authService");
const { logActivity } = require("../utils/activityLogger");

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  await authService.register({ name, email, password, phone });
  success(
    res,
    {},
    "Account created. An administrator will approve it shortly",
    201,
  );
});

exports.login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  success(res, data, "Logged in");
});

exports.logout = asyncHandler(async (req, res) => {
  await logActivity({
    user: req.user._id,
    action: "logout",
    module: "auth",
    recordId: req.user._id,
  });
  success(res, {}, "Logged out"); // JWTs are stateless; the client discards the token
});

exports.me = asyncHandler(async (req, res) => success(res, { user: req.user }));

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { message, devResetUrl } = await authService.forgotPassword(
    req.body.email,
  );
  success(res, devResetUrl ? { devResetUrl } : {}, message);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  success(res, {}, "Password updated. You can log in now");
});
