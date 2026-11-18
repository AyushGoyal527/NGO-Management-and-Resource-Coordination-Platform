const { Schema, model } = require('mongoose');

// Catalog of assignable permissions (what shows up in the permission matrix).
module.exports = model('Permission', new Schema({
  key: { type: String, required: true, unique: true },
  module: { type: String, required: true },
  action: { type: String, required: true },
  description: String,
}));
