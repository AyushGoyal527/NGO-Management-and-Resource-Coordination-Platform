const ActivityLog = require('../models/ActivityLog');

// Never lets a logging failure break the request.
exports.logActivity = async ({ user, action, module, recordId, previousValue, newValue }) => {
  try {
    await ActivityLog.create({ user, action, module, recordId, previousValue, newValue });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
};
