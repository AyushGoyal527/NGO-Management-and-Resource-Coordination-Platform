const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model('FoodDistribution', new Schema({
  date: { type: Date, default: Date.now, index: true },
  location: { type: String, required: true },
  items: [{ inventory: ref('FoodInventory'), foodItem: String, quantity: { type: Number, min: 0 } }],
  numberOfBeneficiaries: { type: Number, default: 0 },
  assignedVolunteers: [ref('User')],
  manager: ref('User'),
  notes: String,
}, { timestamps: true }));
