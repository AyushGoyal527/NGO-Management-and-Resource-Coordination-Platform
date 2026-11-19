const { Schema, model } = require('mongoose');

module.exports = model('Organization', new Schema({
  name: { type: String, required: true },
  tagline: String,
  registrationNumber: String,
  email: String,
  phone: String,
  address: String,
  website: String,
  logo: String,
  socialLinks: { facebook: String, instagram: String, twitter: String, youtube: String },
}, { timestamps: true }));
