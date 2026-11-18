const rateLimit = require('express-rate-limit');

// Builds a per-IP limiter. Turned off while running automated tests unless FORCE_RATE_LIMITS is set.
exports.makeLimiter = ({ windowMs, max, message }) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && !process.env.FORCE_RATE_LIMITS,
  message: { success: false, message },
});
