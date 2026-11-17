const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { success: ok } = require('../utils/response');
const validate = require('../middleware/validate');
const { makeLimiter } = require('../utils/limiters');
const svc = require('../services/publicService');
const v = require('../validators/public');

// No login here: this is what the public website reads and submits. Never add private data to these responses.
const readLimit = makeLimiter({ windowMs: 60 * 1000, max: 120, message: 'Too many requests. Please slow down' });
const formLimit = makeLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'You have sent several forms already. Please try again later' });
const cache = (req, res, next) => { res.set('Cache-Control', 'public, max-age=60'); next(); };

router.get('/site', readLimit, cache, asyncHandler(async (req, res) => ok(res, await svc.site())));
router.get('/programs', readLimit, cache, asyncHandler(async (req, res) => ok(res, await svc.programs())));
router.get('/events', readLimit, cache, asyncHandler(async (req, res) => ok(res, await svc.events(req.query))));

router.post('/volunteer-applications', formLimit, v.volunteerApplicationRules, validate, asyncHandler(async (req, res) => {
  await svc.applyAsVolunteer(req.body);
  ok(res, {}, 'Thank you! We have received your application and will be in touch', 201);
}));
router.post('/donation-inquiries', formLimit, v.donationInquiryRules, validate, asyncHandler(async (req, res) => {
  ok(res, await svc.donationInquiry(req.body), 'Thank you! Your inquiry has been received', 201);
}));

module.exports = router;
