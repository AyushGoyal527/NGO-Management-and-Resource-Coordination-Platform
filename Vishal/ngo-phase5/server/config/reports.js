const createCrudService = require('../services/crudService');
const FoodInventory = require('../models/FoodInventory');
const FoodDistribution = require('../models/FoodDistribution');
const { config: foodConfig } = require('../modules/food');
const { isOverdue } = require('../utils/dates');

const opts = (list) => list.map((v) => ({ value: v, label: String(v).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) }));
const names = (list) => (list || []).map((x) => x?.name).filter(Boolean).join('; ');
const count = (rows, fn) => rows.filter(fn).length;
const sum = (rows, fn) => Math.round(rows.reduce((s, r) => s + (Number(fn(r)) || 0), 0) * 100) / 100;
const byValue = (rows, fn, label = (v) => v) => {
  const m = {};
  rows.forEach((r) => { const k = fn(r); if (k) m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([k, v]) => ({ label: label(k), value: v }));
};
const pretty = (v) => (String(v) === 'upi' ? 'UPI' : String(v)).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const DATE_FILTERS = (label) => [{ param: 'from', label: `${label} from`, type: 'date' }, { param: 'to', label: `${label} to`, type: 'date' }];
const managerFilter = { param: 'manager', label: 'Manager', type: 'manager', adminOnly: true };

// Reports built on a module: the module's own scope and filters decide which rows a person gets, so a report can never show more than the module does.
const fromModule = (cfgPath, def) => {
  const service = createCrudService(require(cfgPath));
  return {
    ...def, source: service.cfg.module, params: def.filters.map((f) => f.param),
    query: (user, q) => ({ filter: service.buildFilter(q, user), model: service.cfg.model, populate: service.cfg.populate.filter((p) => p.path !== 'documents'), sort: def.sort }),
  };
};

exports.REPORTS = [
  fromModule('../modules/volunteers', {
    key: 'volunteers', title: 'Volunteers', description: 'Everyone on your volunteer list, with status, skills and hours given.', sort: { name: 1 },
    filters: [{ param: 'status', label: 'Status', options: opts(['active', 'inactive', 'pending', 'suspended']) }, ...DATE_FILTERS('Joined'), managerFilter],
    columns: [
      { key: 'name', label: 'Name', value: (r) => r.name, weight: 1.4 }, { key: 'email', label: 'Email', value: (r) => r.email, weight: 1.6 }, { key: 'phone', label: 'Phone', value: (r) => r.phone },
      { key: 'status', label: 'Status', value: (r) => pretty(r.status || ''), weight: 0.8 }, { key: 'skills', label: 'Skills', value: (r) => (r.skills || []).join('; '), weight: 1.4 },
      { key: 'joiningDate', label: 'Joined', type: 'date', value: (r) => r.joiningDate, weight: 0.9 }, { key: 'volunteerHours', label: 'Hours', type: 'number', value: (r) => r.volunteerHours || 0, weight: 0.6 },
      { key: 'manager', label: 'Manager', value: (r) => r.assignedManager?.name },
    ],
    summary: (rows) => [{ label: 'Volunteers', value: rows.length }, { label: 'Total hours', value: sum(rows, (r) => r.volunteerHours) }, ...byValue(rows, (r) => r.status, pretty)],
  }),
  fromModule('../modules/students', {
    key: 'students', title: 'Students', description: 'Students with school, class, education status and progress.', sort: { name: 1 },
    filters: [{ param: 'educationStatus', label: 'Education status', options: opts(['enrolled', 'dropped', 'completed', 'on-hold']) }, { param: 'status', label: 'Record status', options: opts(['active', 'archived']) }, managerFilter],
    columns: [
      { key: 'name', label: 'Name', value: (r) => r.name, weight: 1.4 }, { key: 'age', label: 'Age', type: 'number', value: (r) => r.age, weight: 0.5 }, { key: 'class', label: 'Class', value: (r) => r.class, weight: 0.7 },
      { key: 'school', label: 'School', value: (r) => r.school, weight: 1.4 }, { key: 'educationStatus', label: 'Education status', value: (r) => pretty(r.educationStatus || ''), weight: 1 },
      { key: 'progress', label: 'Progress %', type: 'number', value: (r) => r.educationProgress, weight: 0.7 }, { key: 'program', label: 'Program', value: (r) => r.program?.name, weight: 1.2 }, { key: 'manager', label: 'Manager', value: (r) => r.assignedManager?.name },
    ],
    summary: (rows) => [{ label: 'Students', value: rows.length }, ...byValue(rows, (r) => r.educationStatus, pretty)],
  }),
  fromModule('../modules/beneficiaries', {
    key: 'beneficiaries', title: 'Beneficiaries', description: 'People and families you support, by category and program.', sort: { name: 1 },
    filters: [{ param: 'economicCategory', label: 'Category', options: opts(['below-poverty-line', 'low-income', 'middle-income', 'other']) }, { param: 'status', label: 'Status', options: opts(['active', 'inactive', 'archived']) }, managerFilter],
    columns: [
      { key: 'name', label: 'Name', value: (r) => r.name, weight: 1.4 }, { key: 'age', label: 'Age', type: 'number', value: (r) => r.age, weight: 0.5 }, { key: 'familySize', label: 'Family size', type: 'number', value: (r) => r.familySize, weight: 0.7 },
      { key: 'category', label: 'Category', value: (r) => pretty(r.economicCategory || ''), weight: 1.1 }, { key: 'assistance', label: 'Assistance needed', value: (r) => (r.assistanceRequired || []).join('; '), weight: 1.5 },
      { key: 'program', label: 'Program', value: (r) => r.assignedProgram?.name, weight: 1.2 }, { key: 'status', label: 'Status', value: (r) => pretty(r.status || ''), weight: 0.8 }, { key: 'manager', label: 'Manager', value: (r) => r.assignedManager?.name },
    ],
    summary: (rows) => [{ label: 'Beneficiaries', value: rows.length }, { label: 'People in their families', value: sum(rows, (r) => r.familySize) }, ...byValue(rows, (r) => r.economicCategory, pretty)],
  }),
  fromModule('../modules/donations', {
    key: 'donations', title: 'Donations', description: 'Money and in-kind donations with receipt numbers. Totals count only received money.', sort: { donationDate: -1 },
    filters: [{ param: 'status', label: 'Status', options: opts(['received', 'pending', 'inquiry', 'failed']) }, { param: 'type', label: 'Type', options: opts(['money', 'food', 'clothes', 'books', 'medicine', 'equipment', 'other']) },
      { param: 'method', label: 'Payment method', options: opts(['cash', 'upi', 'card', 'bank-transfer', 'cheque', 'online', 'in-kind']) }, ...DATE_FILTERS('Donated')],
    columns: [
      { key: 'receipt', label: 'Receipt no.', value: (r) => r.receiptNumber, weight: 1.1 }, { key: 'date', label: 'Date', type: 'date', value: (r) => r.donationDate, weight: 0.9 },
      { key: 'donor', label: 'Donor', value: (r) => (r.donorType === 'anonymous' ? 'Anonymous' : r.donorName), weight: 1.5 }, { key: 'donorType', label: 'Donor type', value: (r) => pretty(r.donorType || ''), weight: 0.9 },
      { key: 'type', label: 'Type', value: (r) => pretty(r.donationType || ''), weight: 0.8 }, { key: 'amount', label: 'Amount (Rs.)', type: 'money', value: (r) => r.amount || 0, weight: 0.9 },
      { key: 'method', label: 'Method', value: (r) => pretty(r.paymentMethod || ''), weight: 0.9 }, { key: 'campaign', label: 'Campaign', value: (r) => r.campaign, weight: 1.1 }, { key: 'status', label: 'Status', value: (r) => pretty(r.status || ''), weight: 0.8 },
    ],
    summary: (rows) => {
      const received = rows.filter((r) => r.status === 'received' && r.donationType === 'money');
      return [{ label: 'Donations', value: rows.length }, { label: 'Money received (Rs.)', value: sum(received, (r) => r.amount), type: 'money' }, { label: 'Received donations', value: count(rows, (r) => r.status === 'received') }, { label: 'Pending', value: count(rows, (r) => r.status === 'pending') }];
    },
  }),
  {
    key: 'food-stock', title: 'Food stock', description: 'Every food item with what is left and whether it is low, expiring or expired.', source: 'food', params: ['alert', 'from', 'to'],
    filters: [{ param: 'alert', label: 'Stock state', options: [{ value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }, { value: 'expiring', label: 'Expiring soon' }, { value: 'expired', label: 'Expired' }] }, ...DATE_FILTERS('Received')],
    sort: { foodItem: 1 },
    query: (user, q) => ({ filter: createCrudService(foodConfig).buildFilter(q, user), model: FoodInventory, populate: [], sort: { foodItem: 1 } }),
    columns: [
      { key: 'item', label: 'Food item', value: (r) => r.foodItem, weight: 1.5 }, { key: 'quantity', label: 'Received', type: 'number', value: (r) => r.quantity, weight: 0.8 }, { key: 'unit', label: 'Unit', value: (r) => r.unit, weight: 0.6 },
      { key: 'distributed', label: 'Distributed', type: 'number', value: (r) => r.distributedQuantity, weight: 0.8 }, { key: 'remaining', label: 'Remaining', type: 'number', value: (r) => r.remainingQuantity, weight: 0.8 },
      { key: 'expiry', label: 'Expiry', type: 'date', value: (r) => r.expiryDate, weight: 0.9 }, { key: 'state', label: 'State', value: (r) => stockLabel(r), weight: 0.9 }, { key: 'storage', label: 'Storage', value: (r) => r.storageLocation, weight: 1 }, { key: 'source', label: 'Source', value: (r) => r.source, weight: 1 },
    ],
    summary: (rows) => [{ label: 'Items', value: rows.length }, ...byValue(rows, (r) => stockLabel(r))],
  },
  {
    key: 'food-distributions', title: 'Food distributions', description: 'Each distribution: where, how many people were served and what was given out.', source: 'food', params: ['from', 'to'], filters: DATE_FILTERS('Distributed'), sort: { date: -1 },
    query: (user, q) => {
      const filter = {};
      const range = {};
      if (q.from) range.$gte = new Date(q.from);
      if (q.to) range.$lt = new Date(new Date(q.to).getTime() + 24 * 60 * 60 * 1000);
      if (Object.keys(range).length) filter.date = range;
      return { filter, model: FoodDistribution, populate: [{ path: 'manager', select: 'name' }], sort: { date: -1 } };
    },
    columns: [
      { key: 'date', label: 'Date', type: 'date', value: (r) => r.date, weight: 0.9 }, { key: 'location', label: 'Location', value: (r) => r.location, weight: 1.5 },
      { key: 'people', label: 'People served', type: 'number', value: (r) => r.numberOfBeneficiaries || 0, weight: 0.8 },
      { key: 'items', label: 'Food given', value: (r) => (r.items || []).map((i) => `${i.foodItem} ${i.quantity} ${i.unit}`).join('; '), weight: 2.4 },
      { key: 'volunteers', label: 'Volunteers', type: 'number', value: (r) => (r.assignedVolunteers || []).length, weight: 0.7 }, { key: 'manager', label: 'Manager', value: (r) => r.manager?.name },
    ],
    summary: (rows) => [{ label: 'Distributions', value: rows.length }, { label: 'People served', value: sum(rows, (r) => r.numberOfBeneficiaries) }],
  },
  fromModule('../modules/resources', {
    key: 'resources', title: 'Resources', description: 'Equipment and supplies with condition, status and who has them.', sort: { name: 1 },
    filters: [{ param: 'status', label: 'Status', options: opts(['available', 'assigned', 'inUse', 'damaged', 'lost', 'maintenance']) }, { param: 'category', label: 'Category', options: opts(['books', 'clothes', 'computers', 'furniture', 'medicalSupplies', 'vehicles', 'equipment', 'stationery', 'other']) },
      { param: 'condition', label: 'Condition', options: opts(['new', 'good', 'fair', 'poor']) }, ...DATE_FILTERS('Acquired')],
    columns: [
      { key: 'name', label: 'Resource', value: (r) => r.name, weight: 1.5 }, { key: 'category', label: 'Category', value: (r) => pretty(r.category || ''), weight: 1 }, { key: 'quantity', label: 'Quantity', type: 'number', value: (r) => r.quantity, weight: 0.7 },
      { key: 'condition', label: 'Condition', value: (r) => pretty(r.condition || ''), weight: 0.8 }, { key: 'status', label: 'Status', value: (r) => pretty(r.status || ''), weight: 0.9 }, { key: 'person', label: 'Assigned to', value: (r) => r.assignedPerson?.name, weight: 1.1 },
      { key: 'location', label: 'Location', value: (r) => r.location, weight: 1.1 }, { key: 'value', label: 'Value (Rs.)', type: 'money', value: (r) => r.value || 0, weight: 0.9 },
    ],
    summary: (rows) => [{ label: 'Resources', value: rows.length }, { label: 'Total quantity', value: sum(rows, (r) => r.quantity) }, { label: 'Total value (Rs.)', value: sum(rows, (r) => r.value), type: 'money' }, ...byValue(rows, (r) => r.status, pretty)],
  }),
  fromModule('../modules/tasks', {
    key: 'tasks', title: 'Tasks', description: 'Tasks with status, priority, deadline and who is doing them. You see the tasks you can see on the Tasks page.', sort: { dueDate: 1 },
    filters: [{ param: 'status', label: 'Status', options: opts(['assigned', 'accepted', 'inProgress', 'completed', 'cancelled']) }, { param: 'priority', label: 'Priority', options: opts(['low', 'medium', 'high', 'urgent']) },
      { param: 'overdue', label: 'Deadline', options: [{ value: 'true', label: 'Overdue only' }] }, ...DATE_FILTERS('Due')],
    columns: [
      { key: 'title', label: 'Task', value: (r) => r.title, weight: 2 }, { key: 'status', label: 'Status', value: (r) => pretty(r.status || ''), weight: 0.9 }, { key: 'priority', label: 'Priority', value: (r) => pretty(r.priority || ''), weight: 0.8 },
      { key: 'due', label: 'Due', type: 'date', value: (r) => r.dueDate, weight: 0.9 }, { key: 'overdue', label: 'Overdue', value: (r) => (isOverdue(r.dueDate, r.status) ? 'Yes' : ''), weight: 0.7 },
      { key: 'assignee', label: 'Assigned to', value: (r) => [r.assignedUser?.name, ...(r.assignedTeam || []).map((u) => u.name)].filter(Boolean).join('; '), weight: 1.4 },
      { key: 'createdBy', label: 'Created by', value: (r) => r.createdBy?.name, weight: 1 }, { key: 'completedAt', label: 'Completed', type: 'datetime', value: (r) => r.completedAt, weight: 1.1 },
    ],
    summary: (rows) => {
      const done = count(rows, (r) => r.status === 'completed');
      const counted = count(rows, (r) => r.status !== 'cancelled');
      return [{ label: 'Tasks', value: rows.length }, { label: 'Completed', value: done }, { label: 'Overdue', value: count(rows, (r) => isOverdue(r.dueDate, r.status)) }, { label: 'Completion rate', value: counted ? `${Math.round((done / counted) * 100)}%` : '—' }];
    },
  }),
  fromModule('../modules/events', {
    key: 'events', title: 'Events', description: 'Events with date, place, status and how many volunteers are assigned.', sort: { date: -1 },
    filters: [{ param: 'status', label: 'Status', options: opts(['upcoming', 'ongoing', 'completed', 'cancelled']) }, { param: 'when', label: 'When', options: [{ value: 'upcoming', label: 'Today and later' }, { value: 'past', label: 'Past only' }] }, ...DATE_FILTERS('Date')],
    columns: [
      { key: 'name', label: 'Event', value: (r) => r.name, weight: 2 }, { key: 'date', label: 'Date', type: 'date', value: (r) => r.date, weight: 0.9 }, { key: 'time', label: 'Time', value: (r) => [r.startTime, r.endTime].filter(Boolean).join(' - '), weight: 0.9 },
      { key: 'location', label: 'Location', value: (r) => r.location, weight: 1.4 }, { key: 'status', label: 'Status', value: (r) => pretty(r.status || ''), weight: 0.8 }, { key: 'program', label: 'Program', value: (r) => r.program?.name, weight: 1.2 },
      { key: 'volunteers', label: 'Volunteers', type: 'number', value: (r) => (r.assignedVolunteers || []).length, weight: 0.7 }, { key: 'manager', label: 'Manager', value: (r) => r.manager?.name },
    ],
    summary: (rows) => [{ label: 'Events', value: rows.length }, ...byValue(rows, (r) => r.status, pretty)],
  }),
  fromModule('../modules/programs', {
    key: 'programs', title: 'Programs', description: 'Programs with dates, manager and budget.', sort: { name: 1 },
    filters: [{ param: 'status', label: 'Status', options: opts(['planned', 'active', 'completed', 'paused']) }, { param: 'type', label: 'Type', options: opts(['food-distribution', 'education', 'medical', 'donation-drive', 'community-event', 'other']) }, ...DATE_FILTERS('Started')],
    columns: [
      { key: 'name', label: 'Program', value: (r) => r.name, weight: 2 }, { key: 'type', label: 'Type', value: (r) => pretty(r.type || ''), weight: 1.1 }, { key: 'status', label: 'Status', value: (r) => pretty(r.status || ''), weight: 0.8 },
      { key: 'start', label: 'Start', type: 'date', value: (r) => r.startDate, weight: 0.9 }, { key: 'end', label: 'End', type: 'date', value: (r) => r.endDate, weight: 0.9 },
      { key: 'location', label: 'Location', value: (r) => r.location, weight: 1.3 }, { key: 'manager', label: 'Manager', value: (r) => r.manager?.name }, { key: 'budget', label: 'Budget (Rs.)', type: 'money', value: (r) => r.budget || 0, weight: 0.9 },
    ],
    summary: (rows) => [{ label: 'Programs', value: rows.length }, { label: 'Total budget (Rs.)', value: sum(rows, (r) => r.budget), type: 'money' }, ...byValue(rows, (r) => r.status, pretty)],
  }),
];

function stockLabel(r) {
  const now = new Date();
  if (r.remainingQuantity <= 0) return 'Out of stock';
  const expiry = r.expiryDate ? new Date(r.expiryDate).getTime() : null;
  const DAY = 24 * 60 * 60 * 1000;
  if (expiry !== null && expiry < now.getTime() - DAY) return 'Expired';
  if (expiry !== null && expiry <= now.getTime() + 14 * DAY) return 'Expiring soon';
  if (r.remainingQuantity <= r.lowStockThreshold) return 'Low stock';
  return 'In stock';
}
exports.byKey = (key) => exports.REPORTS.find((r) => r.key === key);
