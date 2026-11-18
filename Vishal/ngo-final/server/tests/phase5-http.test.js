var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.NODE_ENV = 'test';
const U = (id, role, perms) => ({ _id: Buffer.from(id).toString('hex').padEnd(24, '0'), role, status: 'active', permissions: perms, name: id });
const users = { admin: U('a', 'admin', []), none: U('n', 'manager', []), vol: U('v', 'volunteer', ['tasks.view']),
  rView: U('r', 'manager', ['reports.view', 'tasks.view']), rNoSrc: U('s', 'manager', ['reports.view']), rExport: U('e', 'manager', ['reports.view', 'reports.export', 'tasks.view']), exportOnly: U('x', 'manager', ['reports.export', 'tasks.view']) };
require.cache[require.resolve('./models/User')] = { id: 'u', filename: 'u', loaded: true, exports: { findById: async (id) => Object.values(users).find((u) => u._id === id) } };
const { signToken } = require('./utils/token');
const app = require('./app');
let pass = 0, fail = 0;
const s = app.listen(0, async () => {
  const base = `http://localhost:${s.address().port}/api`;
  const call = async (u, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { ...(u ? { Authorization: `Bearer ${signToken(users[u]._id)}` } : {}), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(1500) }).catch((e) => ({ status: e.name === 'TimeoutError' ? 'PASSED' : 'ERR ' + e.message, json: async () => ({}) }));
    return { status: r.status, msg: (await r.json().catch(() => ({}))).message || '' };
  };
  const check = async (name, u, method, path, want, body, msg) => { const r = await call(u, method, path, body); const ok = r.status === want && (!msg || r.msg.includes(msg)); ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, '->', r.status, r.msg); };
  const id = 'f'.repeat(24);
  // notifications
  for (const [m, p] of [['GET', '/notifications'], ['GET', '/notifications/unread-count'], ['PATCH', '/notifications/read-all'], ['DELETE', '/notifications/read'], ['PATCH', `/notifications/${id}/read`], ['DELETE', `/notifications/${id}`]]) await check(`notifications ${m} ${p}: not logged in`, null, m, p, 401);
  await check('notifications: any logged-in role reaches the data layer', 'vol', 'GET', '/notifications', 'PASSED');
  await check('notifications unread-count: reaches data layer', 'none', 'GET', '/notifications/unread-count', 'PASSED');
  await check('notifications: bad id', 'vol', 'PATCH', '/notifications/zzz/read', 400, null, 'Invalid id');
  await check('notifications: bad id delete', 'vol', 'DELETE', '/notifications/zzz', 400, null, 'Invalid id');
  await check('notifications: bad type filter', 'vol', 'GET', '/notifications?type=spam', 400, null, 'Invalid type');
  await check('notifications: bad limit', 'vol', 'GET', '/notifications?limit=500', 400, null, 'Invalid limit');
  await check('notifications: bad unread flag', 'vol', 'GET', '/notifications?unread=maybe', 400, null, 'Invalid filter');
  await check('run-checks: manager refused', 'rExport', 'POST', '/notifications/run-checks', 403);
  await check('run-checks: volunteer refused', 'vol', 'POST', '/notifications/run-checks', 403);
  // activity log
  await check('activity: not logged in', null, 'GET', '/activity-logs', 401);
  for (const u of ['none', 'vol', 'rExport']) { await check(`activity list: ${u} refused`, u, 'GET', '/activity-logs', 403); await check(`activity export: ${u} refused`, u, 'GET', '/activity-logs/export', 403); await check(`activity filters: ${u} refused`, u, 'GET', '/activity-logs/filters', 403); }
  await check('activity: admin reaches data layer', 'admin', 'GET', '/activity-logs?module=tasks&limit=20', 'PASSED');
  await check('activity: bad user id', 'admin', 'GET', '/activity-logs?user=zzz', 400, null, 'Invalid person');
  await check('activity: bad date', 'admin', 'GET', '/activity-logs?from=yesterday', 400, null, 'start date');
  await check('activity: reversed range', 'admin', 'GET', '/activity-logs?from=2026-02-01&to=2026-01-01', 400, null, 'after the end');
  await check('activity: bad limit', 'admin', 'GET', '/activity-logs?limit=5000', 400, null, 'Invalid limit');
  await check('activity export: bad date', 'admin', 'GET', '/activity-logs/export?to=nope', 400, null, 'end date');
  // reports
  await check('reports catalogue: not logged in', null, 'GET', '/reports', 401);
  await check('reports catalogue: no reports.view', 'none', 'GET', '/reports', 403);
  await check('reports catalogue: volunteer', 'vol', 'GET', '/reports', 403);
  await check('reports catalogue: view is enough', 'rView', 'GET', '/reports', 200);
  await check('report run: no reports.view', 'none', 'GET', '/reports/tasks', 403);
  await check('report run: reports.view but no tasks.view', 'rNoSrc', 'GET', '/reports/tasks', 403);
  await check('report run: unknown report', 'admin', 'GET', '/reports/nope', 404, null, 'Report not found');
  await check('report run: bad key', 'admin', 'GET', '/reports/NOPE_1', 400, null, 'Invalid report');
  await check('report run: allowed reaches data layer', 'rView', 'GET', '/reports/tasks?status=assigned', 'PASSED');
  await check('report run: bad date', 'admin', 'GET', '/reports/tasks?from=x', 400, null, 'start date');
  await check('report run: reversed range', 'admin', 'GET', '/reports/tasks?from=2026-03-01&to=2026-02-01', 400, null, 'after the end');
  await check('report run: filter too long', 'admin', 'GET', `/reports/tasks?status=${'x'.repeat(61)}`, 400, null, 'Invalid filter');
  await check('export csv: view only', 'rView', 'GET', '/reports/tasks/export?format=csv', 403);
  await check('export pdf: view only', 'rView', 'GET', '/reports/tasks/export?format=pdf', 403);
  await check('export: export permission without reports.view', 'exportOnly', 'GET', '/reports/tasks/export?format=csv', 403);
  await check('export: no source permission', 'rExport', 'GET', '/reports/donations/export?format=csv', 403);
  await check('export: volunteer', 'vol', 'GET', '/reports/tasks/export?format=csv', 403);
  await check('export: bad format', 'rExport', 'GET', '/reports/tasks/export?format=xlsx', 400, null, 'CSV or PDF');
  await check('export: missing format', 'rExport', 'GET', '/reports/tasks/export', 400, null, 'CSV or PDF');
  await check('export: unknown report', 'admin', 'GET', '/reports/nope/export?format=csv', 404);
  await check('export csv: allowed reaches data layer', 'rExport', 'GET', '/reports/tasks/export?format=csv', 'PASSED');
  await check('export pdf: allowed reaches data layer', 'rExport', 'GET', '/reports/tasks/export?format=pdf&status=completed', 'PASSED');
  // the catalogue content for a manager
  const r = await fetch(`${base}/reports`, { headers: { Authorization: `Bearer ${signToken(users.rExport._id)}` } }).then((x) => x.json());
  const okCat = r.data.items.length === 1 && r.data.items[0].key === 'tasks' && r.data.canExport === true; okCat ? pass++ : fail++; console.log(okCat ? 'PASS' : 'FAIL', 'catalogue lists only reports the manager may run, with canExport', JSON.stringify(r.data.items.map((i) => i.key)));
  const r2 = await fetch(`${base}/reports`, { headers: { Authorization: `Bearer ${signToken(users.rView._id)}` } }).then((x) => x.json());
  const ok2 = r2.data.canExport === false; ok2 ? pass++ : fail++; console.log(ok2 ? 'PASS' : 'FAIL', 'canExport false without reports.export');
  console.log(`\n${pass} passed, ${fail} failed`); s.close(); process.exit(fail ? 1 : 0);
});
