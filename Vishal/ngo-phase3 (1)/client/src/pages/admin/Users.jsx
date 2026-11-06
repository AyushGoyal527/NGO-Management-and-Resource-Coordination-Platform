import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Archive, KeyRound, Pencil, Plus, Power, Search, ShieldCheck } from 'lucide-react';
import { Badge, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Pagination, Skeleton, Spinner } from '../../components/ui';
import { Field, passwordRules } from '../auth/AuthShell';
import useDebounce from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { errorMessage } from '../../services/api';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');

function UserForm({ editing, isAdmin, onClose, onSaved }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: editing || { role: 'volunteer', status: 'active' },
  });
  const [error, setError] = useState('');

  const onSubmit = async (v) => {
    setError('');
    try {
      if (editing) await userService.update(editing._id, { name: v.name, email: v.email, phone: v.phone });
      else await userService.create(v);
      toast.success(editing ? 'User updated' : 'User created');
      onSaved();
    } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Field label="Full name" error={errors.name?.message}><input className="input" {...register('name', { required: 'Name is required' })} /></Field>
      <Field label="Email" error={errors.email?.message}><input type="email" className="input" {...register('email', { required: 'Email is required' })} /></Field>
      <Field label="Phone"><input className="input" {...register('phone')} /></Field>
      {!editing && (
        <>
          <Field label="Temporary password" error={errors.password?.message}><input type="password" autoComplete="new-password" className="input" {...register('password', passwordRules)} /></Field>
          {isAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role"><select className="input" {...register('role')}><option value="volunteer">Volunteer</option><option value="manager">Manager</option><option value="admin">Admin</option></select></Field>
              <Field label="Status"><select className="input" {...register('status')}><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select></Field>
            </div>
          )}
        </>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}{editing ? 'Save changes' : 'Create user'}</button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: me, hasPermission } = useAuth();
  const isAdmin = me.role === 'admin';
  const [filters, setFilters] = useState({ search: '', role: '', status: '', sortBy: 'createdAt', order: 'desc', page: 1 });
  const search = useDebounce(filters.search);
  const [data, setData] = useState({ items: [], pagination: null });
  const [state, setState] = useState('loading'); // loading | ready | error
  const [form, setForm] = useState(null); // null | {} (create) | user (edit)
  const [confirm, setConfirm] = useState(null); // { type, user }
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  const load = useCallback(() => {
    setState('loading');
    userService.list({ search, role: filters.role, status: filters.status, sortBy: filters.sortBy, order: filters.order, page: filters.page, limit: 10 })
      .then((d) => { setData(d); setState('ready'); })
      .catch(() => setState('error'));
  }, [search, filters.role, filters.status, filters.sortBy, filters.order, filters.page]);

  useEffect(load, [load]);
  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  const runConfirm = async () => {
    const { type, user } = confirm;
    setBusy(true);
    try {
      if (type === 'archive') await userService.archive(user._id);
      else if (type === 'reset') { const r = await userService.resetPassword(user._id); setTempPassword({ name: user.name, value: r.temporaryPassword }); }
      else await userService.setStatus(user._id, type);
      toast.success('Done');
      setConfirm(null);
      load();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const copy = {
    active: ['Activate user', 'They will be able to log in again.'],
    inactive: ['Deactivate user', 'They will be logged out of new requests and cannot log in until reactivated.'],
    archive: ['Archive user', 'The account is hidden from the list and cannot log in. You can restore it from the Archived filter.'],
    reset: ['Reset password', 'A temporary password will be generated. Share it with the user securely.'],
  };

  const actions = (u) => {
    const self = u._id === me._id;
    if (self) return <span className="text-xs text-slate-400">You</span>;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {hasPermission('users.edit') && <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="Edit" aria-label={`Edit ${u.name}`} onClick={() => setForm(u)}><Pencil className="h-4 w-4" /></button>}
        {isAdmin && u.role !== 'admin' && <Link className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="Manage permissions" aria-label={`Permissions for ${u.name}`} to={`/admin/permissions?user=${u._id}`}><ShieldCheck className="h-4 w-4" /></Link>}
        {hasPermission('users.edit') && (u.status === 'active'
          ? <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="Deactivate" aria-label={`Deactivate ${u.name}`} onClick={() => setConfirm({ type: 'inactive', user: u })}><Power className="h-4 w-4" /></button>
          : <button className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50" title={u.status === 'pending' ? 'Approve' : 'Activate'} aria-label={`Activate ${u.name}`} onClick={() => setConfirm({ type: 'active', user: u })}><Power className="h-4 w-4" /></button>)}
        {isAdmin && <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="Reset password" aria-label={`Reset password for ${u.name}`} onClick={() => setConfirm({ type: 'reset', user: u })}><KeyRound className="h-4 w-4" /></button>}
        {hasPermission('users.delete') && u.status !== 'archived' && <button className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Archive" aria-label={`Archive ${u.name}`} onClick={() => setConfirm({ type: 'archive', user: u })}><Archive className="h-4 w-4" /></button>}
      </div>
    );
  };

  const permCount = (u) => (u.role === 'admin' ? 'All' : u.permissions?.length || 0);
  const sortHead = (key, label) => (
    <button className="font-medium hover:text-slate-900" onClick={() => set({ sortBy: key, order: filters.sortBy === key && filters.order === 'asc' ? 'desc' : 'asc' })}>
      {label}{filters.sortBy === key ? (filters.order === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );

  return (
    <>
      <PageHeader title="Users" subtitle="Create accounts, approve sign-ups and manage who can log in."
        actions={hasPermission('users.create') && <button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add user</button>} />

      <div className="card">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder="Search by name or email" value={filters.search} onChange={(e) => set({ search: e.target.value })} aria-label="Search users" />
          </div>
          <select className="input w-auto" value={filters.role} onChange={(e) => set({ role: e.target.value })} aria-label="Filter by role">
            <option value="">All roles</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="volunteer">Volunteer</option>
          </select>
          <select className="input w-auto" value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label="Filter by status">
            <option value="">All except archived</option><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
          </select>
        </div>

        {state === 'loading' && <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
        {state === 'error' && <ErrorState message="Could not load users" onRetry={load} />}
        {state === 'ready' && data.items.length === 0 && <EmptyState title="No users found" hint="Try a different search or filter." />}

        {state === 'ready' && data.items.length > 0 && (
          <>
            {/* Tablet and desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{sortHead('name', 'Name')}</th><th className="px-4 py-3">{sortHead('email', 'Email')}</th>
                    <th className="px-4 py-3">{sortHead('role', 'Role')}</th><th className="px-4 py-3">{sortHead('status', 'Status')}</th>
                    <th className="px-4 py-3">{sortHead('lastLogin', 'Last login')}</th><th className="px-4 py-3 font-medium">Permissions</th><th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3"><Badge value={u.role} /></td>
                      <td className="px-4 py-3"><Badge value={u.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{fmt(u.lastLogin)}</td>
                      <td className="px-4 py-3 text-slate-600">{permCount(u)}</td>
                      <td className="px-4 py-3">{actions(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((u) => (
                <li key={u._id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-medium text-slate-900">{u.name}</p><p className="truncate text-sm text-slate-500">{u.email}</p></div>
                    <div className="flex gap-1"><Badge value={u.role} /><Badge value={u.status} /></div>
                  </div>
                  <p className="text-xs text-slate-500">Last login: {fmt(u.lastLogin)} · Permissions: {permCount(u)}</p>
                  {actions(u)}
                </li>
              ))}
            </ul>
            <Pagination pagination={data.pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </div>

      <Modal open={!!form} title={form?._id ? 'Edit user' : 'Add user'} onClose={() => setForm(null)}>
        {form && <UserForm editing={form._id ? form : null} isAdmin={isAdmin} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      </Modal>

      <ConfirmDialog open={!!confirm} busy={busy} danger={confirm?.type === 'archive' || confirm?.type === 'inactive'}
        title={confirm ? copy[confirm.type === 'archive' ? 'archive' : confirm.type][0] : ''}
        message={confirm ? `${confirm.user.name}: ${copy[confirm.type][1]}` : ''}
        confirmLabel={confirm ? copy[confirm.type][0] : ''} onConfirm={runConfirm} onClose={() => setConfirm(null)} />

      <Modal open={!!tempPassword} title="Temporary password" onClose={() => setTempPassword(null)}>
        <p className="text-sm text-slate-600">Share this with {tempPassword?.name}. It is shown only once.</p>
        <code className="mt-3 block select-all rounded-lg bg-slate-100 px-3 py-2 text-center text-lg">{tempPassword?.value}</code>
        <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={() => setTempPassword(null)}>Done</button></div>
      </Modal>
    </>
  );
}
