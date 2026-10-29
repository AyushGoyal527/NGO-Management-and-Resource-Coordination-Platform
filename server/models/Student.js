const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model('Student', new Schema({
  name: { type: String, required: true, trim: true },
  photo: String,
  age: Number,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  school: String,
  class: String,
  parentGuardian: { name: String, relation: String, phone: String },
  contact: String,
  address: String,
  educationStatus: { type: String, enum: ['enrolled', 'dropped', 'completed', 'on-hold'], default: 'enrolled' },
  educationProgress: { type: Number, min: 0, max: 100, default: 0 },
  program: ref('Program'),
  assignedManager: ref('User'),
  attendance: [{ date: Date, present: Boolean }],
  status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  notes: String,
  documents: [ref('Document')],
}, { timestamps: true }));
