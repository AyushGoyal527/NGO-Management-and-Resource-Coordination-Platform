const { body } = require("express-validator");

const blank = (chain) => chain.optional({ checkFalsy: true });
const name = (isCreate) =>
  (isCreate
    ? body("name").trim().notEmpty().withMessage("Name is required")
    : body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty")
  ).isLength({ max: 100 });
const text = (f, max = 300) =>
  body(f)
    .optional()
    .isString()
    .withMessage(`${f} must be text`)
    .isLength({ max })
    .withMessage(`${f} is too long`);
const date = (f, label) =>
  blank(body(f)).isISO8601().withMessage(`Enter a valid ${label}`);
const oneOf = (f, list, label) =>
  blank(body(f)).isIn(list).withMessage(`Invalid ${label}`);
const num = (f, label, min = 0, max = 1e9) =>
  blank(body(f))
    .isFloat({ min, max })
    .withMessage(`${label} must be a number from ${min} to ${max}`);
const id = (f, label) =>
  blank(body(f)).isMongoId().withMessage(`Invalid ${label}`);
const list = (f) =>
  body(f).optional().isArray({ max: 30 }).withMessage(`${f} must be a list`);
const GENDERS = ["male", "female", "other"];

exports.volunteerRules = (isCreate) => [
  name(isCreate),
  blank(body("email"))
    .trim()
    .isEmail()
    .withMessage("Enter a valid email")
    .normalizeEmail(),
  text("phone", 20),
  text("address"),
  date("dateOfBirth", "date of birth"),
  oneOf("gender", GENDERS, "gender"),
  list("skills"),
  text("availability"),
  date("joiningDate", "joining date"),
  body("emergencyContact")
    .optional()
    .isObject()
    .withMessage("Emergency contact is invalid"),
  oneOf("status", ["active", "inactive", "pending", "suspended"], "status"),
  num("volunteerHours", "Volunteer hours", 0, 100000),
  id("assignedManager", "manager"),
  text("notes", 2000),
];

exports.studentRules = (isCreate) => [
  name(isCreate),
  num("age", "Age", 1, 120),
  date("dateOfBirth", "date of birth"),
  oneOf("gender", GENDERS, "gender"),
  text("school"),
  text("class", 20),
  body("parentGuardian")
    .optional()
    .isObject()
    .withMessage("Parent/guardian is invalid"),
  text("contact", 20),
  text("address"),
  oneOf(
    "educationStatus",
    ["enrolled", "dropped", "completed", "on-hold"],
    "education status",
  ),
  num("educationProgress", "Progress", 0, 100),
  id("program", "program"),
  id("assignedManager", "manager"),
  oneOf("status", ["active", "archived"], "status"),
  text("notes", 2000),
];

exports.beneficiaryRules = (isCreate) => [
  name(isCreate),
  num("age", "Age", 0, 120),
  oneOf("gender", GENDERS, "gender"),
  text("contact", 20),
  text("address"),
  num("familySize", "Family size", 1, 100),
  oneOf(
    "economicCategory",
    ["below-poverty-line", "low-income", "middle-income", "other"],
    "category",
  ),
  list("assistanceRequired"),
  id("assignedProgram", "program"),
  id("assignedManager", "manager"),
  oneOf("status", ["active", "inactive", "archived"], "status"),
  text("notes", 2000),
];
