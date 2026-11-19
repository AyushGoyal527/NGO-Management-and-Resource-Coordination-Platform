const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const OPEN = ['assigned', 'accepted', 'inProgress'];

// Today's calendar date in the organisation's timezone, as midnight UTC. Date-only values (due dates) are stored the same way,
// so they compare correctly whatever timezone the server runs in.
exports.todayStart = (now = new Date()) => new Date(`${now.toLocaleDateString('en-CA', { timeZone: TZ })}T00:00:00.000Z`);

exports.OPEN_TASK_STATUSES = OPEN;
exports.isOverdue = (dueDate, status) => !!dueDate && OPEN.includes(status) && new Date(dueDate) < exports.todayStart();
