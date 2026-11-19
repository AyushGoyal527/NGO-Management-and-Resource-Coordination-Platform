const { body } = require('express-validator');
const { helpers: { blank, text, date, oneOf, num, id } } = require('./resources');

const TASK_STATUSES = ['assigned', 'accepted', 'inProgress', 'completed', 'cancelled'];
const EVENT_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'];
const PROGRAM_TYPES = ['food-distribution', 'education', 'medical', 'donation-drive', 'community-event', 'other'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const required = (field, label, isCreate, max) => (isCreate
  ? body(field).trim().notEmpty().withMessage(`${label} is required`)
  : body(field).optional().trim().notEmpty().withMessage(`${label} cannot be empty`)).isLength({ max }).withMessage(`${label} is too long`);
const idList = (f, label, max = 100) => [
  body(f).optional().isArray({ max }).withMessage(`${label} must be a list of up to ${max}`),
  body(`${f}.*`).isMongoId().withMessage(`Invalid ${label}`),
];
const time = (f, label) => blank(body(f)).matches(TIME).withMessage(`${label} must look like 09:30`);

exports.taskRules = (isCreate) => [
  required('title', 'Title', isCreate, 150), text('description', 2000),
  id('assignedUser', 'assignee'), ...idList('assignedTeam', 'team member', 20),
  oneOf('priority', ['low', 'medium', 'high', 'urgent'], 'priority'),
  date('startDate', 'start date'), date('dueDate', 'due date'), text('location', 200), text('category', 60),
];

exports.statusRules = [body('status').isIn(TASK_STATUSES).withMessage('Invalid status')];
exports.commentRules = [body('text').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Write a comment of up to 1000 characters')];

exports.eventRules = (isCreate) => [
  required('name', 'Name', isCreate, 150), text('description', 2000),
  isCreate ? body('date').isISO8601().withMessage('Enter a valid date') : date('date', 'date'),
  time('startTime', 'Start time'), time('endTime', 'End time'), text('location', 200), text('programType', 100),
  id('program', 'program'), id('manager', 'manager'),
  ...idList('assignedVolunteers', 'volunteer'), ...idList('beneficiaries', 'beneficiary'), ...idList('students', 'student'), ...idList('requiredResources', 'resource', 50),
  body('isPublic').optional().isBoolean().withMessage('Invalid value for public'),
  oneOf('status', EVENT_STATUSES, 'status'),
];

exports.programRules = (isCreate) => [
  required('name', 'Name', isCreate, 150), text('description', 2000), oneOf('type', PROGRAM_TYPES, 'type'),
  date('startDate', 'start date'), date('endDate', 'end date'), text('location', 200), num('budget', 'Budget', 0, 1e10),
  id('manager', 'manager'), oneOf('status', ['planned', 'active', 'completed', 'paused'], 'status'),
];

exports.TASK_STATUSES = TASK_STATUSES;
