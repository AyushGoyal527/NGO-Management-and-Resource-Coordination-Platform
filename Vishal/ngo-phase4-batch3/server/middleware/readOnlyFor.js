const ApiError = require('../utils/ApiError');

// Lets a role read records but change nothing, except the few paths in `allow` (e.g. a volunteer updating their own task's status).
// `blockReads` lists GET paths that role must not see either (e.g. the change history).
module.exports = (role, { allow = [], blockReads = [] } = {}) => (req, res, next) => {
  if (req.user.role !== role) return next();
  const ok = req.method === 'GET' ? !blockReads.some((rx) => rx.test(req.path)) : allow.some((rx) => rx.test(req.path));
  next(ok ? undefined : new ApiError(403, 'You do not have permission to perform this action'));
};
