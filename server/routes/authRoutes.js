const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const ctrl = require("../controllers/authController");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const v = require("../validators/auth");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Try again in a few minutes",
  },
});

router.post("/register", limiter, v.registerRules, validate, ctrl.register);
router.post("/login", limiter, v.loginRules, validate, ctrl.login);
router.post(
  "/forgot-password",
  limiter,
  v.forgotRules,
  validate,
  ctrl.forgotPassword,
);
router.post(
  "/reset-password/:token",
  limiter,
  v.resetRules,
  validate,
  ctrl.resetPassword,
);
router.post("/logout", authenticate, ctrl.logout);
router.get("/me", authenticate, ctrl.me);

module.exports = router;
