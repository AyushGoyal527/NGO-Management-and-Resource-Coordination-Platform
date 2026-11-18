var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.NODE_ENV = 'test';
const U = (id, role) => ({ _id: Buffer.from(id).toString('hex').padEnd(24, '0'), role, status: 'active', permissions: [], dashboardModules: [], name: id });
const users = { none: U('n', 'manager'), vol: U('v', 'volunteer') };
require.cache[require.resolve('./models/User')] = { id: 'u', filename: 'u', loaded: true, exports: { findById: async (id) => Object.values(users).find((u) => u._id === id) } };
const { signToken } = require('./utils/token');
const app = require('./app');
const routes = [];
const mountOf = (l) => l.regexp.source.replace(/^\^/, '').replace(/\\\/\?\(\?=\\\/\|\$\)$/, '').replace(/\\\//g, '/').replace('(?:/(?=$))?', '');
(function walk(stack, base) {
  for (const l of stack) {
    if (l.route) Object.keys(l.route.methods).forEach((m) => routes.push([m.toUpperCase(), base + (l.route.path === '/' ? '' : l.route.path)]));
    else if (l.name === 'router' && l.handle.stack) walk(l.handle.stack, base + mountOf(l));
  }
})(app._router.stack, '');
const PUBLIC = [/^GET \/api\/health$/, /^POST \/api\/auth\/(register|login|forgot-password|reset-password\/:token)$/, /^GET \/api\/public\/(site|programs|events)$/, /^POST \/api\/public\/(volunteer-applications|donation-inquiries)$/];
const s = app.listen(0, async () => {
  const base = `http://localhost:${s.address().port}`;
  for (const who of ['none', 'vol']) {
    const open = [];
    for (const [m, p] of routes) {
      if (/^(GET \/api\/health|POST \/api\/auth\/(register|login|forgot|reset)|\/api\/public)/.test(`${m} ${p}`) || p.startsWith('/api/public')) continue;
      const url = base + p.replace(/:token/g, 'tok').replace(/:\w+/g, 'f'.repeat(24));
      const r = await fetch(url, { method: m, headers: { 'content-type': 'application/json', Authorization: `Bearer ${signToken(users[who]._id)}` }, body: ['POST', 'PUT', 'PATCH'].includes(m) ? '{}' : undefined, signal: AbortSignal.timeout(1000) }).catch((e) => ({ status: e.name === 'TimeoutError' ? 'REACHED-DATA' : 'ERR' }));
      if (r.status !== 403) open.push(`${m} ${p} -> ${r.status}`);
    }
    const self = ['POST /api/auth/logout', 'GET /api/auth/me', `GET /api/dashboard/${users[who].role}`, 'GET /api/documents/:id/download',
      'GET /api/notifications', 'GET /api/notifications/unread-count', 'PATCH /api/notifications/read-all', 'DELETE /api/notifications/read', 'PATCH /api/notifications/:id/read', 'DELETE /api/notifications/:id'];
    const unexpected = open.filter((x) => !self.includes(x.split(' -> ')[0]));
    console.log(`${who} (role ${users[who].role}, zero permissions): ${routes.length - open.length} routes refused with 403, ${open.length - unexpected.length} self-service routes open, ${unexpected.length} unexpected`);
    unexpected.forEach((x) => console.log('  UNEXPECTED:', x));
    if (unexpected.length) process.exitCode = 1;
  }
  process.exit(process.exitCode || 0);
});
