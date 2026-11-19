const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model('Task', new Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  assignedUser: ref('User'),
  assignedTeam: [ref('User')],
  createdBy: ref('User'),
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  startDate: Date,
  dueDate: { type: Date, index: true },
  location: String,
  category: String,
  attachments: [ref('Document')],
  status: { type: String, enum: ['assigned', 'accepted', 'inProgress', 'completed', 'cancelled'], default: 'assigned', index: true },
  comments: [{ user: ref('User'), text: String, createdAt: { type: Date, default: Date.now } }],
  completedAt: Date,
}, { timestamps: true }));
