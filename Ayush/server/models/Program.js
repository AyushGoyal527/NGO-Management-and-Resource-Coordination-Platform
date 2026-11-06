const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model('Program', new Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  type: { type: String, enum: ['food-distribution', 'education', 'medical', 'donation-drive', 'community-event', 'other'], default: 'other' },
  startDate: Date,
  endDate: Date,
  location: String,
  budget: Number,
  manager: ref('User'),
  status: { type: String, enum: ['planned', 'active', 'completed', 'paused'], default: 'planned' },
}, { timestamps: true }));
