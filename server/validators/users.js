const { body, param } = require("express-validator");
const { ROLES, USER_STATUSES } = require("../config/permissions");
const { passwordRule } = require("./auth");

const idParam = param("id").isMongoId().withMessage("Invalid user id");

exports.idRules = [idParam];
exports.createUserRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 }),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  passwordRule(),
  body("role").optional().isIn(ROLES).withMessage("Invalid role"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "pending"])
    .withMessage("Invalid status"),
  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be a list"),
];
exports.updateUserRules = [
  idParam,
  body("name").optional().trim().notEmpty().isLength({ max: 100 }),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
];
exports.roleRules = [
  idParam,
  body("role").isIn(ROLES).withMessage("Invalid role"),
];
exports.permissionsRules = [
  idParam,
  body("permissions").isArray().withMessage("Permissions must be a list"),
  body("dashboardModules")
    .optional()
    .isArray()
    .withMessage("Dashboard modules must be a list"),
];
exports.statusRules = [
  idParam,
  body("status").isIn(USER_STATUSES).withMessage("Invalid status"),
];
exports.resetPasswordRules = [
  idParam,
  body("newPassword")
    .optional({ checkFalsy: true })
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be 8 to 72 characters"),
];
