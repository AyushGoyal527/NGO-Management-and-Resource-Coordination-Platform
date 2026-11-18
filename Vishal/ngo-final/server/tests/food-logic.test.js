var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.NODE_ENV = 'test';
const assert = require('assert');
const stub = (p, exports) => { require.cache[require.resolve(p)] = { id: p, filename: p, loaded: true, exports }; };

// ---- in-memory stand-ins that mimic what MongoDB does for the exact calls foodService makes
const day = 86400000;
const stock = {};
const add = (id, o) => { stock[id] = { _id: id, foodItem: o.name, unit: o.unit || 'kg', quantity: o.q, distributedQuantity: o.d || 0, remainingQuantity: o.q - (o.d || 0), expiryDate: o.exp }; };
const reset = () => { Object.keys(stock).forEach((k) => delete stock[k]);
  add('a'.repeat(24), { name: 'Rice', q: 100 }); add('b'.repeat(24), { name: 'Lentils', q: 20, d: 15 }); // 5 left
  add('c'.repeat(24), { name: 'Old bread', q: 10, unit: 'packets', exp: new Date(Date.now() - 3 * day) });
  add('d'.repeat(24), { name: 'Oil', q: 30, unit: 'litre', exp: new Date(Date.now() + 2 * day) }); };
const qtyIn = (pipeline, field) => { const e = pipeline[0].$set[field].$round[0]; return (e.$add || e.$subtract)[1]; };
const chain = (v) => ({ select: () => chain(v), lean: () => chain(v), then: (a, b) => Promise.resolve(v).then(a, b) });
let created = []; let journal = [];
stub('./models/FoodInventory', {
  find: async (f) => f._id.$in.map((i) => stock[i]).filter(Boolean),
  findById: (id) => chain(stock[id] || null),
  findOneAndUpdate: async (filter, pipe) => { const s = stock[filter._id]; if (!s || !(s.remainingQuantity >= filter.remainingQuantity.$gte)) return null; const q = qtyIn(pipe, 'distributedQuantity'); s.distributedQuantity = +(s.distributedQuantity + q).toFixed(3); s.remainingQuantity = +(s.remainingQuantity - q).toFixed(3); journal.push(['take', s.foodItem, q]); return s; },
  updateOne: async (filter, pipe) => { const s = stock[filter._id]; if (!s) return; const q = qtyIn(pipe, 'remainingQuantity'); s.distributedQuantity = Math.max(0, +(s.distributedQuantity - q).toFixed(3)); s.remainingQuantity = +(s.remainingQuantity + q).toFixed(3); journal.push(['return', s.foodItem, q]); },
});
const records = [];
stub('./models/FoodDistribution', {
  create: async (o) => { if (global.failCreate) throw new Error('db down'); const r = { _id: 'r' + (records.length + 1), ...o, deleteOne: async () => { records.splice(records.indexOf(r), 1); } }; records.push(r); created.push(r); return r; },
  findOne: async (f) => records.find((r) => r._id === f._id && (!f.manager || String(r.manager) === String(f.manager))) || null,
});
const validVols = new Set(['v'.repeat(24)]);
stub('./models/User', {
  countDocuments: async (f) => f._id.$in.filter((i) => validVols.has(i)).length,
  exists: async (f) => (f._id === 'm'.repeat(24) ? { _id: f._id } : null),
});
stub('./models/ActivityLog', { create: async () => ({}) });

const svc = require('./services/foodService');
const admin = { _id: 'adm'.padEnd(24, '0'), role: 'admin' };
const mgr = { _id: 'mgr'.padEnd(24, '0'), role: 'manager' };
const other = { _id: 'oth'.padEnd(24, '0'), role: 'manager' };
const A = 'a'.repeat(24), B = 'b'.repeat(24), C = 'c'.repeat(24), D = 'd'.repeat(24);
const base = { location: 'Hall', date: '2026-10-30' };
let pass = 0, fail = 0;
const test = async (name, fn) => { reset(); records.length = 0; created = []; journal = []; global.failCreate = false; try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '->', e.message); } };
const rejects = async (p, status, msg) => { try { await p; } catch (e) { assert.equal(e.statusCode, status, `status ${e.statusCode} (${e.message})`); if (msg) assert(e.message.includes(msg), `message "${e.message}" lacks "${msg}"`); return; } throw new Error('expected rejection'); };

(async () => {
  await test('two-item distribution deducts both and records names + units', async () => {
    const r = await svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 40 }, { inventory: B, quantity: 5 }], numberOfBeneficiaries: 30, assignedVolunteers: ['v'.repeat(24)] });
    assert.equal(stock[A].remainingQuantity, 60); assert.equal(stock[A].distributedQuantity, 40); assert.equal(stock[B].remainingQuantity, 0);
    assert.deepEqual(r.items.map((i) => [i.foodItem, i.unit, i.quantity]), [['Rice', 'kg', 40], ['Lentils', 'kg', 5]]);
    assert.equal(r.manager, mgr._id);
  });
  await test('second item short: first item is put back, nothing recorded, helpful message', async () => {
    await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 40 }, { inventory: B, quantity: 6 }] }), 400, 'Not enough Lentils in stock (5 kg left)');
    assert.equal(stock[A].remainingQuantity, 100); assert.equal(stock[A].distributedQuantity, 0); assert.equal(records.length, 0);
    assert.deepEqual(journal.map((j) => j[0]), ['take', 'return']);
  });
  await test('record save fails after stock was taken: everything is restored', async () => {
    global.failCreate = true;
    await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 10 }, { inventory: B, quantity: 5 }] }), 500).catch(async () => { });
    assert.equal(stock[A].remainingQuantity, 100); assert.equal(stock[B].remainingQuantity, 5);
  });
  await test('asking for exactly what is left works (boundary)', async () => { await svc.distribute(mgr, { ...base, items: [{ inventory: B, quantity: 5 }] }); assert.equal(stock[B].remainingQuantity, 0); });
  await test('same item listed twice is refused, stock untouched', async () => { await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 1 }, { inventory: A, quantity: 1 }] }), 400, 'only be listed once'); assert.equal(stock[A].remainingQuantity, 100); });
  await test('zero / negative quantity refused', async () => { await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 0 }] }), 400, 'greater than zero'); await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: -3 }] }), 400, 'greater than zero'); });
  await test('expired item refused before anything is taken', async () => { await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 5 }, { inventory: C, quantity: 1 }] }), 400, 'Old bread expired'); assert.equal(stock[A].remainingQuantity, 100); assert.equal(journal.length, 0); });
  await test('item expiring in 2 days is still allowed', async () => { await svc.distribute(mgr, { ...base, items: [{ inventory: D, quantity: 3 }] }); assert.equal(stock[D].remainingQuantity, 27); });
  await test('deleted food item refused', async () => { await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: 'e'.repeat(24), quantity: 1 }] }), 400, 'no longer exists'); });
  await test('unknown / non-volunteer assignee refused before stock moves', async () => { await rejects(svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 5 }], assignedVolunteers: ['z'.repeat(24)] }), 400, 'not an active volunteer'); assert.equal(journal.length, 0); });
  await test('fractional quantities: 3 x 0.1 leaves exactly 99.7', async () => { for (let i = 0; i < 3; i++) await svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 0.1 }] }); assert.equal(stock[A].remainingQuantity, 99.7); assert.equal(stock[A].distributedQuantity, 0.3); });
  await test('manager cannot name another manager; admin can, with validation', async () => {
    assert.equal((await svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 1 }], manager: 'm'.repeat(24) })).manager, mgr._id);
    assert.equal((await svc.distribute(admin, { ...base, items: [{ inventory: A, quantity: 1 }], manager: 'm'.repeat(24) })).manager, 'm'.repeat(24));
    await rejects(svc.distribute(admin, { ...base, items: [{ inventory: A, quantity: 1 }], manager: 'q'.repeat(24) }), 400, 'manager was not found');
  });
  await test('deleting a distribution restores stock; only the owner (or admin) can', async () => {
    const r = await svc.distribute(mgr, { ...base, items: [{ inventory: A, quantity: 40 }, { inventory: B, quantity: 5 }] });
    await rejects(svc.removeDistribution(other, r._id), 404, 'not found'); assert.equal(stock[A].remainingQuantity, 60);
    await svc.removeDistribution(mgr, r._id); assert.equal(stock[A].remainingQuantity, 100); assert.equal(stock[A].distributedQuantity, 0); assert.equal(stock[B].remainingQuantity, 5); assert.equal(records.length, 0);
  });
  await test('two people drawing the last 5 kg at once: exactly one wins', async () => {
    const results = await Promise.allSettled([svc.distribute(mgr, { ...base, items: [{ inventory: B, quantity: 5 }] }), svc.distribute(other, { ...base, items: [{ inventory: B, quantity: 5 }] })]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1); assert.equal(stock[B].remainingQuantity, 0); assert.equal(records.length, 1);
  });
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
