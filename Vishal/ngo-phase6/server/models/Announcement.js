const { Schema, model } = require('mongoose');

module.exports = model('Announcement', new Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  audience: { type: String, enum: ['all', 'managers', 'volunteers'], default: 'all' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date,
}, { timestamps: true }));
