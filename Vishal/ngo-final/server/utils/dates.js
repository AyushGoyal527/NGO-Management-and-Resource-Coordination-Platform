const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const OPEN = ['assigned', 'accepted', 'inProgress'];

// Today's calendar date in the organisation's timezone, as midnight UTC. Date-only values (due dates) are stored the same way,
// so they compare correctly whatever timezone the server runs in.
exports.todayStart = (now = new Date()) => new Date(`${now.toLocaleDateString('en-CA', { timeZone: TZ })}T00:00:00.000Z`);

exports.OPEN_TASK_STATUSES = OPEN;
exports.isOverdue = (dueDate, status) => !!dueDate && OPEN.includes(status) && new Date(dueDate) < exports.todayStart();

// Midnight at the start of a yyyy-mm-dd day in the organisation's timezone, as a real instant (for filtering timestamps).
exports.zoneDayStart = (str) => {
  const guess = new Date(`${str}T00:00:00Z`);
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(guess).find((p) => p.type === 'timeZoneName')?.value || 'GMT';
  const m = /GMT([+-])(\d\d):(\d\d)/.exec(name);
  const minutes = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(guess.getTime() - minutes * 60000);
};
exports.TZ = TZ;
