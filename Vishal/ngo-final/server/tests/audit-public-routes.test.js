var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.NODE_ENV = 'test';
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
  let bad = 0, pub = 0, prot = 0;
  for (const [m, p] of routes) {
    const key = `${m} ${p}`; const isPub = PUBLIC.some((r) => r.test(key));
    const url = base + p.replace(/:token/g, 'tok').replace(/:\w+/g, 'f'.repeat(24));
    const r = await fetch(url, { method: m, headers: { 'content-type': 'application/json' }, body: ['POST', 'PUT', 'PATCH'].includes(m) ? '{}' : undefined, signal: AbortSignal.timeout(1200) }).catch((e) => ({ status: e.name === 'TimeoutError' ? 'REACHED-DATA' : 'ERR' }));
    if (isPub) { pub++; continue; }
    if (r.status === 401) prot++; else { bad++; console.log('NOT PROTECTED:', key, '->', r.status); }
  }
  console.log(`routes: ${routes.length}  protected(401 without login): ${prot}  deliberately public: ${pub}  problems: ${bad}`);
  process.exit(bad ? 1 : 0);
});
