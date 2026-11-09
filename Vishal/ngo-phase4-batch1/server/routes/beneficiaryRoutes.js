const { body } = require("express-validator");
const createCrudService = require("../services/crudService");
const crudRouter = require("./crudRouter");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const { requirePermission } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLogger");
const { beneficiaryRules } = require("../validators/resources");

const service = createCrudService(require("../modules/beneficiaries"));

module.exports = crudRouter(service, beneficiaryRules, (r, { idRule }) => {
  // Assistance history: what help was given, when.
  r.post(
    "/:id/assistance",
    requirePermission("beneficiaries.edit"),
    idRule,
    body("type")
      .trim()
      .notEmpty()
      .withMessage("Describe the assistance")
      .isLength({ max: 100 }),
    body("date")
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage("Enter a valid date"),
    body("notes").optional().isString().isLength({ max: 500 }),
    validate,
    asyncHandler(async (req, res) => {
      const b = await service.findInScope(req.user, req.params.id);
      const entry = {
        type: req.body.type,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        notes: req.body.notes || undefined,
      };
      b.assistanceProvided.push(entry);
      b.assistanceProvided.sort((x, y) => y.date - x.date);
      await b.save();
      await logActivity({
        user: req.user._id,
        action: "assistance",
        module: "beneficiaries",
        recordId: b._id,
        newValue: { type: entry.type },
      });
      success(
        res,
        { item: await service.get(req.user, req.params.id) },
        "Assistance recorded",
      );
    }),
  );
});
