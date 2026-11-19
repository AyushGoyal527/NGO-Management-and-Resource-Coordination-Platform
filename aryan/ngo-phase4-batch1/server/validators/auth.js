const { body } = require("express-validator");

const password = (field = "password") =>
  body(field)
    .isString()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be 8 to 72 characters")
    .matches(/[a-z]/)
    .withMessage("Password needs a lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password needs an uppercase letter")
    .matches(/\d/)
    .withMessage("Password needs a number");

exports.registerRules = [
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
  password(),
];
exports.loginRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required"),
];
exports.forgotRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),
];
exports.resetRules = [password()];
exports.passwordRule = password;
