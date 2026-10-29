import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EmptyState, ErrorState, PageHeader, Skeleton, Spinner } from '../../components/ui';
import { userService } from '../../services/userService';
import { errorMessage } from '../../services/api';

const ACTIONS = ['view', 'create', 'edit', 'delete', 'assign', 'distribute', 'export'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Permissions() {
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null); // full user record
  const [perms, setPerms] = useState(new Set());
  const [dashMods, setDashMods] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const userId = params.get('user') || '';

  useEffect(() => {
    Promise.all([userService.catalog(), userService.list({ limit: 100, status: 'active' }), userService.list({ limit: 100, status: 'pending' })])
      .then(([c, a, p]) => { setCatalog(c); setUsers([...a.items, ...p.items].filter((u) => u.role !== 'admin')); })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const u = users.find((x) => x._id === userId) || null;
    setSelected(u);
    setPerms(new Set(u?.permissions || []));
    setDashMods(new Set(u?.dashboardModules || []));
  }, [userId, users]);

  const modules = useMemo(() => (catalog ? Object.entries(catalog.modules) : []), [catalog]);
  const toggle = (set, setter, key) => { const n = new Set(set); n.has(key) ? n.delete(key) : n.add(key); setter(n); };

  const toggleRow = (module, actions) => {
    const keys = actions.map((a) => `${module}.${a}`);
    const all = keys.every((k) => perms.has(k));
    const n = new Set(perms);
    keys.forEach((k) => (all ? n.delete(k) : n.add(k)));
    setPerms(n);
  };

  const togglePerm = (key) => {
    const n = new Set(perms);
    const [module, action] = key.split('.');
    if (n.has(key)) {
      n.delete(key);
      if (action === 'view') catalog.modules[module].forEach((a) => n.delete(`${module}.${a}`)); // no actions without view
    } else {
      n.add(key);
      n.add(`${module}.view`);
    }
    setPerms(n);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { user } = await userService.setPermissions(selected._id, { permissions: [...perms], dashboardModules: [...dashMods] });
      setUsers((list) => list.map((u) => (u._id === user._id ? user : u)));
      toast.success('Permissions saved');
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };

  if (error) return <div className="card"><ErrorState message="Could not load permissions" onRetry={() => window.location.reload()} /></div>;

  return (
    <>
      <PageHeader title="Permissions" subtitle="Choose what each manager or volunteer can see and do. Admins always have full access." />
      <div className="card p-4">
        <label className="label" htmlFor="person">Person</label>
        {!catalog ? <Skeleton className="h-10 w-full max-w-sm" /> : (
          <select id="person" className="input max-w-sm" value={userId} onChange={(e) => setParams(e.target.value ? { user: e.target.value } : {})}>
            <option value="">Select a user…</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
          </select>
        )}
      </div>

      {catalog && !selected && <div className="card mt-4"><EmptyState title="Select a user" hint="Pick someone above to edit their permissions." /></div>}

      {selected && (
        <>
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr><th className="px-4 py-3 font-medium">Module</th>{ACTIONS.map((a) => <th key={a} className="px-3 py-3 text-center font-medium">{cap(a)}</th>)}<th className="px-3 py-3 text-center font-medium">All</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map(([module, actions]) => (
                  <tr key={module}>
                    <td className="px-4 py-2.5 font-medium capitalize text-slate-800">{module}</td>
                    {ACTIONS.map((a) => (
                      <td key={a} className="px-3 py-2.5 text-center">
                        {actions.includes(a)
                          ? <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={perms.has(`${module}.${a}`)} onChange={() => togglePerm(`${module}.${a}`)} aria-label={`${module} ${a}`} />
                          : <span className="text-slate-300">–</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={actions.every((a) => perms.has(`${module}.${a}`))} onChange={() => toggleRow(module, actions)} aria-label={`All ${module} permissions`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected.role === 'manager' && (
            <div className="card mt-4 p-4">
              <h2 className="font-medium text-slate-900">Dashboard modules</h2>
              <p className="mb-3 text-sm text-slate-500">Modules shown on this manager&apos;s dashboard and sidebar. A module only appears if they also have its view permission.</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {modules.filter(([m]) => !['users', 'settings'].includes(m)).map(([m]) => (
                  <label key={m} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={dashMods.has(m)} onChange={() => toggle(dashMods, setDashMods, m)} />{m}</label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button className="btn-primary" onClick={save} disabled={saving}>{saving && <Spinner className="h-4 w-4" />}Save permissions</button>
          </div>
        </>
      )}
    </>
  );
}
