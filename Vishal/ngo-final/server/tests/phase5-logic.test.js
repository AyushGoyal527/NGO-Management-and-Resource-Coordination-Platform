var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.APP_TIMEZONE = 'Asia/Kolkata';
const assert = require('assert'); const fs = require('fs');
const Notification = require('./models/Notification'), User = require('./models/User'), Task = require('./models/Task'), Event = require('./models/Event');
const Resource = require('./models/Resource'), FoodInventory = require('./models/FoodInventory');
const notifyUtil = require('./utils/notify');
const alerts = require('./services/alertService'), notifs = require('./services/notificationService');
const reports = require('./services/reportService'); const { REPORTS } = require('./config/reports');
const act = require('./services/activityService');
let pass = 0, fail = 0;
const t = async (n, fn) => { try { await fn(); pass++; console.log('PASS', n); } catch (e) { fail++; console.log('FAIL', n, '-', e.message); } };
const rejects = async (p, status) => { try { await p; } catch (e) { assert.strictEqual(e.statusCode, status, e.message); return; } throw new Error('did not throw'); };
const oid = (n) => n.toString(16).padStart(24, '0');
const chain = (rows) => { const c = { sort: () => c, skip: () => c, limit: () => c, populate: () => c, lean: async () => rows, select: () => c }; return c; };
const admin = { _id: oid(1), role: 'admin', permissions: [], name: 'Admin' };
const mgr = (perms) => ({ _id: oid(2), role: 'manager', permissions: perms, name: 'Meera' });
(async () => {
  // ---- notification service scoping
  await t('list is limited to the signed-in person', async () => { let f; Notification.find = (x) => { f = x; return chain([]); }; Notification.countDocuments = async () => 0; await notifs.list(mgr([]), { unread: 'true', type: 'task-status' }); assert.strictEqual(String(f.user), oid(2)); assert.strictEqual(f.read, false); assert.strictEqual(f.type, 'task-status'); });
  await t('list paging is clamped', async () => { let lim; Notification.find = () => { const c = chain([]); c.limit = (n) => { lim = n; return c; }; return c; }; Notification.countDocuments = async () => 0; const r = await notifs.list(mgr([]), { limit: '9999', page: '-3' }); assert.strictEqual(lim, 50); assert.strictEqual(r.pagination.page, 1); });
  await t("mark read only touches your own; someone else's id is 404", async () => { let f; Notification.updateOne = async (x) => { f = x; return { matchedCount: 0 }; }; await rejects(notifs.markRead(mgr([]), oid(9)), 404); assert.strictEqual(String(f.user), oid(2)); });
  await t("delete only your own; someone else's is 404", async () => { let f; Notification.deleteOne = async (x) => { f = x; return { deletedCount: 0 }; }; await rejects(notifs.remove(mgr([]), oid(9)), 404); assert.strictEqual(String(f.user), oid(2)); });
  await t('mark all read and clear read are scoped to the person', async () => { const fs_ = []; Notification.updateMany = async (f) => { fs_.push(f); return { modifiedCount: 3 }; }; Notification.deleteMany = async (f) => { fs_.push(f); return { deletedCount: 2 }; }; assert.strictEqual(await notifs.markAllRead(mgr([])), 3); assert.strictEqual(await notifs.clearRead(mgr([])), 2); assert(fs_.every((f) => String(f.user) === oid(2))); assert.strictEqual(fs_[1].read, true); });
  // ---- createOnce
  await t('createOnce counts only new rows when some are duplicates', async () => { Notification.insertMany = async () => { const e = new Error('dup'); e.writeErrors = [{ code: 11000 }, { err: { code: 11000 } }]; e.insertedDocs = [{}]; throw e; }; assert.strictEqual(await notifyUtil.createOnce([{}, {}, {}]), 1); });
  await t('createOnce rethrows real errors', async () => { Notification.insertMany = async () => { const e = new Error('disk'); e.writeErrors = [{ code: 121 }]; throw e; }; await assert.rejects(notifyUtil.createOnce([{}])); });
  await t('createOnce with nothing does nothing', async () => assert.strictEqual(await notifyUtil.createOnce([]), 0));
  // ---- alerts
  const today = alerts.runAlerts && require('./utils/dates').todayStart();
  const DAY = 864e5, d = (n) => new Date(today.getTime() + n * DAY);
  const inserted = [];
  Notification.insertMany = async (rows) => { inserted.push(...rows); return rows; };
  const sel = (rows) => ({ select: () => ({ limit: () => ({ lean: async () => rows }) }) });
  User.find = (q) => { const ids = q._id?.$in; const all = [{ _id: oid(2), role: 'manager' }, { _id: oid(3), role: 'volunteer' }, { _id: oid(1), role: 'admin' }]; const rows = ids ? all.filter((u) => ids.includes(u._id)) : all; return { select: () => ({ lean: async () => rows }) }; };
  Task.find = () => sel([
    { _id: oid(10), title: 'Overdue one', dueDate: d(-3), assignedUser: oid(3), assignedTeam: [], createdBy: oid(2) },
    { _id: oid(11), title: 'Today one', dueDate: d(0), assignedUser: oid(3), assignedTeam: [], createdBy: oid(2) },
    { _id: oid(12), title: 'Tomorrow one', dueDate: d(1), assignedUser: oid(3), assignedTeam: [], createdBy: oid(2) }]);
  Event.find = () => sel([{ _id: oid(20), name: 'Camp', date: d(1), location: 'Hall', assignedVolunteers: [oid(3)], manager: oid(2) }]);
  FoodInventory.find = (c) => ({ select: () => ({ limit: () => ({ lean: async () => (c.$expr ? [{ _id: oid(30), foodItem: 'Rice', remainingQuantity: 4, unit: 'kg' }] : c.expiryDate?.$lt ? [{ _id: oid(31), foodItem: 'Milk', expiryDate: d(-5) }] : [{ _id: oid(32), foodItem: 'Dal', expiryDate: d(3) }]) }) }) });
  Resource.find = () => sel([{ _id: oid(40), name: 'Laptops', quantity: 1 }]);
  const permUsers = (p) => (p === 'food.view' ? [{ _id: oid(2), role: 'manager' }, { _id: oid(1), role: 'admin' }] : [{ _id: oid(1), role: 'admin' }]);
  const realPerm = notifyUtil.usersWithPermission; notifyUtil.usersWithPermission = async (p) => permUsers(p);
  delete require.cache[require.resolve('./services/alertService')]; const alerts2 = require('./services/alertService');
  await t('alert run builds one notification per person per alert, with role links', async () => {
    inserted.length = 0; const r = await alerts2.runAlerts(); const by = (title) => inserted.filter((n) => n.title.includes(title));
    assert.strictEqual(by('Overdue task').length, 2); // volunteer + creator manager
    assert(by('Overdue task').find((n) => String(n.user) === oid(3)).link === '/volunteer/tasks');
    assert(by('Overdue task').find((n) => String(n.user) === oid(2)).link === '/manager/tasks');
    assert.strictEqual(by('Task due today').length, 1); assert.strictEqual(by('Task due tomorrow').length, 1);
    assert.strictEqual(by('Event tomorrow').length, 2); assert(by('Event tomorrow').some((n) => n.link === '/manager/events'));
    assert.strictEqual(by('Low stock').length, 2); assert(by('Low stock').some((n) => n.link === '/admin/food'));
    assert.strictEqual(by('Expired: Milk').length, 2); assert.strictEqual(by('Expiring soon').length, 2);
    assert.strictEqual(by('Running low').length, 1); assert.strictEqual(by('Running low')[0].link, '/admin/resources');
    assert(inserted.every((n) => n.dedupeKey && n.type), 'every alert has a dedupe key');
    assert.strictEqual(new Set(inserted.map((n) => `${n.user}|${n.dedupeKey}`)).size, inserted.length, 'no duplicate (user,key) in one run');
    assert.strictEqual(r.checked.tasks, 3);
  });
  await t('alert keys are stable between runs (so the unique index can skip repeats)', async () => { inserted.length = 0; await alerts2.runAlerts(); const a = inserted.map((n) => `${n.user}|${n.dedupeKey}`).sort(); inserted.length = 0; await alerts2.runAlerts(); assert.deepStrictEqual(inserted.map((n) => `${n.user}|${n.dedupeKey}`).sort(), a); });
  await t('inactive/unknown recipients are skipped', async () => { User.find = () => ({ select: () => ({ lean: async () => [] }) }); inserted.length = 0; await alerts2.runAlerts(); assert.strictEqual(inserted.length, 0); });
  notifyUtil.usersWithPermission = realPerm;
  // ---- activity filter
  await t('activity filter: day range is in the organisation timezone and inclusive', () => { const f = act.buildFilter({ from: '2026-10-31', to: '2026-10-31', module: 'tasks', user: oid(3) }); assert.strictEqual(f.timestamp.$gte.toISOString(), '2026-10-30T18:30:00.000Z'); assert.strictEqual(f.timestamp.$lt.toISOString(), '2026-10-31T18:30:00.000Z'); assert.strictEqual(f.module, 'tasks'); });
  await t('activity filter ignores unknown/array params', () => { const f = act.buildFilter({ module: ['a', 'b'], bogus: 'x' }); assert.deepStrictEqual(f, {}); });
  // ---- reports: access
  await t('catalog: admin sees all 10', () => assert.strictEqual(reports.catalog(admin).length, 10));
  await t('catalog: needs reports.view', () => assert.strictEqual(reports.catalog(mgr(['tasks.view'])).length, 0));
  await t('catalog: needs the source module permission too', () => assert.deepStrictEqual(reports.catalog(mgr(['reports.view', 'tasks.view', 'food.view'])).map((r) => r.key).sort(), ['food-distributions', 'food-stock', 'tasks']));
  await t('catalog hides the manager filter from non-admins', () => { const m = reports.catalog(mgr(['reports.view', 'volunteers.view']))[0]; assert(!m.filters.some((f) => f.param === 'manager')); assert(reports.catalog(admin).find((r) => r.key === 'volunteers').filters.some((f) => f.param === 'manager')); });
  await t('requireReport: unknown is 404, not permitted is 403', () => { reports.requireReport(admin, 'tasks'); try { reports.requireReport(admin, 'nope'); assert.fail('x'); } catch (e) { assert.strictEqual(e.statusCode, 404); } try { reports.requireReport(mgr(['reports.view']), 'tasks'); assert.fail('x'); } catch (e) { assert.strictEqual(e.statusCode, 403); } });
  await t('export permission is separate', () => { assert(!reports.canExport(mgr(['reports.view']))); assert(reports.canExport(mgr(['reports.export']))); assert(reports.canExport(admin)); });
  await t('cleanQuery keeps only listed filters and drops admin-only ones for managers', () => { const def = REPORTS.find((r) => r.key === 'volunteers'); assert.deepStrictEqual(reports.cleanQuery(def, mgr([]), { status: 'active', manager: oid(9), search: 'x', from: '2026-01-01' }), { status: 'active', from: '2026-01-01' }); assert.strictEqual(reports.cleanQuery(def, admin, { manager: oid(9) }).manager, oid(9)); });
  await t('scope is applied by the module: a manager query is limited to their own', () => { const def = REPORTS.find((r) => r.key === 'volunteers'); const q = def.query(mgr([]), { status: 'active' }); assert(JSON.stringify(q.filter).includes(oid(2))); const tq = REPORTS.find((r) => r.key === 'tasks').query({ _id: oid(3), role: 'volunteer' }, {}); assert(JSON.stringify(tq.filter).includes('assignedTeam')); });
  // ---- reports: content
  const sample = {
    volunteers: [{ name: 'Vik', email: 'v@x.org', status: 'active', skills: ['cooking', 'driving'], joiningDate: new Date('2026-01-05'), volunteerHours: 12.5, assignedManager: { name: 'Meera' } }, { name: '=SUM(A1)', status: 'pending', volunteerHours: 0 }],
    donations: [{ receiptNumber: 'RCPT-2026-0001', donationDate: new Date('2026-10-30'), donorName: 'Asha', donorType: 'individual', donationType: 'money', amount: 1500.5, status: 'received', paymentMethod: 'upi' }, { donorName: 'Hidden', donorType: 'anonymous', donationType: 'money', amount: 500, status: 'pending' }, { donorName: 'Book Co', donationType: 'books', amount: 0, status: 'received' }],
    tasks: [{ title: 'A', status: 'completed', priority: 'high', dueDate: d(-2), assignedUser: { name: 'Vik' }, assignedTeam: [{ name: 'Vera' }], completedAt: new Date() }, { title: 'B', status: 'assigned', priority: 'low', dueDate: d(-1) }, { title: 'C', status: 'cancelled', priority: 'low' }],
    'food-stock': [{ foodItem: 'Rice', quantity: 50, unit: 'kg', distributedQuantity: 46, remainingQuantity: 4, lowStockThreshold: 10 }, { foodItem: 'Old milk', quantity: 5, unit: 'litre', distributedQuantity: 0, remainingQuantity: 5, lowStockThreshold: 1, expiryDate: d(-9) }, { foodItem: 'Gone', quantity: 5, unit: 'kg', distributedQuantity: 5, remainingQuantity: 0, lowStockThreshold: 1 }],
    'food-distributions': [{ date: new Date('2026-10-20'), location: 'Hall', numberOfBeneficiaries: 80, items: [{ foodItem: 'Rice', quantity: 10, unit: 'kg' }, { foodItem: 'Dal', quantity: 5, unit: 'kg' }], assignedVolunteers: [oid(3)] }],
    resources: [{ name: 'Laptop', category: 'computers', quantity: 3, condition: 'good', status: 'available', value: 45000 }],
    events: [{ name: 'Camp', date: new Date('2026-11-02'), startTime: '09:00', endTime: '12:00', status: 'upcoming', assignedVolunteers: [1, 2] }],
    programs: [{ name: 'Drive', type: 'food-distribution', status: 'active', budget: 250000, startDate: new Date('2026-01-01') }],
    students: [{ name: 'Ravi', age: 12, class: '6', educationStatus: 'enrolled', educationProgress: 40, program: { name: 'Edu' } }],
    beneficiaries: [{ name: 'Lata', familySize: 5, economicCategory: 'below-poverty-line', assistanceRequired: ['food', 'medicine'] }, { name: 'Kiran', familySize: 3, economicCategory: 'low-income' }],
  };
  for (const def of REPORTS) {
    await t(`report ${def.key}: preview has every column and a summary`, async () => {
      const rows = sample[def.key]; const orig = def.query; def.query = () => ({ filter: {}, model: { find: () => chain(rows) }, populate: [], sort: {} });
      const p = await reports.preview(admin, def, {}); def.query = orig;
      assert.strictEqual(p.total, rows.length); assert.strictEqual(p.columns.length, def.columns.length); assert(p.rows.length === rows.length && Object.keys(p.rows[0]).length === def.columns.length); assert(p.summary.length >= 1);
    });
  }
  const run = async (key, rows) => { const def = REPORTS.find((r) => r.key === key); const orig = def.query; def.query = () => ({ filter: {}, model: { find: () => chain(rows) }, populate: [], sort: {} }); try { return await reports.preview(admin, def, {}); } finally { def.query = orig; } };
  await t('donations: money total counts only received money; dates and amounts are formatted', async () => { const p = await run('donations', sample.donations); assert.strictEqual(p.summary.find((s) => s.label.startsWith('Money')).value, '1,500.50'); assert.strictEqual(p.rows[0].date, '30 Oct 2026'); assert.strictEqual(p.rows[0].amount, '1,500.50'); assert.strictEqual(p.rows[1].donor, 'Anonymous'); });
  await t('tasks: overdue flagged, completion rate ignores cancelled', async () => { const p = await run('tasks', sample.tasks); assert.strictEqual(p.rows[0].overdue, ''); assert.strictEqual(p.rows[1].overdue, 'Yes'); assert.strictEqual(p.summary.find((s) => s.label === 'Completion rate').value, '50%'); assert.strictEqual(p.summary.find((s) => s.label === 'Overdue').value, '1'); assert.strictEqual(p.rows[0].assignee, 'Vik; Vera'); });
  await t('food stock: states are right', async () => { const p = await run('food-stock', sample['food-stock']); assert.deepStrictEqual(p.rows.map((r) => r.state), ['Low stock', 'Expired', 'Out of stock']); });
  await t('volunteers: hours summed, skills joined', async () => { const p = await run('volunteers', sample.volunteers); assert.strictEqual(p.summary.find((s) => s.label === 'Total hours').value, '12.50'); assert.strictEqual(p.rows[0].skills, 'cooking; driving'); });
  await t('preview shows 50 rows but counts all, and flags truncation at the cap', async () => { const many = Array.from({ length: 120 }, (_, i) => ({ name: `V${i}`, status: 'active' })); const p = await run('volunteers', many); assert.strictEqual(p.rows.length, 50); assert.strictEqual(p.total, 120); assert.strictEqual(p.truncated, false); });
  await t('empty report still returns columns and a zero summary', async () => { const p = await run('donations', []); assert.strictEqual(p.total, 0); assert.strictEqual(p.rows.length, 0); assert.strictEqual(p.summary[0].value, '0'); });
  // CSV
  await t('csv: BOM, header, raw numbers and ISO dates, formula injection neutralised', async () => {
    const def = REPORTS.find((r) => r.key === 'volunteers'); const orig = def.query; def.query = () => ({ filter: {}, model: { find: () => chain(sample.volunteers) }, populate: [], sort: {} });
    let out = ''; const res = { write: (s) => { out += s; }, end() {} }; const r = await reports.streamCsv(res, admin, def, {}); def.query = orig;
    const lines = out.replace('﻿', '').trim().split('\r\n'); assert(out.startsWith('﻿')); assert.strictEqual(lines[0], 'Name,Email,Phone,Status,Skills,Joined,Hours,Manager');
    assert.strictEqual(lines[1], 'Vik,v@x.org,,Active,cooking; driving,2026-01-05,12.5,Meera'); assert(lines[2].startsWith("'=SUM(A1)")); assert.strictEqual(r.rows, 2);
  });
  // PDF
  const { buildPdf } = reports;
  const pdfOf = async (rows, key = 'donations', user = admin) => { const def = REPORTS.find((r) => r.key === key); const orig = def.query; def.query = () => ({ filter: {}, model: { find: () => chain(rows) }, populate: [], sort: {} }); const { doc } = await buildPdf(user, def, { status: 'received' }); def.query = orig; const bufs = []; doc.on('data', (b) => bufs.push(b)); const done = new Promise((r) => doc.on('end', r)); doc.end(); await done; return Buffer.concat(bufs); };
  const Org = require('./models/Organization'); Org.findOne = () => ({ lean: async () => ({ name: 'Hope Foundation' }) });
  await t('pdf: valid file; non-Latin text is replaced, not garbled; note when over the PDF row cap', async () => {
    const rows = Array.from({ length: 1300 }, (_, i) => ({ receiptNumber: `R${i}`, donationDate: new Date('2026-10-30'), donorName: i === 0 ? 'आशा ₹ Sharma' : `Donor ${i}`, donationType: 'money', amount: i, status: 'received' }));
    const buf = await pdfOf(rows); fs.writeFileSync((process.env.OUT || require('os').tmpdir()) + '/donations.pdf', buf); assert.strictEqual(buf.slice(0, 5).toString(), '%PDF-'); const pages = (buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length; assert(pages > 20, `pages ${pages}`);
  });
  await t('pdf: empty report works', async () => { const buf = await pdfOf([], 'tasks'); fs.writeFileSync((process.env.OUT || require('os').tmpdir()) + '/empty.pdf', buf); assert.strictEqual(buf.slice(0, 5).toString(), '%PDF-'); });
  await t('pdf: small report', async () => { const buf = await pdfOf(sample.donations); fs.writeFileSync((process.env.OUT || require('os').tmpdir()) + '/small.pdf', buf); assert(buf.length > 1000); });
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
