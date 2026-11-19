const router = require("express").Router();
const User = require("../models/User");
const Program = require("../models/Program");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

// Small id+name lists that feed dropdowns in forms and filters.
router.use(authenticate);
router.get(
  "/managers",
  requireRole("admin"),
  asyncHandler(async (req, res) =>
    success(res, {
      items: await User.find({ role: "manager", status: "active" })
        .sort("name")
        .select("name")
        .lean(),
    }),
  ),
);
router.get(
  "/programs",
  asyncHandler(async (req, res) =>
    success(res, {
      items: await Program.find({ status: { $ne: "completed" } })
        .sort("name")
        .select("name")
        .lean(),
    }),
  ),
);

module.exports = router;
