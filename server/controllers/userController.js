const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const userService = require("../services/userService");

exports.list = asyncHandler(async (req, res) =>
  success(res, await userService.list(req.query)),
);
exports.stats = asyncHandler(async (req, res) =>
  success(res, await userService.stats()),
);
exports.catalog = asyncHandler(async (req, res) =>
  success(res, userService.catalog()),
);
exports.get = asyncHandler(async (req, res) =>
  success(res, { user: await userService.getById(req.params.id) }),
);
exports.create = asyncHandler(async (req, res) =>
  success(
    res,
    { user: await userService.create(req.user, req.body) },
    "User created",
    201,
  ),
);
exports.update = asyncHandler(async (req, res) =>
  success(
    res,
    { user: await userService.update(req.user, req.params.id, req.body) },
    "User updated",
  ),
);
exports.setRole = asyncHandler(async (req, res) =>
  success(
    res,
    { user: await userService.setRole(req.user, req.params.id, req.body.role) },
    "Role updated",
  ),
);
exports.setPermissions = asyncHandler(async (req, res) =>
  success(
    res,
    {
      user: await userService.setPermissions(req.user, req.params.id, req.body),
    },
    "Permissions saved",
  ),
);
exports.setStatus = asyncHandler(async (req, res) =>
  success(
    res,
    {
      user: await userService.setStatus(
        req.user,
        req.params.id,
        req.body.status,
      ),
    },
    "Status updated",
  ),
);
exports.resetPassword = asyncHandler(async (req, res) => {
  const { user, temporaryPassword } = await userService.resetPassword(
    req.user,
    req.params.id,
    req.body.newPassword,
  );
  success(res, { user, temporaryPassword }, "Password reset");
});
exports.archive = asyncHandler(async (req, res) =>
  success(
    res,
    { user: await userService.archive(req.user, req.params.id) },
    "User archived",
  ),
);
