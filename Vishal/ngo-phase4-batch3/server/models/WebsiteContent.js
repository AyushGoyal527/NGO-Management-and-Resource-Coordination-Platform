const { Schema, model } = require('mongoose');

// One document per public-site section (hero, about, mission, ...), edited from the admin CMS.
module.exports = model('WebsiteContent', new Schema({
  section: { type: String, required: true, unique: true },
  content: Schema.Types.Mixed,
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
