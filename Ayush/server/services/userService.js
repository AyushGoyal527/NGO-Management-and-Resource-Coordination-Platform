const crypto = require("crypto");
const User = require("../models/User");
const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const { logActivity } = require("../utils/activityLogger");
const {
  ROLES,
  USER_STATUSES,
  MODULES,
  ALL_PERMISSIONS,
  defaultPermissionsFor,
  normalizePermissions,
} = require("../config/permissions");

const SORTABLE = ["name", "email", "role", "status", "lastLogin", "createdAt"];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findTarget(actor, id) {
  const target = await User.findById(id);
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin" && actor.role !== "admin")
    throw new ApiError(403, "Only an admin can change an admin account");
  return target;
}
const notSelf = (actor, target, what) => {
  if (String(actor._id) === String(target._id))
    throw new ApiError(400, `You cannot change your own ${what}`);
};

exports.list = async (q) => {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), 100);
  const filter = {};
  if (q.search) {
    const rx = new RegExp(escapeRegex(String(q.search).slice(0, 60)), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (ROLES.includes(q.role)) filter.role = q.role;
  filter.status = USER_STATUSES.includes(q.status)
    ? q.status
    : { $ne: "archived" };
  const sortBy = SORTABLE.includes(q.sortBy) ? q.sortBy : "createdAt";
  const order = q.order === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

exports.stats = async () => {
  const [byRole, byStatus] = await Promise.all([
    User.aggregate([
      { $match: { status: { $ne: "archived" } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    User.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const roles = toMap(byRole);
  const statuses = toMap(byStatus);
  return {
    total: Object.values(roles).reduce((a, b) => a + b, 0),
    admins: roles.admin || 0,
    managers: roles.manager || 0,
    volunteers: roles.volunteer || 0,
    active: statuses.active || 0,
    pending: statuses.pending || 0,
    inactive: statuses.inactive || 0,
  };
};

exports.catalog = () => ({ modules: MODULES, permissions: ALL_PERMISSIONS });

exports.getById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

exports.create = async (actor, data) => {
  if (await User.findOne({ email: data.email }))
    throw new ApiError(409, "An account with this email already exists");
  const isAdmin = actor.role === "admin";
  // Non-admins can only ever create plain volunteers: no privilege escalation through users.create.
  const role = isAdmin && data.role ? data.role : "volunteer";
  const permissions =
    isAdmin && Array.isArray(data.permissions)
      ? normalizePermissions(data.permissions)
      : defaultPermissionsFor(role);
  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role,
    permissions,
    status: data.status || "active",
  });
  await logActivity({
    user: actor._id,
    action: "create",
    module: "users",
    recordId: user._id,
    newValue: { email: user.email, role },
  });
  return user;
};

exports.update = async (actor, id, data) => {
  const target = await findTarget(actor, id);
  const previousValue = {
    name: target.name,
    email: target.email,
    phone: target.phone,
  };
  if (
    data.email &&
    data.email !== target.email &&
    (await User.findOne({ email: data.email }))
  ) {
    throw new ApiError(409, "An account with this email already exists");
  }
  ["name", "email", "phone"].forEach((f) => {
    if (data[f] !== undefined) target[f] = data[f];
  });
  await target.save();
  await logActivity({
    user: actor._id,
    action: "update",
    module: "users",
    recordId: target._id,
    previousValue,
    newValue: { name: target.name, email: target.email, phone: target.phone },
  });
  return target;
};

exports.setRole = async (actor, id, role) => {
  const target = await findTarget(actor, id);
  notSelf(actor, target, "role");
  const previous = target.role;
  target.role = role;
  target.permissions = defaultPermissionsFor(role); // a role change resets to that role's defaults
  target.dashboardModules = [];
  await target.save();
  await logActivity({
    user: actor._id,
    action: "change-role",
    module: "users",
    recordId: target._id,
    previousValue: { role: previous },
    newValue: { role },
  });
  return target;
};

exports.setPermissions = async (
  actor,
  id,
  { permissions, dashboardModules },
) => {
  const target = await findTarget(actor, id);
  if (target.role === "admin")
    throw new ApiError(400, "Admins already have full access");
  const unknown = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
  if (unknown.length)
    throw new ApiError(400, `Unknown permission: ${unknown[0]}`);

  const previous = {
    permissions: target.permissions,
    dashboardModules: target.dashboardModules,
  };
  target.permissions = normalizePermissions(permissions);
  if (Array.isArray(dashboardModules))
    target.dashboardModules = dashboardModules.filter((m) => MODULES[m]);
  await target.save();

  await Notification.create({
    user: target._id,
    type: "permission-changed",
    title: "Your permissions were updated",
    message: "An administrator changed what you can access.",
  });
  await logActivity({
    user: actor._id,
    action: "change-permissions",
    module: "users",
    recordId: target._id,
    previousValue: previous,
    newValue: {
      permissions: target.permissions,
      dashboardModules: target.dashboardModules,
    },
  });
  return target;
};

exports.setStatus = async (actor, id, status) => {
  const target = await findTarget(actor, id);
  notSelf(actor, target, "status");
  const previous = target.status;
  target.status = status;
  await target.save();
  await logActivity({
    user: actor._id,
    action: `status-${status}`,
    module: "users",
    recordId: target._id,
    previousValue: { status: previous },
    newValue: { status },
  });
  return target;
};

exports.resetPassword = async (actor, id, newPassword) => {
  const target = await findTarget(actor, id);
  const temp =
    newPassword || `${crypto.randomBytes(6).toString("base64url")}A1a`;
  target.password = temp;
  await target.save();
  await logActivity({
    user: actor._id,
    action: "reset-password",
    module: "users",
    recordId: target._id,
  });
  return { user: target, temporaryPassword: newPassword ? undefined : temp };
};

exports.archive = (actor, id) => exports.setStatus(actor, id, "archived");
