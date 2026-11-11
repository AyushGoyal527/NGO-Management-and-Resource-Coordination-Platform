const FoodInventory = require('../models/FoodInventory');
const ApiError = require('../utils/ApiError');

const DAY = 24 * 60 * 60 * 1000;
exports.DAY = DAY;
exports.EXPIRY_WARNING_DAYS = 14;

// One definition of "low", "expiring" and "expired", shared by the alerts, the list filter and the distribution check.
exports.alertClause = (kind, now = new Date()) => {
  const inStock = { remainingQuantity: { $gt: 0 } };
  switch (kind) {
    case 'low': return { ...inStock, $expr: { $lte: ['$remainingQuantity', '$lowStockThreshold'] } };
    case 'out': return { remainingQuantity: { $lte: 0 } };
    // An expiry date is a whole day: food is still good until that day is over.
    case 'expired': return { ...inStock, expiryDate: { $lt: new Date(now.getTime() - DAY) } };
    case 'expiring': return { ...inStock, expiryDate: { $gte: new Date(now.getTime() - DAY), $lte: new Date(now.getTime() + exports.EXPIRY_WARNING_DAYS * DAY) } };
    default: return null;
  }
};

exports.config = {
  module: 'food', label: 'Food item', model: FoodInventory, scoped: false, nameField: 'foodItem', dateField: 'receivedDate',
  searchFields: ['foodItem', 'source', 'storageLocation'],
  sortable: ['foodItem', 'quantity', 'remainingQuantity', 'expiryDate', 'receivedDate', 'createdAt'],
  filters: { unit: 'unit' },
  fields: ['foodItem', 'quantity', 'unit', 'expiryDate', 'source', 'storageLocation', 'receivedDate', 'lowStockThreshold'],
  extraFilter: (q) => (typeof q.alert === 'string' ? exports.alertClause(q.alert) : null),
  // Remaining stock is recalculated on save, so lowering the quantity below what was already given out would corrupt it.
  async beforeSave(data, { existing }) {
    if (existing && data.quantity !== undefined && Number(data.quantity) < existing.distributedQuantity) {
      throw new ApiError(400, `Quantity cannot be lower than the ${existing.distributedQuantity} ${existing.unit} already distributed`);
    }
  },
};
