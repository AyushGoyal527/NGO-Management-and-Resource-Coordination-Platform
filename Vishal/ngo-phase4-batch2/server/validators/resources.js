const { body } = require('express-validator');

const blank = (chain) => chain.optional({ checkFalsy: true });
const name = (isCreate) => (isCreate ? body('name').trim().notEmpty().withMessage('Name is required') : body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')).isLength({ max: 100 });
const text = (f, max = 300) => body(f).optional().isString().withMessage(`${f} must be text`).isLength({ max }).withMessage(`${f} is too long`);
const date = (f, label) => blank(body(f)).isISO8601().withMessage(`Enter a valid ${label}`);
const oneOf = (f, list, label) => blank(body(f)).isIn(list).withMessage(`Invalid ${label}`);
const num = (f, label, min = 0, max = 1e9) => blank(body(f)).isFloat({ min, max }).withMessage(`${label} must be a number from ${min} to ${max}`);
const id = (f, label) => blank(body(f)).isMongoId().withMessage(`Invalid ${label}`);
const list = (f) => body(f).optional().isArray({ max: 30 }).withMessage(`${f} must be a list`);
const GENDERS = ['male', 'female', 'other'];

exports.volunteerRules = (isCreate) => [
  name(isCreate),
  blank(body('email')).trim().isEmail().withMessage('Enter a valid email').normalizeEmail(),
  text('phone', 20), text('address'), date('dateOfBirth', 'date of birth'), oneOf('gender', GENDERS, 'gender'),
  list('skills'), text('availability'), date('joiningDate', 'joining date'),
  body('emergencyContact').optional().isObject().withMessage('Emergency contact is invalid'),
  oneOf('status', ['active', 'inactive', 'pending', 'suspended'], 'status'),
  num('volunteerHours', 'Volunteer hours', 0, 100000), id('assignedManager', 'manager'), text('notes', 2000),
];

exports.studentRules = (isCreate) => [
  name(isCreate),
  num('age', 'Age', 1, 120), date('dateOfBirth', 'date of birth'), oneOf('gender', GENDERS, 'gender'),
  text('school'), text('class', 20), body('parentGuardian').optional().isObject().withMessage('Parent/guardian is invalid'),
  text('contact', 20), text('address'),
  oneOf('educationStatus', ['enrolled', 'dropped', 'completed', 'on-hold'], 'education status'),
  num('educationProgress', 'Progress', 0, 100), id('program', 'program'), id('assignedManager', 'manager'),
  oneOf('status', ['active', 'archived'], 'status'), text('notes', 2000),
];

exports.beneficiaryRules = (isCreate) => [
  name(isCreate),
  num('age', 'Age', 0, 120), oneOf('gender', GENDERS, 'gender'), text('contact', 20), text('address'),
  num('familySize', 'Family size', 1, 100),
  oneOf('economicCategory', ['below-poverty-line', 'low-income', 'middle-income', 'other'], 'category'),
  list('assistanceRequired'), id('assignedProgram', 'program'), id('assignedManager', 'manager'),
  oneOf('status', ['active', 'inactive', 'archived'], 'status'), text('notes', 2000),
];

const dateQuery = [require('express-validator').query('from').optional({ checkFalsy: true }).isISO8601().withMessage('Enter a valid start date'),
  require('express-validator').query('to').optional({ checkFalsy: true }).isISO8601().withMessage('Enter a valid end date')];
exports.dateQueryRules = dateQuery;

exports.donationRules = (isCreate) => [
  (isCreate ? body('donorName').trim().notEmpty().withMessage('Donor name is required') : body('donorName').optional().trim().notEmpty().withMessage('Donor name cannot be empty')).isLength({ max: 100 }),
  oneOf('donorType', ['individual', 'organization', 'anonymous'], 'donor type'),
  blank(body('email')).trim().isEmail().withMessage('Enter a valid email').normalizeEmail(),
  text('phone', 20), num('amount', 'Amount', 0, 1e9),
  oneOf('donationType', ['money', 'food', 'clothes', 'books', 'medicine', 'equipment', 'other'], 'donation type'),
  oneOf('paymentMethod', ['cash', 'upi', 'card', 'bank-transfer', 'cheque', 'online', 'in-kind'], 'payment method'),
  text('transactionId', 100), date('donationDate', 'donation date'), text('campaign', 100), text('purpose', 200),
  oneOf('status', ['inquiry', 'pending', 'received', 'failed'], 'status'), text('notes', 1000),
];

exports.foodRules = (isCreate) => [
  (isCreate ? body('foodItem').trim().notEmpty().withMessage('Food item is required') : body('foodItem').optional().trim().notEmpty().withMessage('Food item cannot be empty')).isLength({ max: 100 }),
  (isCreate ? body('quantity').notEmpty().withMessage('Quantity is required') : body('quantity').optional()).isFloat({ min: 0, max: 1e7 }).withMessage('Quantity must be a number from 0 to 10,000,000'),
  oneOf('unit', ['kg', 'g', 'litre', 'packets', 'boxes', 'pieces'], 'unit'),
  date('expiryDate', 'expiry date'), date('receivedDate', 'received date'), text('source', 100), text('storageLocation', 100),
  num('lowStockThreshold', 'Low stock level', 0, 1e7),
];

exports.distributionRules = [
  body('location').trim().notEmpty().withMessage('Location is required').isLength({ max: 200 }),
  date('date', 'date'),
  body('items').isArray({ min: 1, max: 20 }).withMessage('Add at least one food item'),
  body('items.*.inventory').isMongoId().withMessage('Choose a food item'),
  body('items.*.quantity').isFloat({ gt: 0, max: 1e7 }).withMessage('Quantities must be greater than zero'),
  blank(body('numberOfBeneficiaries')).isInt({ min: 0, max: 1e6 }).withMessage('Number of beneficiaries must be a whole number'),
  body('assignedVolunteers').optional().isArray({ max: 100 }).withMessage('Volunteers must be a list'),
  body('assignedVolunteers.*').isMongoId().withMessage('Invalid volunteer'),
  id('manager', 'manager'), text('notes', 1000),
];

exports.resourceRules = (isCreate) => [
  name(isCreate),
  oneOf('category', ['books', 'clothes', 'computers', 'furniture', 'medicalSupplies', 'vehicles', 'equipment', 'stationery', 'other'], 'category'),
  blank(body('quantity')).isInt({ min: 0, max: 1e7 }).withMessage('Quantity must be a whole number'),
  oneOf('condition', ['new', 'good', 'fair', 'poor'], 'condition'),
  text('location', 200), id('assignedPerson', 'person'), date('purchaseOrDonationDate', 'date'),
  num('value', 'Value', 0, 1e10), oneOf('status', ['available', 'assigned', 'inUse', 'damaged', 'lost', 'maintenance'], 'status'), text('notes', 1000),
];
