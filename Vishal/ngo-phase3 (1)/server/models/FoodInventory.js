const { Schema, model } = require('mongoose');

const schema = new Schema({
  foodItem: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, enum: ['kg', 'g', 'litre', 'packets', 'boxes', 'pieces'], default: 'kg' },
  expiryDate: Date,
  source: String,
  storageLocation: String,
  receivedDate: { type: Date, default: Date.now },
  distributedQuantity: { type: Number, default: 0, min: 0 },
  remainingQuantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
}, { timestamps: true });

// Automatic remaining-stock calculation.
schema.pre('save', function calcRemaining(next) {
  this.remainingQuantity = Math.max(this.quantity - this.distributedQuantity, 0);
  next();
});

module.exports = model('FoodInventory', schema);
