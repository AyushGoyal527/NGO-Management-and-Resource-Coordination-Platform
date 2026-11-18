var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.APP_TIMEZONE = 'Asia/Kolkata';
const assert = require('assert');
const Task = require('./models/Task'), User = require('./models/User'), Notification = require('./models/Notification'), ActivityLog = require('./models/ActivityLog');
const Event = require('./models/Event'), Program = require('./models/Program'), Student = require('./models/Student'), Beneficiary = require('./models/Beneficiary');
const { isOverdue, todayStart } = require('./utils/dates');
const tasks = require('./modules/tasks'), events = require('./modules/events'), programs = require('./modules/programs');
const createTaskService = require('./services/taskService');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e.message); } };
const rejects = async (p, status, msg) => { try { await p; } catch (e) { assert.strictEqual(e.statusCode, status, `status ${e.statusCode} ${e.message}`); if (msg) assert(e.message.includes(msg), e.message); return; } throw new Error('did not throw'); };
const oid = (n) => n.toString(16).padStart(24, '0');
const admin = { _id: oid(1), role: 'admin', permissions: [], name: 'Admin' };
const mgr = { _id: oid(2), role: 'manager', permissions: ['tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'events.edit'], name: 'Meera' };
const mgrNoAssign = { ...mgr, permissions: ['tasks.view', 'tasks.create', 'tasks.edit'] };
const vol = { _id: oid(3), role: 'volunteer', permissions: ['tasks.view'], name: 'Vik' };
(async () => {
  // ---- dates
  const today = todayStart();
  await t('todayStart is midnight UTC', () => assert.strictEqual(today.toISOString().slice(-13), '00:00:00.000Z'));
  await t('IST: 02:00 IST on the 31st counts as the 31st (UTC is still the 30th)', () => assert.strictEqual(todayStart(new Date('2026-10-30T20:30:00Z')).toISOString().slice(0, 10), '2026-10-31'));
  await t('due today is not overdue', () => assert.strictEqual(isOverdue(today, 'assigned'), false));
  await t('due yesterday is overdue', () => assert.strictEqual(isOverdue(new Date(today - 864e5), 'inProgress'), true));
  await t('completed task is never overdue', () => assert.strictEqual(isOverdue(new Date(today - 864e5), 'completed'), false));
  await t('cancelled task is never overdue', () => assert.strictEqual(isOverdue(new Date(today - 864e5), 'cancelled'), false));
  await t('no due date is not overdue', () => assert.strictEqual(isOverdue(undefined, 'assigned'), false));
  await t('virtual isOverdue appears in JSON', () => assert.strictEqual(new Task({ title: 'x', dueDate: new Date(today - 864e5) }).toJSON().isOverdue, true));
  // ---- scopes
  await t('task scope: admin sees all', () => assert.deepStrictEqual(tasks.scopeFilter?.(admin) ?? {}, {}));
  // ---- task beforeSave
  const countOK = (n) => { User.countDocuments = async () => n; };
  await t('task: manager without tasks.assign cannot assign', () => rejects(tasks.beforeSave({ assignedUser: oid(9) }, { user: mgrNoAssign, isCreate: true }), 403, 'assign'));
  await t('task: manager without tasks.assign can create unassigned', async () => { await tasks.beforeSave({ title: 'x' }, { user: mgrNoAssign, isCreate: true }); });
  await t('task: unchanged assignee on edit needs no assign permission', async () => {
    const existing = { assignedUser: oid(9), assignedTeam: [] };
    await tasks.beforeSave({ assignedUser: oid(9), title: 'new' }, { user: mgrNoAssign, isCreate: false, existing });
  });
  await t('task: swapping assignee without permission is refused', () => rejects(tasks.beforeSave({ assignedUser: oid(8) }, { user: mgrNoAssign, isCreate: false, existing: { assignedUser: oid(9), assignedTeam: [] } }), 403));
  await t('task: clearing assignee without permission is refused', () => rejects(tasks.beforeSave({ assignedUser: undefined }, { user: mgrNoAssign, isCreate: false, existing: { assignedUser: oid(9), assignedTeam: [] } }), 403));
  await t('task: non-volunteer/inactive assignee refused', async () => { countOK(0); await rejects(tasks.beforeSave({ assignedUser: oid(9) }, { user: mgr, isCreate: true }), 400, 'active volunteers'); });
  await t('task: team member not found refused', async () => { countOK(1); await rejects(tasks.beforeSave({ assignedTeam: [oid(5), oid(6)] }, { user: mgr, isCreate: true }), 400, 'active volunteers'); });
  await t('task: valid assignee passes', async () => { countOK(1); await tasks.beforeSave({ assignedUser: oid(9) }, { user: mgr, isCreate: true }); });
  await t('task: duplicate ids counted once', async () => { countOK(1); await tasks.beforeSave({ assignedUser: oid(9), assignedTeam: [oid(9)] }, { user: mgr, isCreate: true }); });
  await t('task: due before start refused', () => rejects(tasks.beforeSave({ startDate: new Date('2030-02-01'), dueDate: new Date('2030-01-01') }, { user: admin, isCreate: true }), 400, 'before the start'));
  await t('task: due in the past refused on create', () => rejects(tasks.beforeSave({ dueDate: new Date(today - 864e5) }, { user: admin, isCreate: true }), 400, 'in the past'));
  await t('task: due today allowed on create', async () => { await tasks.beforeSave({ dueDate: today }, { user: admin, isCreate: true }); });
  await t('task: old due date allowed when editing other fields', async () => { await tasks.beforeSave({ title: 'x' }, { user: admin, isCreate: false, existing: { dueDate: new Date(today - 864e5), assignedTeam: [] } }); });
  await t('task: stamp sets createdBy', () => { const d = {}; tasks.stamp(d, mgr); assert.strictEqual(d.createdBy, mgr._id); });
  await t('task: status is not editable through PUT', () => assert(!tasks.fields.includes('status') && !tasks.fields.includes('createdBy') && !tasks.fields.includes('comments')));
  // ---- task service
  const calls = { notes: [], logs: [], updates: [] };
  Notification.insertMany = async (rows) => { calls.notes.push(...rows); };
  ActivityLog.create = async (r) => { calls.logs.push(r); };
  const known = [{ _id: oid(2), role: 'manager' }, { _id: oid(3), role: 'volunteer' }, { _id: oid(4), role: 'volunteer' }];
  User.find = (q) => ({ select: async () => known.filter((u) => q._id.$in.map(String).includes(u._id)) });
  let current;
  const fakeSvc = { findInScope: async () => current, get: async () => ({ ok: true }) };
  const mk = (status, extra = {}) => { current = { _id: oid(50), title: 'Pack kits', status, createdBy: oid(2), assignedUser: oid(3), assignedTeam: [], comments: Object.assign([{ _id: oid(70), user: oid(3), text: 'hi' }, { _id: oid(71), user: oid(2), text: 'ok' }], { id(i) { return this.find((c) => c._id === i) || null; } }), ...extra }; };
  Task.findOneAndUpdate = async (filter, update) => { calls.updates.push({ filter, update }); return calls.lose ? null : { _id: filter._id }; };
  const svc = createTaskService(fakeSvc);
  const reset = () => { calls.notes = []; calls.logs = []; calls.updates = []; calls.lose = false; };
  const moves = [['assigned', 'accepted', true], ['assigned', 'inProgress', true], ['assigned', 'completed', false], ['accepted', 'inProgress', true], ['accepted', 'completed', true], ['accepted', 'assigned', false],
    ['inProgress', 'completed', true], ['inProgress', 'accepted', false], ['completed', 'inProgress', false], ['completed', 'cancelled', false], ['assigned', 'cancelled', false], ['cancelled', 'assigned', false]];
  for (const [from, to, ok] of moves) {
    await t(`volunteer ${from} -> ${to} ${ok ? 'allowed' : 'refused'}`, async () => { reset(); mk(from); if (ok) await svc.setStatus(vol, current._id, to); else await rejects(svc.setStatus(vol, current._id, to), 403); });
  }
  await t('same status refused', async () => { reset(); mk('assigned'); await rejects(svc.setStatus(vol, current._id, 'assigned'), 400, 'already'); });
  await t('manager can reopen a completed task', async () => { reset(); mk('completed'); await svc.setStatus(mgr, current._id, 'inProgress'); assert.deepStrictEqual(calls.updates[0].update.$unset, { completedAt: '' }); });
  await t('manager can cancel', async () => { reset(); mk('assigned'); await svc.setStatus(mgr, current._id, 'cancelled'); });
  await t('completing sets completedAt and checks previous status atomically', async () => { reset(); mk('inProgress'); await svc.setStatus(vol, current._id, 'completed'); const u = calls.updates[0]; assert(u.update.$set.completedAt instanceof Date); assert.strictEqual(u.filter.status, 'inProgress'); });
  await t('lost race gives 409 and no notification/log', async () => { reset(); mk('assigned'); calls.lose = true; await rejects(svc.setStatus(vol, current._id, 'accepted'), 409); assert.strictEqual(calls.notes.length + calls.logs.length, 0); });
  await t('volunteer status change logs and notifies the creator (not themselves)', async () => { reset(); mk('assigned'); await svc.setStatus(vol, current._id, 'accepted'); assert.strictEqual(calls.logs.length, 1); assert.deepStrictEqual(calls.logs[0].newValue, { status: 'accepted' }); assert(calls.notes.every((n) => n.link === '/manager/tasks')); });
  await t('manager status change notifies assignees in /volunteer/tasks', async () => { reset(); mk('assigned', { assignedTeam: [oid(4)] }); await svc.setStatus(mgr, current._id, 'cancelled'); assert(calls.notes.length >= 1 && calls.notes.every((n) => n.link === '/volunteer/tasks' || n.link === '/manager/tasks')); });
  await t('notification failure does not break the status change', async () => { reset(); mk('assigned'); Notification.insertMany = async () => { throw new Error('boom'); }; await svc.setStatus(vol, current._id, 'accepted'); Notification.insertMany = async (rows) => { calls.notes.push(...rows); }; });
  // comments
  let pushed;
  Task.updateOne = async (f, u) => { pushed = { f, u }; return { modifiedCount: calls.full ? 0 : 1 }; };
  await t('comment is added with author', async () => { reset(); mk('assigned'); await svc.addComment(vol, current._id, 'on it'); assert.deepStrictEqual(pushed.u.$push.comments, { user: vol._id, text: 'on it' }); });
  await t('comment cap returns 400', async () => { reset(); mk('assigned'); calls.full = true; await rejects(svc.addComment(vol, current._id, 'x'), 400, '200'); calls.full = false; });
  await t('volunteer can delete own comment', async () => { reset(); mk('assigned'); await svc.removeComment(vol, current._id, oid(70)); assert.strictEqual(pushed.u.$pull.comments._id, oid(70)); });
  await t("volunteer cannot delete someone else's comment", async () => { reset(); mk('assigned'); await rejects(svc.removeComment(vol, current._id, oid(71)), 403); });
  await t("manager with tasks.edit can delete a volunteer's comment", async () => { reset(); mk('assigned'); await svc.removeComment(mgr, current._id, oid(70)); });
  await t("manager without tasks.edit cannot delete others' comments", async () => { reset(); mk('assigned'); await rejects(svc.removeComment({ ...mgr, permissions: ['tasks.view'] }, current._id, oid(70)), 403); });
  await t('missing comment is 404', async () => { reset(); mk('assigned'); await rejects(svc.removeComment(admin, current._id, oid(99)), 404); });
  // task afterSave notifies only new assignees
  await t('assignment notifies new assignees only, never the actor', async () => { reset(); await tasks.afterSave({ title: 'T', assignedUser: oid(3), assignedTeam: [oid(4)], dueDate: today }, { user: { _id: oid(4) }, before: { assignedUser: oid(3), assignedTeam: [] } }); assert.strictEqual(calls.notes.length, 0);
    await tasks.afterSave({ title: 'T', assignedUser: oid(3), assignedTeam: [oid(5)] }, { user: mgr, before: { assignedUser: oid(3), assignedTeam: [] } }); assert.deepStrictEqual(calls.notes.map((n) => String(n.user)), [oid(5)]); });
  // ---- events
  const E = (o) => o;
  await t('event: manager cannot set manager (ignored)', async () => { User.countDocuments = async () => 0; const d = { manager: oid(9) }; await events.beforeSave(d, { user: mgr, existing: null }); assert.strictEqual(d.manager, undefined); });
  await t('event: stamp makes managers own what they create', () => { const d = {}; events.stamp(d, mgr); assert.strictEqual(d.manager, mgr._id); assert.strictEqual(d.organizer, mgr._id); });
  await t('event: stamp leaves manager for admin to choose', () => { const d = { manager: oid(9) }; events.stamp(d, admin); assert.strictEqual(d.manager, oid(9)); });
  await t('event: unknown volunteer refused', async () => { User.countDocuments = async () => 0; await rejects(events.beforeSave({ assignedVolunteers: [oid(7)] }, { user: admin }), 400, 'volunteers'); });
  await t('event: already-assigned volunteers are not re-checked', async () => { User.countDocuments = async () => { throw new Error('should not query'); }; await events.beforeSave({ assignedVolunteers: [oid(7)] }, { user: admin, existing: { assignedVolunteers: [oid(7)] } }); });
  await t('event: manager can only attach own beneficiaries', async () => { let filter; Beneficiary.countDocuments = async (f) => { filter = f; return 0; }; await rejects(events.beforeSave({ beneficiaries: [oid(7)] }, { user: mgr }), 400, 'beneficiaries'); assert.strictEqual(String(filter.assignedManager), mgr._id); });
  await t('event: end time must follow start time', () => rejects(events.beforeSave({ startTime: '10:00', endTime: '09:00' }, { user: admin }), 400, 'end time'));
  await t('event: equal times refused', () => rejects(events.beforeSave({ startTime: '10:00', endTime: '10:00' }, { user: admin }), 400));
  await t('event: end time checked against stored start time', () => rejects(events.beforeSave({ endTime: '08:00' }, { user: admin, existing: { startTime: '09:00' } }), 400));
  await t('event: unknown program refused', async () => { Program.exists = async () => null; await rejects(events.beforeSave({ program: oid(7) }, { user: admin }), 400, 'program'); });
  await t('event: unknown manager refused for admin', async () => { User.exists = async () => null; await rejects(events.beforeSave({ manager: oid(7) }, { user: admin }), 400, 'manager'); });
  // ---- programs
  await t('program: manager of another program cannot edit', () => rejects(programs.beforeSave({ name: 'x' }, { user: mgr, existing: { manager: oid(9) } }), 403));
  await t('program: own program editable', async () => { await programs.beforeSave({ name: 'x' }, { user: mgr, existing: { manager: mgr._id } }); });
  await t('program: unassigned program editable by a manager', async () => { await programs.beforeSave({ name: 'x' }, { user: mgr, existing: {} }); });
  await t('program: manager cannot reassign', async () => { const d = { manager: oid(9) }; await programs.beforeSave(d, { user: mgr, existing: { manager: mgr._id } }); assert.strictEqual(d.manager, undefined); });
  await t('program: end before start refused', () => rejects(programs.beforeSave({ startDate: new Date('2030-02-01'), endDate: new Date('2030-01-01') }, { user: admin }), 400, 'end date'));
  await t('program: stamp for manager', () => { const d = {}; programs.stamp(d, mgr); assert.strictEqual(d.manager, mgr._id); });
  const cnt = (e, s, b) => { Event.countDocuments = async () => e; Student.countDocuments = async () => s; Beneficiary.countDocuments = async () => b; };
  await t('program: delete blocked while in use, with counts', async () => { cnt(1, 2, 3); await rejects(programs.beforeRemove({ _id: oid(5) }, { user: admin }), 409, '1 event, 2 students, 3 beneficiaries'); });
  await t('program: delete allowed when unused', async () => { cnt(0, 0, 0); await programs.beforeRemove({ _id: oid(5) }, { user: admin }); });
  await t("program: other manager cannot delete", () => rejects(programs.beforeRemove({ _id: oid(5), manager: oid(9) }, { user: mgr }), 403));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
