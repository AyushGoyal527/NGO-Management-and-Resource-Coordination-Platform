import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Avatar, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Pagination, Skeleton } from './ui';
import ResourceForm from './ResourceForm';
import ItemDrawer from './ItemDrawer';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { lookups } from '../services/resourceService';
import { errorMessage } from '../services/api';

// A full list page (search, filters, sorting, pagination, add/edit, view drawer, archive/delete) driven by a config object.
export default function ResourcePage({ config }) {
  const { user, hasPermission } = useAuth();
  const isAdmin = user.role === 'admin';
  const can = (a) => hasPermission(`${config.module}.${a}`);
  const { service } = config;

  const [filters, setFilters] = useState({ search: '', sortBy: config.defaultSort || 'createdAt', order: config.defaultOrder || 'desc', page: 1 });
  const search = useDebounce(filters.search);
  const [data, setData] = useState({ items: [], pagination: null });
  const [state, setState] = useState('loading');
  const [form, setForm] = useState(null); // null | {} (new) | item (edit)
  const [viewId, setViewId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [extraOptions, setExtraOptions] = useState({ manager: [], program: [] });

  useEffect(() => {
    if (isAdmin) lookups.managers().then((d) => setExtraOptions((o) => ({ ...o, manager: d.items.map((m) => ({ value: m._id, label: m.name })) }))).catch(() => {});
    if (config.filters.some((f) => f.optionsFrom === 'programs')) lookups.programs().then((d) => setExtraOptions((o) => ({ ...o, program: d.items.map((m) => ({ value: m._id, label: m.name })) }))).catch(() => {});
  }, [isAdmin, config]);

  const filterDefs = [...config.filters, ...(isAdmin ? [{ param: 'manager', label: 'All managers', optionsFrom: 'manager' }] : [])];
  const params = { search, sortBy: filters.sortBy, order: filters.order, page: filters.page, limit: 10 };
  filterDefs.forEach((f) => { if (filters[f.param]) params[f.param] = filters[f.param]; });
  const paramsKey = JSON.stringify(params);

  const load = useCallback(() => {
    setState('loading');
    service.list(JSON.parse(paramsKey)).then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
  }, [service, paramsKey]);
  useEffect(load, [load]);

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  const runConfirm = async () => {
    setBusy(true);
    try {
      await service.remove(confirm._id);
      toast.success(config.archive ? `${config.singular} archived` : `${config.singular} deleted`);
      setConfirm(null);
      if (data.items.length === 1 && filters.page > 1) setFilters((f) => ({ ...f, page: f.page - 1 })); else load();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const sortHead = (c) => (c.sort ? (
    <button className="font-medium hover:text-slate-900" onClick={() => set({ sortBy: c.sort, order: filters.sortBy === c.sort && filters.order === 'asc' ? 'desc' : 'asc' })}>
      {c.label}{filters.sortBy === c.sort ? (filters.order === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  ) : <span className="font-medium">{c.label}</span>);

  const nameCell = (it) => (
    <div className="flex items-center gap-3">
      <Avatar name={it.name} src={it[config.photoField]} size={36} />
      <div className="min-w-0"><p className="truncate font-medium text-slate-900">{it.name}</p>{config.subtitle && <p className="truncate text-xs text-slate-500">{config.subtitle(it)}</p>}</div>
    </div>
  );

  const actions = (it) => (
    <div className="flex items-center gap-1">
      <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="View" aria-label={`View ${it.name}`} onClick={() => setViewId(it._id)}><Eye className="h-4 w-4" /></button>
      {can('edit') && <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="Edit" aria-label={`Edit ${it.name}`} onClick={() => setForm(it)}><Pencil className="h-4 w-4" /></button>}
      {can('delete') && <button className="rounded p-1.5 text-red-600 hover:bg-red-50" title={config.archive ? 'Archive' : 'Delete'} aria-label={`${config.archive ? 'Archive' : 'Delete'} ${it.name}`} onClick={() => setConfirm(it)}>{config.archive ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}</button>}
    </div>
  );

  const cols = config.columns.filter((c) => !c.adminOnly || isAdmin);

  return (
    <>
      <PageHeader title={config.title} subtitle={config.subtitleText}
        actions={can('create') && <button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add {config.singular.toLowerCase()}</button>} />

      <div className="card">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder={config.searchPlaceholder} value={filters.search} onChange={(e) => set({ search: e.target.value })} aria-label={`Search ${config.title.toLowerCase()}`} />
          </div>
          {filterDefs.map((f) => {
            const opts = f.options || extraOptions[f.optionsFrom] || [];
            return (
              <select key={f.param} className="input w-auto" value={filters[f.param] || ''} onChange={(e) => set({ [f.param]: e.target.value })} aria-label={f.label}>
                <option value="">{f.label}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
          })}
        </div>

        {state === 'loading' && <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {state === 'error' && <ErrorState message={`Could not load ${config.title.toLowerCase()}`} onRetry={load} />}
        {state === 'ready' && data.items.length === 0 && (
          <EmptyState title={`No ${config.title.toLowerCase()} found`} hint={filters.search || Object.keys(params).some((k) => filterDefs.some((f) => f.param === k)) ? 'Try a different search or filter.' : `Add your first ${config.singular.toLowerCase()} to get started.`}
            action={can('create') && <button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add {config.singular.toLowerCase()}</button>} />
        )}

        {state === 'ready' && data.items.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>{cols.map((c) => <th key={c.label} className="px-4 py-3">{sortHead(c)}</th>)}<th className="px-4 py-3 font-medium">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((it) => (
                    <tr key={it._id} className="hover:bg-slate-50">
                      {cols.map((c, i) => <td key={c.label} className="px-4 py-3 text-slate-600">{i === 0 ? nameCell(it) : c.render(it)}</td>)}
                      <td className="px-4 py-3">{actions(it)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((it) => (
                <li key={it._id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">{nameCell(it)}{config.badges(it)[0] && <span className="shrink-0">{cols.find((c) => c.badge)?.render(it)}</span>}</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                    {cols.slice(1).filter((c) => !c.badge).map((c) => <div key={c.label}><dt className="text-slate-400">{c.label}</dt><dd>{c.render(it) || '—'}</dd></div>)}
                  </dl>
                  {actions(it)}
                </li>
              ))}
            </ul>
            <Pagination pagination={data.pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </div>

      <Modal open={!!form} wide title={form?._id ? `Edit ${config.singular.toLowerCase()}` : `Add ${config.singular.toLowerCase()}`} onClose={() => setForm(null)}>
        {form && <ResourceForm config={config} item={form._id ? form : null} isAdmin={isAdmin} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      </Modal>

      <ItemDrawer id={viewId} config={config} can={can} onClose={() => setViewId(null)} onChanged={load} />

      <ConfirmDialog open={!!confirm} busy={busy} danger title={config.archive ? `Archive ${config.singular.toLowerCase()}` : `Delete ${config.singular.toLowerCase()}`}
        message={confirm ? (config.archive ? `${confirm.name} will be hidden from the list. Their records and history are kept.` : `${confirm.name} and their uploaded documents will be deleted for good.`) : ''}
        confirmLabel={config.archive ? 'Archive' : 'Delete'} onConfirm={runConfirm} onClose={() => setConfirm(null)} />
    </>
  );
}
