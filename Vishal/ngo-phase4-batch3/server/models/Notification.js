const { Schema, model } = require('mongoose');

module.exports = model('Notification', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: [
    'task-assigned', 'task-deadline', 'task-status', 'event-upcoming', 'donation-received',
    'resource-low', 'food-low', 'food-expiring', 'manager-assigned', 'permission-changed',
  ], required: true },
  title: { type: String, required: true },
  message: String,
  link: String,
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true }));
