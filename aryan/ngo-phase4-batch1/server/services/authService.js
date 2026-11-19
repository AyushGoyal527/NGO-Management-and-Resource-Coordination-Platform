const crypto = require("crypto");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { signToken } = require("../utils/token");
const { sendMail } = require("../utils/mailer");
const { logActivity } = require("../utils/activityLogger");
const { defaultPermissionsFor } = require("../config/permissions");

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

// Public sign-up always creates a volunteer awaiting admin approval. Role is never taken from the client.
exports.register = async ({ name, email, password, phone }) => {
  if (await User.findOne({ email }))
    throw new ApiError(409, "An account with this email already exists");
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "volunteer",
    status: "pending",
    permissions: defaultPermissionsFor("volunteer"),
  });
  await logActivity({
    user: user._id,
    action: "register",
    module: "auth",
    recordId: user._id,
  });
  return user;
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password)))
    throw new ApiError(401, "Invalid email or password");
  if (user.status === "pending")
    throw new ApiError(403, "Your account is waiting for admin approval");
  if (user.status !== "active")
    throw new ApiError(
      403,
      "Your account is deactivated. Contact an administrator",
    );

  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });
  await logActivity({
    user: user._id,
    action: "login",
    module: "auth",
    recordId: user._id,
  });
  return { token: signToken(user._id), user, redirectTo: `/${user.role}` };
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email, status: "active" });
  const result = {
    message: "If that email is registered, a reset link has been sent",
  };
  if (!user) return result;

  const raw = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = sha256(raw);
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save({ validateModifiedOnly: true });

  const url = `${process.env.CLIENT_URL}/reset-password/${raw}`;
  await sendMail({
    to: user.email,
    subject: "Reset your password",
    text: `Reset your password (valid for 30 minutes): ${url}`,
  });
  if (process.env.NODE_ENV !== "production") result.devResetUrl = url; // convenience until email is configured
  return result;
};

exports.resetPassword = async (rawToken, newPassword) => {
  const user = await User.findOne({
    passwordResetToken: sha256(rawToken),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");
  if (!user)
    throw new ApiError(400, "This reset link is invalid or has expired");

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  await logActivity({
    user: user._id,
    action: "password-reset",
    module: "auth",
    recordId: user._id,
  });
};
