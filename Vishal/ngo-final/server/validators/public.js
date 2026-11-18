const { body } = require('express-validator');

const phone = (field) => body(field).optional({ values: 'falsy' }).trim().matches(/^[0-9+()\-\s]{7,20}$/).withMessage('Enter a valid phone number');
const email = (required) => {
  const c = body('email');
  return (required ? c : c.optional({ values: 'falsy' })).trim().isEmail().withMessage('Enter a valid email address').isLength({ max: 120 }).normalizeEmail({ gmail_remove_dots: false });
};
const name = body('name').isString().withMessage('Please enter your name').bail().trim().isLength({ min: 2, max: 80 }).withMessage('Please enter your name (2 to 80 characters)');
const text = (f, max, label) => body(f).optional({ values: 'falsy' }).isString().withMessage(`${label} must be text`).bail().trim().isLength({ max }).withMessage(`${label} must be at most ${max} characters`);

exports.volunteerApplicationRules = [
  name, email(true), phone('phone'),
  body('skills').optional().isArray({ max: 10 }).withMessage('Choose up to 10 skills'),
  body('skills.*').isString().trim().isLength({ min: 1, max: 40 }).withMessage('Each skill must be up to 40 characters'),
  text('availability', 200, 'Availability'), text('message', 1000, 'Message'), text('website', 200, 'Website'),
];

exports.donationInquiryRules = [
  name, email(false), phone('phone'),
  body('donationType').isIn(['money', 'food', 'clothes', 'books', 'medicine', 'equipment', 'other']).withMessage('Choose what you would like to give'),
  body('amount').optional({ values: 'falsy' }).isFloat({ gt: 0, max: 10000000 }).withMessage('Amount must be more than 0 and at most 1,00,00,000').toFloat(),
  body('anonymous').optional().isBoolean().withMessage('Invalid value').toBoolean(),
  text('purpose', 120, 'Purpose'), text('message', 1000, 'Message'),
];
