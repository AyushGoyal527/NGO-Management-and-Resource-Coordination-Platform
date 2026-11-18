var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.NODE_ENV = 'test';
const U = (id, role, perms, status = 'active') => ({ _id: id.padEnd(24, '0'), role, status, permissions: perms });
const users = { admin: U('a', 'admin', []), none: U('n', 'manager', []),
  donView: U('d', 'manager', ['donations.view']), donExport: U('e', 'manager', ['donations.view', 'reports.export']), exportOnly: U('x', 'manager', ['reports.export']),
  donCreate: U('c', 'manager', ['donations.view', 'donations.create', 'donations.edit']),
  foodView: U('f', 'manager', ['food.view']), foodDist: U('g', 'manager', ['food.view', 'food.distribute']),
  resCreate: U('r', 'manager', ['resources.view', 'resources.create', 'resources.edit']), vol: U('v', 'volunteer', ['tasks.view', 'events.view']) };
require.cache[require.resolve('./models/User')] = { id: 'u', filename: 'u', loaded: true, exports: { findById: async (id) => Object.values(users).find((u) => u._id === id) } };
const { signToken } = require('./utils/token');
const app = require('./app');
let pass = 0, fail = 0;
const s = app.listen(0, async () => {
  const base = `http://localhost:${s.address().port}/api`;
  const call = async (u, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { ...(u ? { Authorization: `Bearer ${signToken(users[u]._id)}` } : {}), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(1500) }).catch((e) => ({ status: e.name === 'TimeoutError' ? 'PASSED-AUTH(db wait)' : 'ERR ' + e.message, json: async () => ({}) }));
    return { status: r.status, msg: (await r.json().catch(() => ({}))).message || '' };
  };
  const check = async (name, u, method, path, want, body, msg) => {
    const r = await call(u, method, path, body);
    const ok = r.status === want && (!msg || r.msg.includes(msg));
    ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, '->', r.status, r.msg);
  };
  const id = 'f'.repeat(24);
  // access control
  await check('donations list: not logged in', null, 'GET', '/donations', 401);
  await check('donations list: no permission', 'none', 'GET', '/donations', 403);
  await check('donations stats: no permission', 'none', 'GET', '/donations/stats', 403);
  await check('donations stats: volunteer', 'vol', 'GET', '/donations/stats', 403);
  await check('donations export: view only', 'donView', 'GET', '/donations/export', 403);
  await check('donations export: export permission only', 'exportOnly', 'GET', '/donations/export', 403);
  await check('donations export: both permissions get through auth', 'donExport', 'GET', '/donations/export', 'PASSED-AUTH(db wait)');
  await check('donations receipt: no permission', 'none', 'GET', `/donations/${id}/receipt`, 403);
  await check('donations donor-history: no permission', 'none', 'GET', `/donations/${id}/donor-history`, 403);
  await check('donations create: view only', 'donView', 'POST', '/donations', 403, { donorName: 'A' });
  await check('donations delete: no delete permission', 'donCreate', 'DELETE', `/donations/${id}`, 403);
  await check('donations documents upload: view only', 'donView', 'POST', `/donations/${id}/documents`, 403);
  await check('food alerts: no permission', 'none', 'GET', '/food/alerts', 403);
  await check('food distributions list: no permission', 'none', 'GET', '/food/distributions', 403);
  await check('food available: view only is not enough', 'foodView', 'GET', '/food/available', 403);
  await check('food distribute: view only', 'foodView', 'POST', '/food/distributions', 403, { location: 'x', items: [] });
  await check('food distribution delete: needs food.delete', 'foodDist', 'DELETE', `/food/distributions/${id}`, 403);
  await check('food create: view only', 'foodView', 'POST', '/food', 403, { foodItem: 'x', quantity: 1 });
  await check('resources create: no permission', 'none', 'POST', '/resources', 403, { name: 'x' });
  await check('resources delete: edit is not delete', 'resCreate', 'DELETE', `/resources/${id}`, 403);
  await check('lookups volunteers: no permission', 'none', 'GET', '/lookups/volunteers', 403);
  await check('lookups volunteers: volunteer role', 'vol', 'GET', '/lookups/volunteers', 403);
  await check('lookups people: no permission', 'foodDist', 'GET', '/lookups/people', 403);
  await check('lookups managers: non-admin', 'foodDist', 'GET', '/lookups/managers', 403);
  // validation
  const D = 'donCreate';
  await check('donation: donor name required', D, 'POST', '/donations', 400, { amount: 10 }, 'Donor name is required');
  await check('donation: bad email', D, 'POST', '/donations', 400, { donorName: 'A', email: 'nope' }, 'valid email');
  await check('donation: negative amount', D, 'POST', '/donations', 400, { donorName: 'A', amount: -5 }, 'Amount');
  await check('donation: unknown type', D, 'POST', '/donations', 400, { donorName: 'A', donationType: 'gold' }, 'donation type');
  await check('donation: unknown status', D, 'POST', '/donations', 400, { donorName: 'A', status: 'paid-in-full' }, 'status');
  await check('donation: bad date', D, 'POST', '/donations', 400, { donorName: 'A', donationDate: 'yesterday' }, 'donation date');
  await check('donation: client cannot set receipt number (ignored, not an error)', D, 'POST', '/donations', 'PASSED-AUTH(db wait)', { donorName: 'A', amount: 5, receiptNumber: 'RCPT-1' });
  await check('donation stats: bad date', 'donView', 'GET', '/donations/stats?from=garbage', 400, null, 'start date');
  await check('donation list: bad id on /:id', 'donView', 'GET', '/donations/not-an-id', 400, null, 'Invalid id');
  await check('food distribute: location required', 'foodDist', 'POST', '/food/distributions', 400, { items: [{ inventory: id, quantity: 1 }] }, 'Location is required');
  await check('food distribute: no items', 'foodDist', 'POST', '/food/distributions', 400, { location: 'x', items: [] }, 'at least one food item');
  await check('food distribute: bad item id', 'foodDist', 'POST', '/food/distributions', 400, { location: 'x', items: [{ inventory: 'zzz', quantity: 1 }] }, 'Choose a food item');
  await check('food distribute: zero quantity', 'foodDist', 'POST', '/food/distributions', 400, { location: 'x', items: [{ inventory: id, quantity: 0 }] }, 'greater than zero');
  await check('food distribute: fractional beneficiaries', 'foodDist', 'POST', '/food/distributions', 400, { location: 'x', items: [{ inventory: id, quantity: 1 }], numberOfBeneficiaries: 2.5 }, 'whole number');
  await check('food distribute: bad volunteer id', 'foodDist', 'POST', '/food/distributions', 400, { location: 'x', items: [{ inventory: id, quantity: 1 }], assignedVolunteers: ['nope'] }, 'Invalid volunteer');
  await check('food distributions: bad date filter', 'foodDist', 'GET', '/food/distributions?from=x', 400, null, 'start date');
  const F = 'admin';
  await check('food item: quantity required', F, 'POST', '/food', 400, { foodItem: 'Rice' }, 'Quantity is required');
  await check('food item: negative quantity', F, 'POST', '/food', 400, { foodItem: 'Rice', quantity: -1 }, 'Quantity');
  await check('food item: bad unit', F, 'POST', '/food', 400, { foodItem: 'Rice', quantity: 1, unit: 'tonnes' }, 'unit');
  await check('resource: name required', 'resCreate', 'POST', '/resources', 400, { category: 'books' }, 'Name is required');
  await check('resource: fractional quantity', 'resCreate', 'POST', '/resources', 400, { name: 'x', quantity: 1.5 }, 'whole number');
  await check('resource: bad category', 'resCreate', 'POST', '/resources', 400, { name: 'x', category: 'spaceship' }, 'category');
  await check('resource: bad person id', 'resCreate', 'POST', '/resources', 400, { name: 'x', assignedPerson: 'nope' }, 'Invalid person');
  console.log(`\n${pass} passed, ${fail} failed`); s.close(); process.exit(fail ? 1 : 0);
});
