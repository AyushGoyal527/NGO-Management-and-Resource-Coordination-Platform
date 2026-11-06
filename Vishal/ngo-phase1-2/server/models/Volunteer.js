const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model('Volunteer', new Schema({
  user: ref('User'),
  name: { type: String, required: true, trim: true },
  profilePhoto: String,
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  address: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  skills: [String],
  availability: String,
  joiningDate: { type: Date, default: Date.now },
  emergencyContact: { name: String, phone: String, relation: String },
  assignedManager: ref('User'),
  status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'pending', index: true },
  volunteerHours: { type: Number, default: 0, min: 0 },
  documents: [ref('Document')],
  notes: String,
}, { timestamps: true }));
