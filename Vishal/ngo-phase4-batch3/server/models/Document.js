const { Schema, model } = require('mongoose');

// File metadata only. `url` is what clients use, so moving to Cloudinary/S3 later does not change callers.
module.exports = model('Document', new Schema({
  originalName: String,
  filename: String,
  mimeType: String,
  size: Number,
  path: String,
  url: String,
  storage: { type: String, enum: ['local', 'cloudinary', 's3'], default: 'local' },
  module: String,
  recordId: Schema.Types.ObjectId,
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
