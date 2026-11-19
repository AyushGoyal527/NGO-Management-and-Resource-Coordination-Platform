const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');
const { ALL_PERMISSIONS } = require('../config/permissions');

// Steps 1 + 2 of the permission flow: authenticate user, check account status.
exports.authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Please log in to continue');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Your session is invalid or has expired. Please log in again');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'This account no longer exists');
  if (user.status !== 'active') throw new ApiError(403, 'Your account is not active');
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new ApiError(401, 'Your password was changed. Please log in again');
  }
  req.user = user;
  next();
});

// Step 3: check role.
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action'));
  }
  next();
};

// Step 4: check requested permission. Admins always pass.
exports.requirePermission = (permission) => {
  if (!ALL_PERMISSIONS.includes(permission)) throw new Error(`Unknown permission: ${permission}`);
  return (req, res, next) => {
    const u = req.user;
    if (u && (u.role === 'admin' || u.permissions.includes(permission))) return next();
    next(new ApiError(403, 'You do not have permission to perform this action'));
  };
};
