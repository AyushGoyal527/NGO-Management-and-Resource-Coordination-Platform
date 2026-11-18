const { Schema, model } = require('mongoose');

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: [
    'task-assigned', 'task-deadline', 'task-status', 'event-upcoming', 'donation-received',
    'resource-low', 'food-low', 'food-expiring', 'manager-assigned', 'permission-changed',
    'volunteer-application', 'donation-inquiry', 'announcement',
  ], required: true },
  title: { type: String, required: true },
  message: String,
  link: String,
  read: { type: Boolean, default: false, index: true },
  // Set by the scheduled checks so the same alert is never sent to the same person twice.
  dedupeKey: String,
}, { timestamps: true });

schema.index({ user: 1, createdAt: -1 });
schema.index({ user: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 }); // old notifications clean themselves up after about six months

module.exports = model('Notification', schema);
