const FoodInventory = require('../models/FoodInventory');
const FoodDistribution = require('../models/FoodDistribution');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');
const { alertClause, DAY } = require('../modules/food');

const round3 = (n) => Math.round(Number(n) * 1000) / 1000;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const PICK = 'foodItem remainingQuantity quantity unit expiryDate lowStockThreshold';

exports.alerts = async () => {
  const now = new Date();
  const find = (kind, sort) => FoodInventory.find(alertClause(kind, now)).sort(sort).limit(50).select(PICK).lean();
  const [lowStock, expiring, expired] = await Promise.all([
    find('low', { remainingQuantity: 1 }), find('expiring', { expiryDate: 1 }), find('expired', { expiryDate: 1 }),
  ]);
  return { lowStock, expiring, expired, total: lowStock.length + expiring.length + expired.length };
};

// Items someone can still hand out: in stock and not past their expiry date.
exports.available = () => FoodInventory.find({
  remainingQuantity: { $gt: 0 }, $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date(Date.now() - DAY) } }],
}).sort('foodItem').select(PICK).lean();

// A single atomic step: only changes the item if enough is left, and rounds away floating-point dust.
const takeStock = (id, qty) => FoodInventory.findOneAndUpdate(
  { _id: id, remainingQuantity: { $gte: qty } },
  [{ $set: {
    distributedQuantity: { $round: [{ $add: ['$distributedQuantity', qty] }, 3] },
    remainingQuantity: { $round: [{ $subtract: ['$remainingQuantity', qty] }, 3] },
  } }],
  { new: true },
);

const returnStock = (id, qty) => FoodInventory.updateOne({ _id: id }, [{ $set: {
  distributedQuantity: { $max: [0, { $round: [{ $subtract: ['$distributedQuantity', qty] }, 3] }] },
  remainingQuantity: { $round: [{ $add: ['$remainingQuantity', qty] }, 3] },
} }]);

exports.distribute = async (user, body) => {
  const items = (body.items || []).map((i) => ({ inventory: String(i.inventory), quantity: round3(i.quantity) }));
  if (new Set(items.map((i) => i.inventory)).size !== items.length) throw new ApiError(400, 'Each food item can only be listed once');
  if (items.some((i) => !(i.quantity > 0))) throw new ApiError(400, 'Quantities must be greater than zero');

  const stock = await FoodInventory.find({ _id: { $in: items.map((i) => i.inventory) } });
  if (stock.length !== items.length) throw new ApiError(400, 'One of the food items no longer exists');
  const byId = Object.fromEntries(stock.map((s) => [String(s._id), s]));
  const now = new Date();
  items.forEach((i) => {
    const s = byId[i.inventory];
    if (s.expiryDate && s.expiryDate.getTime() + DAY < now.getTime()) throw new ApiError(400, `${s.foodItem} expired on ${fmtDate(s.expiryDate)} and cannot be distributed`);
  });

  const volunteers = [...new Set((body.assignedVolunteers || []).map(String))];
  if (volunteers.length && (await User.countDocuments({ _id: { $in: volunteers }, role: 'volunteer', status: 'active' })) !== volunteers.length) {
    throw new ApiError(400, 'One of the selected volunteers is not an active volunteer');
  }

  let manager = user._id;
  if (user.role === 'admin' && body.manager) {
    if (!(await User.exists({ _id: body.manager, role: 'manager', status: 'active' }))) throw new ApiError(400, 'Selected manager was not found');
    manager = body.manager;
  }

  // No transactions on a standalone MongoDB, so deduct one by one and undo on any failure.
  const taken = [];
  try {
    for (const i of items) {
      const updated = await takeStock(i.inventory, i.quantity);
      if (!updated) {
        const s = byId[i.inventory];
        const fresh = await FoodInventory.findById(i.inventory).select('remainingQuantity unit').lean();
        throw new ApiError(400, `Not enough ${s.foodItem} in stock (${fresh?.remainingQuantity ?? 0} ${s.unit} left)`);
      }
      taken.push(i);
    }
    const record = await FoodDistribution.create({
      date: body.date ? new Date(body.date) : new Date(), location: body.location, numberOfBeneficiaries: body.numberOfBeneficiaries || 0,
      items: items.map((i) => ({ inventory: i.inventory, foodItem: byId[i.inventory].foodItem, unit: byId[i.inventory].unit, quantity: i.quantity })),
      assignedVolunteers: volunteers, manager, notes: body.notes || undefined,
    });
    await logActivity({ user: user._id, action: 'distribute', module: 'food', recordId: record._id,
      newValue: { location: record.location, items: record.items.map((i) => `${i.foodItem} ${i.quantity}`) } });
    return record;
  } catch (err) {
    await Promise.all(taken.map((i) => returnStock(i.inventory, i.quantity)));
    throw err;
  }
};

const scope = (user) => (user.role === 'admin' ? {} : { manager: user._id });

exports.listDistributions = async (q, user) => {
  const filter = {};
  const range = {};
  if (q.from && !Number.isNaN(Date.parse(q.from))) range.$gte = new Date(q.from);
  if (q.to && !Number.isNaN(Date.parse(q.to))) range.$lte = new Date(new Date(q.to).getTime() + 24 * 60 * 60 * 1000 - 1);
  if (Object.keys(range).length) filter.date = range;
  Object.assign(filter, scope(user));

  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), 100);
  const [items, total] = await Promise.all([
    FoodDistribution.find(filter).sort({ date: -1, _id: 1 }).skip((page - 1) * limit).limit(limit)
      .populate('manager', 'name').populate('assignedVolunteers', 'name'),
    FoodDistribution.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

// Deleting a distribution puts the stock back, so a mistake can be undone.
exports.removeDistribution = async (user, id) => {
  const record = await FoodDistribution.findOne({ _id: id, ...scope(user) });
  if (!record) throw new ApiError(404, 'Distribution not found');
  await Promise.all(record.items.map((i) => returnStock(i.inventory, i.quantity)));
  await record.deleteOne();
  await logActivity({ user: user._id, action: 'delete-distribution', module: 'food', recordId: record._id,
    previousValue: { location: record.location, items: record.items.map((i) => `${i.foodItem} ${i.quantity}`) } });
};
