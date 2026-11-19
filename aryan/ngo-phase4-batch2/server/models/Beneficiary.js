const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model('Beneficiary', new Schema({
  name: { type: String, required: true, trim: true },
  photo: String,
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  contact: String,
  address: String,
  familySize: Number,
  economicCategory: { type: String, enum: ['below-poverty-line', 'low-income', 'middle-income', 'other'] },
  assistanceRequired: [String],
  assistanceProvided: [{ type: { type: String }, date: Date, notes: String }],
  assignedProgram: ref('Program'),
  assignedManager: ref('User'),
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
  notes: String,
  documents: [ref('Document')],
}, { timestamps: true }));
