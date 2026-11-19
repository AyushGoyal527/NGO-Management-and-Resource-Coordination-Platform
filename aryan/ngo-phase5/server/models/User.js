const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES, USER_STATUSES, ALL_PERMISSIONS } = require('../config/permissions');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    profilePhoto: { type: String },
    role: { type: String, enum: ROLES, default: 'volunteer', index: true },
    status: { type: String, enum: USER_STATUSES, default: 'pending', index: true },
    permissions: [{ type: String, enum: ALL_PERMISSIONS }],
    // Modules a manager sees on the dashboard/sidebar (admin-configurable).
    dashboardModules: [{ type: String }],
    lastLogin: Date,
    passwordChangedAt: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
