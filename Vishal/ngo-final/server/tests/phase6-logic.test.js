var require = require('module').createRequire(process.cwd() + '/');
process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'x'.repeat(32);
const m = (n) => require(`./models/${n}`);
let pass = 0, fail = 0;
const t = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : extra); };
const chain = (rows) => { const c = { select: () => c, sort: () => c, skip: () => c, limit: () => c, lean: async () => rows, then: (r, j) => Promise.resolve(rows).then(r, j) }; return c; };
(async () => {
  const calls = {};
  const Org = m('Organization'), WC = m('WebsiteContent'), Prog = m('Program'), Ev = m('Event'), Vol = m('Volunteer'), Stu = m('Student'), Ben = m('Beneficiary'), FD = m('FoodDistribution'), Don = m('Donation'), Act = m('ActivityLog'), Notif = m('Notification'), User = m('User');
  Org.findOne = () => chain({ name: 'Org', email: 'a@b.c' });
  const rows = [
    { section: 'hero', content: { title: 'Hi', images: [] } }, { section: 'about', content: {} }, { section: 'mission', content: { text: 'm' } },
    { section: 'donate', content: { upiId: 'x@upi', accountNumber: '123', intro: 'Give' } },
    { section: 'stats', content: { items: [{ label: 'Vols', source: 'volunteers' }, { label: 'Meals', source: 'manual', value: 900 }, { label: 'Fake', source: 'hack' }] } },
    { section: 'evil', content: { x: 1 } }, { section: 'testimonials', content: { items: [] } },
  ];
  WC.find = () => chain(rows); WC.findOne = () => chain({ content: rows[3].content });
  Vol.countDocuments = async (f) => { calls.vol = f; return 42; };
  const svc = require('./services/publicService');
  const s = await svc.site();
  t('site: hero kept', s.sections.hero?.title === 'Hi');
  t('site: empty about hidden', !('about' in s.sections));
  t('site: empty testimonials hidden', !('testimonials' in s.sections));
  t('site: unknown section dropped', !('evil' in s.sections));
  t('site: donate details NOT in site payload', !('donate' in s.sections) && !JSON.stringify(s).includes('x@upi') && !JSON.stringify(s).includes('123'));
  t('site: stats counted from records, only active volunteers', s.sections.stats.items[0].value === 42 && calls.vol.status === 'active');
  t('site: manual stat used as typed', s.sections.stats.items[1].value === 900);
  t('site: unknown stat source shows 0, not a crash', s.sections.stats.items[2].value === 0);
  // programs / events filters
  let pf, ef;
  Prog.find = (f) => { pf = f; return chain([]); }; Ev.find = (f) => { ef = f; return chain([]); }; Ev.countDocuments = async () => 0;
  await svc.programs(); t('programs: hidden ones excluded, paused excluded', pf.showOnWebsite.$ne === false && !pf.status.$in.includes('paused'));
  await svc.events({}); t('events: public + not cancelled + upcoming', ef.isPublic === true && ef.status.$ne === 'cancelled' && ef.date.$gte);
  await svc.events({ when: 'past', limit: '9999', page: '-3' }); t('events: past uses $lt', !!ef.date.$lt);
  const ev = await svc.events({ limit: '9999', page: 'abc' }); t('events: bad page/limit tolerated', ev.page === 1);
  // sensitive fields are not selected
  const selects = []; const spy = (Model, fn) => { const o = Model[fn]; Model[fn] = (...a) => { const c = o.apply(Model, a); const sel = c.select; c.select = (s) => { selects.push(s); return sel.call(c, s); }; return c; }; };
  // volunteer application
  let created = null, logs = [], notes = [];
  Vol.exists = async (f) => (f.email === 'dup@x.com' ? { _id: 1 } : null);
  Vol.create = async (d) => { created = d; return { _id: 'abc', ...d }; };
  Act.create = async (d) => { logs.push(d); };
  User.find = () => chain([{ _id: 'u1', role: 'admin' }]); Notif.insertMany = async (r) => { notes.push(...r); return r; };
  await svc.applyAsVolunteer({ name: 'Asha', email: 'ASHA@x.com', skills: ['a'], message: 'hello', status: 'active', source: 'internal' });
  t('apply: created pending/website', created.status === 'pending' && created.source === 'website');
  t('apply: email lowercased, message in notes', created.email === 'asha@x.com' && created.notes.includes('hello'));
  t('apply: admin notified + activity logged', notes.length === 1 && notes[0].type === 'volunteer-application' && logs.length === 1 && logs[0].module === 'volunteers');
  created = null; notes = [];
  const dup = await svc.applyAsVolunteer({ name: 'D', email: 'dup@x.com' });
  t('apply: duplicate email answers the same, stores nothing', dup.ok === true && created === null && notes.length === 0);
  const bot = await svc.applyAsVolunteer({ name: 'Bot', email: 'b@x.com', website: 'http://spam' });
  t('apply: honeypot stores nothing', bot.ok === true && created === null);
  // donation inquiry
  let don = null; Don.create = async (d) => { don = d; return { _id: 'a1b2c3d4e5f6a1b2c3d4e5f6', ...d }; };
  const r1 = await svc.donationInquiry({ name: 'Ravi', email: 'r@x.com', donationType: 'money', amount: 500, status: 'received', receiptNumber: 'R1' });
  t('inquiry: stored as inquiry with no receipt', don.status === 'inquiry' && !don.receiptNumber && don.amount === 500);
  t('inquiry: reference is last 8 chars uppercased', r1.reference === 'C3D4E5F6' || r1.reference === 'E5F6A1B2C3D4E5F6'.slice(-8));
  t('inquiry: payment details come from the donate section', r1.payment.details.some((x) => x.value === 'x@upi') && r1.payment.online === false);
  const r2 = await svc.donationInquiry({ name: 'Ravi', phone: '9876543210', donationType: 'food', amount: 700 });
  t('inquiry: in-kind has no amount and no bank details', don.amount === 0 && r2.payment === null);
  const r3 = await svc.donationInquiry({ name: 'Secret Name', email: 'a@b.c', donationType: 'money', amount: 10, anonymous: true });
  t('inquiry: anonymous hides name but keeps contact in notes', don.donorName === 'Anonymous' && don.donorType === 'anonymous' && don.notes.includes('Secret Name'));
  let err; try { await svc.donationInquiry({ name: 'x', donationType: 'food' }); } catch (e) { err = e; } t('inquiry: needs contact', err?.statusCode === 400);
  err = null; try { await svc.donationInquiry({ name: 'x', email: 'a@b.c', donationType: 'money' }); } catch (e) { err = e; } t('inquiry: money needs amount', err?.statusCode === 400);
  // payments
  const pay = require('./services/payments');
  process.env.PAYMENT_PROVIDER = 'razorpay'; const warn = console.warn; let warned = false; console.warn = () => { warned = true; };
  t('payments: unimplemented provider falls back to manual with a warning', pay.get().name === 'manual' && warned); console.warn = warn;
  process.env.PAYMENT_PROVIDER = 'nonsense'; console.warn = () => {}; t('payments: unknown provider falls back', pay.get().name === 'manual'); console.warn = warn;
  delete process.env.PAYMENT_PROVIDER; t('payments: default manual', pay.get().name === 'manual');
  let e501; try { await require('./services/payments/stripe').createOrder(); } catch (e) { e501 = e; } t('payments: stripe stub refuses honestly (501)', e501?.statusCode === 501);
  // website service: save + prune
  const fs = require('fs'), os = require('os'), path = require('path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-')); process.env.UPLOAD_DIR = tmp; process.chdir('/'); fs.mkdirSync(path.join(tmp, 'site'));
  const old = Date.now() / 1000 - 7200; const mk = (n, age) => { const p = path.join(tmp, 'site', n); fs.writeFileSync(p, 'x'); if (age) fs.utimesSync(p, age, age); };
  const used = 'a'.repeat(32) + '.jpg', orphan = 'b'.repeat(32) + '.png', fresh = 'c'.repeat(32) + '.webp';
  mk(used, old); mk(orphan, old); mk(fresh);
  Org.findOne = () => chain(null); WC.find = () => chain([{ section: 'about', content: { image: `/uploads/site/${used}` } }]);
  const ws = require('./services/websiteService'); const removed = await ws.pruneImages();
  t('prune: unreferenced old image removed', !fs.existsSync(path.join(tmp, 'site', orphan)) && removed === 1);
  t('prune: referenced image kept', fs.existsSync(path.join(tmp, 'site', used)));
  t('prune: just-uploaded image kept', fs.existsSync(path.join(tmp, 'site', fresh)));
  let saved; WC.findOne = () => chain({ content: { title: 'old' } }); WC.findOneAndUpdate = async (f, u) => { saved = { f, u }; return u; };
  const out = await ws.saveSection('hero', { title: '  New  ', junk: 'x', description: 'd' }, 'u1');
  t('save: trimmed, unknown keys dropped, user recorded', out.title === 'New' && !('junk' in out) && saved.u.updatedBy === 'u1' && saved.f.section === 'hero');
  t('save: activity logged under website', logs.at(-1).module === 'website' && logs.at(-1).previousValue.title === 'old');
  fs.rmSync(tmp, { recursive: true, force: true });
  // limiter
  const { makeLimiter } = require('./utils/limiters'); const express = require('express');
  process.env.FORCE_RATE_LIMITS = '1';
  const a = express(); a.post('/f', makeLimiter({ windowMs: 60000, max: 2, message: 'Too many' }), (q, r) => r.json({ ok: 1 }));
  const srv = a.listen(0); const u = `http://localhost:${srv.address().port}/f`; const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await fetch(u, { method: 'POST' })).status);
  t('limiter: 3rd and 4th request blocked with 429', codes.join() === '200,200,429,429', codes.join());
  const body = await (await fetch(u, { method: 'POST' })).json(); t('limiter: friendly JSON message', body.success === false && body.message === 'Too many');
  delete process.env.FORCE_RATE_LIMITS; srv.close();
  const b = express(); b.post('/f', makeLimiter({ windowMs: 60000, max: 1, message: 'x' }), (q, r) => r.json({})); const s2 = b.listen(0);
  const c2 = []; for (let i = 0; i < 3; i++) c2.push((await fetch(`http://localhost:${s2.address().port}/f`, { method: 'POST' })).status);
  t('limiter: off in test mode by default', c2.every((c) => c === 200)); s2.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
