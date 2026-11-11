const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model('Resource', new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['books', 'clothes', 'computers', 'furniture', 'medicalSupplies', 'vehicles', 'equipment', 'stationery', 'other'], default: 'other', index: true },
  quantity: { type: Number, default: 1, min: 0 },
  condition: { type: String, enum: ['new', 'good', 'fair', 'poor'], default: 'good' },
  location: String,
  assignedPerson: ref('User'),
  purchaseOrDonationDate: Date,
  value: { type: Number, min: 0 },
  status: { type: String, enum: ['available', 'assigned', 'inUse', 'damaged', 'lost', 'maintenance'], default: 'available', index: true },
  notes: String,
}, { timestamps: true }));
