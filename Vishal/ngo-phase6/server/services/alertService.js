const Task = require('../models/Task');
const Event = require('../models/Event');
const Resource = require('../models/Resource');
const FoodInventory = require('../models/FoodInventory');
const User = require('../models/User');
const { createOnce, usersWithPermission } = require('../utils/notify');
const { OPEN_TASK_STATUSES, todayStart } = require('../utils/dates');
const { alertClause } = require('../modules/food');

const DAY = 24 * 60 * 60 * 1000;
const LIMIT = 500;
const day = (d) => new Date(d).toISOString().slice(0, 10);
const ids = (...lists) => [...new Set(lists.flat().filter(Boolean).map(String))];

// Scheduled checks: task deadlines, events coming up, food running low or expiring, resources running low.
// Each alert has a dedupeKey, so running this every hour never sends the same alert twice to the same person.
exports.runAlerts = async (now = new Date()) => {
  const today = todayStart(now);
  const tomorrow = new Date(today.getTime() + DAY);
  const rows = []; // {to: [userId], type, title, message, path, key}

  const tasks = await Task.find({ status: { $in: OPEN_TASK_STATUSES }, dueDate: { $lte: tomorrow } }).select('title dueDate assignedUser assignedTeam createdBy').limit(LIMIT).lean();
  tasks.forEach((t) => {
    const mine = ids([t.assignedUser], t.assignedTeam || []);
    if (new Date(t.dueDate) < today) {
      rows.push({ to: ids(mine, [t.createdBy]), type: 'task-deadline', title: `Overdue task: ${t.title}`, message: `It was due on ${day(t.dueDate)}`, path: '/tasks', key: `task-overdue:${t._id}:${day(t.dueDate)}` });
    } else {
      rows.push({ to: mine, type: 'task-deadline', title: `Task due ${new Date(t.dueDate) < tomorrow ? 'today' : 'tomorrow'}: ${t.title}`, path: '/tasks', key: `task-soon:${t._id}:${day(t.dueDate)}` });
    }
  });

  const events = await Event.find({ status: 'upcoming', date: { $gte: today, $lte: tomorrow } }).select('name date location assignedVolunteers manager').limit(LIMIT).lean();
  events.forEach((e) => rows.push({
    to: ids(e.assignedVolunteers || [], [e.manager]), type: 'event-upcoming', title: `Event ${new Date(e.date) < tomorrow ? 'today' : 'tomorrow'}: ${e.name}`,
    message: e.location, path: '/events', key: `event-soon:${e._id}:${day(e.date)}`,
  }));

  const [food, lowFood, expiringFood, expiredFood, lowResources] = await Promise.all([
    usersWithPermission('food.view'),
    FoodInventory.find(alertClause('low', now)).select('foodItem remainingQuantity unit').limit(LIMIT).lean(),
    FoodInventory.find(alertClause('expiring', now)).select('foodItem expiryDate').limit(LIMIT).lean(),
    FoodInventory.find(alertClause('expired', now)).select('foodItem expiryDate').limit(LIMIT).lean(),
    Resource.find({ lowStockThreshold: { $ne: null }, status: { $nin: ['lost'] }, $expr: { $lte: ['$quantity', '$lowStockThreshold'] } }).select('name quantity').limit(LIMIT).lean(),
  ]);
  const foodIds = food.map((u) => String(u._id));
  lowFood.forEach((f) => rows.push({ to: foodIds, type: 'food-low', title: `Low stock: ${f.foodItem}`, message: `${f.remainingQuantity} ${f.unit} left`, path: '/food', key: `food-low:${f._id}:${f.remainingQuantity}` }));
  expiringFood.forEach((f) => rows.push({ to: foodIds, type: 'food-expiring', title: `Expiring soon: ${f.foodItem}`, message: `Good until ${day(f.expiryDate)}`, path: '/food', key: `food-exp:${f._id}:${day(f.expiryDate)}` }));
  expiredFood.forEach((f) => rows.push({ to: foodIds, type: 'food-expiring', title: `Expired: ${f.foodItem}`, message: `Expired on ${day(f.expiryDate)}`, path: '/food', key: `food-expired:${f._id}:${day(f.expiryDate)}` }));
  const resourceIds = lowResources.length ? (await usersWithPermission('resources.view')).map((u) => String(u._id)) : [];
  lowResources.forEach((r) => rows.push({ to: resourceIds, type: 'resource-low', title: `Running low: ${r.name}`, message: `${r.quantity} left`, path: '/resources', key: `resource-low:${r._id}:${r.quantity}` }));

  // Work out each person's area (/admin, /manager, /volunteer) once, then expand the rows into one notification per person.
  const everyone = ids(...rows.map((r) => r.to));
  const roles = Object.fromEntries((everyone.length ? await User.find({ _id: { $in: everyone }, status: 'active' }).select('role').lean() : []).map((u) => [String(u._id), u.role]));
  const docs = rows.flatMap((r) => r.to.filter((id) => roles[id]).map((id) => ({ user: id, type: r.type, title: r.title, message: r.message, link: `/${roles[id]}${r.path}`, dedupeKey: r.key })));
  const created = await createOnce(docs);
  return { checked: { tasks: tasks.length, events: events.length, food: lowFood.length + expiringFood.length + expiredFood.length, resources: lowResources.length }, created };
};

let running = false;
// Runs shortly after start-up and then hourly. A failed run is logged and tried again next hour.
exports.startAlertJob = (everyMs = 60 * 60 * 1000) => {
  if (process.env.ALERTS_DISABLED === 'true') return null;
  const tick = async () => {
    if (running) return;
    running = true;
    try { const r = await exports.runAlerts(); if (r.created) console.log(`Alerts: ${r.created} new notification(s)`); } catch (err) { console.error('Alert check failed:', err.message); } finally { running = false; }
  };
  setTimeout(tick, 5000).unref();
  return setInterval(tick, everyMs).unref();
};
