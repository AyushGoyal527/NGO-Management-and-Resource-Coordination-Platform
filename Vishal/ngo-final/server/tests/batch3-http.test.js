var require = require('module').createRequire(process.cwd() + '/');
process.env.JWT_SECRET = 'x'.repeat(32); process.env.NODE_ENV = 'test';
const U = (id, role, perms) => ({ _id: Buffer.from(id).toString('hex').padEnd(24, '0'), role, status: 'active', permissions: perms, name: id });
const users = {
  admin: U('a', 'admin', []), none: U('n', 'manager', []),
  tView: U('t', 'manager', ['tasks.view']), tEdit: U('e', 'manager', ['tasks.view', 'tasks.edit']), tCreate: U('c', 'manager', ['tasks.view', 'tasks.create']),
  vol: U('v', 'volunteer', ['tasks.view', 'events.view']),
  volGreedy: U('g', 'volunteer', ['tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'events.view', 'events.edit', 'events.create']),
  eView: U('i', 'manager', ['events.view']), eCreate: U('j', 'manager', ['events.view', 'events.create', 'events.edit']),
  pView: U('p', 'manager', ['programs.view']), pCreate: U('q', 'manager', ['programs.view', 'programs.create', 'programs.edit']),
};
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
  const check = async (name, u, method, path, want, body, msg) => {
    const r = await call(u, method, path, body);
    const ok = r.status === want && (!msg || r.msg.includes(msg));
    ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, '->', r.status, r.msg);
  };
  const id = 'f'.repeat(24), id2 = 'e'.repeat(24);
  // ---- tasks: access
  await check('tasks list: not logged in', null, 'GET', '/tasks', 401);
  await check('tasks list: no permission', 'none', 'GET', '/tasks', 403);
  await check('tasks create: view only', 'tView', 'POST', '/tasks', 403, { title: 'x' });
  await check('tasks update: view only', 'tView', 'PUT', `/tasks/${id}`, 403, { title: 'x' });
  await check('tasks delete: edit is not delete', 'tEdit', 'DELETE', `/tasks/${id}`, 403);
  await check('tasks status: manager without tasks.edit', 'tView', 'POST', `/tasks/${id}/status`, 403, { status: 'completed' });
  await check('tasks status: no permission at all', 'none', 'POST', `/tasks/${id}/status`, 403, { status: 'completed' });
  await check('tasks comments: no permission', 'none', 'POST', `/tasks/${id}/comments`, 403, { text: 'hi' });
  await check('tasks documents upload: view only', 'tView', 'POST', `/tasks/${id}/documents`, 403);
  // volunteer guard (even a volunteer who was granted extra permissions)
  for (const u of ['vol', 'volGreedy']) {
    await check(`tasks create: ${u} blocked`, u, 'POST', '/tasks', 403, { title: 'x' });
    await check(`tasks update: ${u} blocked`, u, 'PUT', `/tasks/${id}`, 403, { title: 'x' });
    await check(`tasks delete: ${u} blocked`, u, 'DELETE', `/tasks/${id}`, 403);
    await check(`tasks documents: ${u} blocked`, u, 'POST', `/tasks/${id}/documents`, 403);
    await check(`tasks history: ${u} blocked`, u, 'GET', `/tasks/${id}/history`, 403);
    await check(`tasks list: ${u} reaches data layer`, u, 'GET', '/tasks', 'PASSED');
    await check(`tasks status: ${u} reaches data layer`, u, 'POST', `/tasks/${id}/status`, 'PASSED', { status: 'accepted' });
    await check(`tasks comment: ${u} reaches data layer`, u, 'POST', `/tasks/${id}/comments`, 'PASSED', { text: 'on it' });
    await check(`tasks comment delete: ${u} reaches data layer`, u, 'DELETE', `/tasks/${id}/comments/${id2}`, 'PASSED');
  }
  // ---- tasks: validation
  await check('task: title required', 'admin', 'POST', '/tasks', 400, { priority: 'low' }, 'Title is required');
  await check('task: bad priority', 'admin', 'POST', '/tasks', 400, { title: 'x', priority: 'asap' }, 'priority');
  await check('task: bad assignee id', 'admin', 'POST', '/tasks', 400, { title: 'x', assignedUser: 'nope' }, 'assignee');
  await check('task: bad team id', 'admin', 'POST', '/tasks', 400, { title: 'x', assignedTeam: ['nope'] }, 'team member');
  await check('task: team too large', 'admin', 'POST', '/tasks', 400, { title: 'x', assignedTeam: Array(21).fill(id) }, 'team member');
  await check('task: bad due date', 'admin', 'POST', '/tasks', 400, { title: 'x', dueDate: 'tomorrow' }, 'due date');
  await check('task: title too long', 'admin', 'POST', '/tasks', 400, { title: 'x'.repeat(151) }, 'too long');
  await check('task: blank title on update', 'admin', 'PUT', `/tasks/${id}`, 400, { title: '  ' }, 'cannot be empty');
  await check('task status: invalid value', 'admin', 'POST', `/tasks/${id}/status`, 400, { status: 'done' }, 'Invalid status');
  await check('task status: missing value', 'admin', 'POST', `/tasks/${id}/status`, 400, {}, 'Invalid status');
  await check('task status: bad id', 'admin', 'POST', '/tasks/zzz/status', 400, { status: 'completed' }, 'Invalid id');
  await check('task comment: empty', 'admin', 'POST', `/tasks/${id}/comments`, 400, { text: '   ' }, 'comment');
  await check('task comment: too long', 'admin', 'POST', `/tasks/${id}/comments`, 400, { text: 'x'.repeat(1001) }, 'comment');
  await check('task comment delete: bad comment id', 'admin', 'DELETE', `/tasks/${id}/comments/zzz`, 400, null, 'Invalid comment id');
  await check('tasks list: bad date filter is not an error', 'admin', 'GET', '/tasks?overdue=true&status=assigned', 'PASSED');
  // ---- events
  await check('events list: no permission', 'none', 'GET', '/events', 403);
  await check('events create: view only', 'eView', 'POST', '/events', 403, { name: 'x', date: '2030-01-01' });
  await check('events delete: edit is not delete', 'eCreate', 'DELETE', `/events/${id}`, 403);
  await check('events: volunteer create blocked', 'volGreedy', 'POST', '/events', 403, { name: 'x', date: '2030-01-01' });
  await check('events: volunteer update blocked', 'volGreedy', 'PUT', `/events/${id}`, 403, { name: 'x' });
  await check('events: volunteer history blocked', 'vol', 'GET', `/events/${id}/history`, 403);
  await check('events: volunteer list reaches data layer', 'vol', 'GET', '/events', 'PASSED');
  await check('event: name required', 'eCreate', 'POST', '/events', 400, { date: '2030-01-01' }, 'Name is required');
  await check('event: date required', 'eCreate', 'POST', '/events', 400, { name: 'x' }, 'valid date');
  await check('event: bad time', 'eCreate', 'POST', '/events', 400, { name: 'x', date: '2030-01-01', startTime: '9am' }, 'Start time');
  await check('event: bad end time', 'eCreate', 'POST', '/events', 400, { name: 'x', date: '2030-01-01', endTime: '25:00' }, 'End time');
  await check('event: bad volunteer id', 'eCreate', 'POST', '/events', 400, { name: 'x', date: '2030-01-01', assignedVolunteers: ['nope'] }, 'volunteer');
  await check('event: bad status', 'eCreate', 'POST', '/events', 400, { name: 'x', date: '2030-01-01', status: 'maybe' }, 'status');
  await check('event: bad isPublic', 'eCreate', 'POST', '/events', 400, { name: 'x', date: '2030-01-01', isPublic: 'perhaps' }, 'public');
  // ---- programs
  await check('programs list: volunteer has no programs.view', 'vol', 'GET', '/programs', 403);
  await check('programs create: view only', 'pView', 'POST', '/programs', 403, { name: 'x' });
  await check('programs delete: edit is not delete', 'pCreate', 'DELETE', `/programs/${id}`, 403);
  await check('programs summary: no permission', 'none', 'GET', `/programs/${id}/summary`, 403);
  await check('program: name required', 'pCreate', 'POST', '/programs', 400, { type: 'other' }, 'Name is required');
  await check('program: bad type', 'pCreate', 'POST', '/programs', 400, { name: 'x', type: 'party' }, 'type');
  await check('program: negative budget', 'pCreate', 'POST', '/programs', 400, { name: 'x', budget: -1 }, 'Budget');
  await check('program: bad status', 'pCreate', 'POST', '/programs', 400, { name: 'x', status: 'done' }, 'status');
  await check('program: bad start date', 'pCreate', 'POST', '/programs', 400, { name: 'x', startDate: 'soon' }, 'start date');
  console.log(`\n${pass} passed, ${fail} failed`); s.close(); process.exit(fail ? 1 : 0);
});
