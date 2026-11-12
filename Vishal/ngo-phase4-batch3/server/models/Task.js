const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

const schema = new Schema({
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
  documents: [ref('Document')], // attachments
  status: { type: String, enum: ['assigned', 'accepted', 'inProgress', 'completed', 'cancelled'], default: 'assigned', index: true },
  comments: [{ user: ref('User'), text: String, createdAt: { type: Date, default: Date.now } }],
  completedAt: Date,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const { isOverdue } = require('../utils/dates');
// Past its due date and still open. Due dates are whole days, so a task due today is not overdue until tomorrow.
schema.virtual('isOverdue').get(function overdue() { return isOverdue(this.dueDate, this.status); });

module.exports = model('Task', schema);
