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

const asOptions = (items) => items.map((m) => ({ value: m._id, label: m.role ? `${m.name} (${m.role})` : m.name }));

// A full list page (search, filters, date range, sorting, pagination, add/edit, view drawer, archive/delete) driven by a config object.
// Optional config: nameOf, avatar:false, documents:false, dateRange, renderAbove, headerActions, rowClass, rowActions.
// Optional props: embedded (no page header, for use inside tabs), refreshKey (reload when it changes), onChange (after any change).
export default function ResourcePage({ config, embedded = false, refreshKey = 0, onChange }) {
  const { user, hasPermission } = useAuth();
  const isAdmin = user.role === 'admin';
  const can = (a) => hasPermission(`${config.module}.${a}`);
  const { service } = config;
  const nameOf = config.nameOf || ((it) => it.name);

  const [filters, setFilters] = useState({ search: '', sortBy: config.defaultSort || 'createdAt', order: config.defaultOrder || 'desc', page: 1, from: '', to: '' });
  const search = useDebounce(filters.search);
  const [data, setData] = useState({ items: [], pagination: null });
  const [state, setState] = useState('loading');
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState(null); // null | {} (new) | item (edit)
  const [viewId, setViewId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [extraOptions, setExtraOptions] = useState({ manager: [], program: [], people: [] });
  const [loadedOptions, setLoadedOptions] = useState({});

  useEffect(() => {
    const quiet = (p, key) => p.then((d) => setExtraOptions((o) => ({ ...o, [key]: asOptions(d.items) }))).catch(() => {});
    if (isAdmin) quiet(lookups.managers(), 'manager');
    if (config.filters.some((f) => f.optionsFrom === 'programs')) quiet(lookups.programs(), 'program');
    if (config.filters.some((f) => f.optionsFrom === 'people')) quiet(lookups.people(), 'people');
    config.filters.filter((f) => f.load).forEach((f) => f.load().then((opts) => setLoadedOptions((o) => ({ ...o, [f.param]: opts }))).catch(() => {}));
  }, [isAdmin, config]);

  const optionsFor = (f) => f.options || (f.load ? loadedOptions[f.param] : extraOptions[f.optionsFrom === 'programs' ? 'program' : f.optionsFrom]) || [];
  const filterDefs = [...config.filters, ...(isAdmin && config.managerFilter !== false ? [{ param: 'manager', label: 'All managers', optionsFrom: 'manager' }] : [])]
    .filter((f) => f.options || f.load || optionsFor(f).length > 0 || (f.optionsFrom && f.optionsFrom !== 'people' && f.optionsFrom !== 'manager'));

  const rangeInvalid = !!(filters.from && filters.to && filters.from > filters.to);
  const params = { search, sortBy: filters.sortBy, order: filters.order, page: filters.page, limit: 10 };
  filterDefs.forEach((f) => { if (filters[f.param]) params[f.param] = filters[f.param]; });
  if (config.dateRange && !rangeInvalid) { if (filters.from) params.from = filters.from; if (filters.to) params.to = filters.to; }
  const paramsKey = JSON.stringify(params);

  const load = useCallback(() => {
    setState('loading');
    service.list(JSON.parse(paramsKey)).then((d) => { setData(d); setState('ready'); setVersion((v) => v + 1); }).catch(() => setState('error'));
  }, [service, paramsKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [load, refreshKey]);

  const changed = () => { load(); onChange?.(); };
  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const filtered = !!filters.search || filterDefs.some((f) => filters[f.param]) || !!filters.from || !!filters.to;

  const runConfirm = async () => {
    setBusy(true);
    try {
      await service.remove(confirm._id);
      toast.success(config.archive ? `${config.singular} archived` : `${config.singular} deleted`);
      setConfirm(null);
      onChange?.();
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
      {config.avatar !== false && <Avatar name={nameOf(it)} src={it[config.photoField]} size={36} />}
      <div className="min-w-0"><p className="truncate font-medium text-slate-900">{nameOf(it)}</p>{config.subtitle && <p className="truncate text-xs text-slate-500">{config.subtitle(it)}</p>}</div>
    </div>
  );

  const actions = (it) => (
    <div className="flex items-center gap-1">
      <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="View" aria-label={`View ${nameOf(it)}`} onClick={() => setViewId(it._id)}><Eye className="h-4 w-4" /></button>
      {config.rowActions?.(it, { can, reload: changed })}
      {can('edit') && <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" title="Edit" aria-label={`Edit ${nameOf(it)}`} onClick={() => setForm(it)}><Pencil className="h-4 w-4" /></button>}
      {can('delete') && <button className="rounded p-1.5 text-red-600 hover:bg-red-50" title={config.archive ? 'Archive' : 'Delete'} aria-label={`${config.archive ? 'Archive' : 'Delete'} ${nameOf(it)}`} onClick={() => setConfirm(it)}>{config.archive ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}</button>}
    </div>
  );

  const cols = config.columns.filter((c) => !c.adminOnly || isAdmin);
  const addButton = can('create') && <button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add {config.singular.toLowerCase()}</button>;
  const headerButtons = (
    <div className="flex flex-wrap items-center gap-2">
      {config.headerActions?.({ params, can, hasPermission, user })}
      {addButton}
    </div>
  );

  return (
    <>
      {embedded ? <div className="mb-3 flex justify-end">{headerButtons}</div> : <PageHeader title={config.title} subtitle={config.subtitleText} actions={headerButtons} />}

      {config.renderAbove?.({ params, version, can })}

      <div className="card">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder={config.searchPlaceholder} value={filters.search} onChange={(e) => set({ search: e.target.value })} aria-label={`Search ${config.title.toLowerCase()}`} />
          </div>
          {filterDefs.map((f) => (
            <select key={f.param} className="input w-auto" value={filters[f.param] || ''} onChange={(e) => set({ [f.param]: e.target.value })} aria-label={f.label}>
              <option value="">{f.label}</option>{optionsFor(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          {config.dateRange && (
            <div className="flex items-end gap-2">
              <div><label className="mb-0.5 block text-xs text-slate-500" htmlFor="range-from">{config.dateRange.label || 'Date'} from</label><input id="range-from" type="date" className="input" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} /></div>
              <div><label className="mb-0.5 block text-xs text-slate-500" htmlFor="range-to">to</label><input id="range-to" type="date" className="input" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} /></div>
              {(filters.from || filters.to) && <button className="btn-secondary px-3" onClick={() => set({ from: '', to: '' })}>Clear</button>}
            </div>
          )}
        </div>
        {rangeInvalid && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">The start date is after the end date, so the range is ignored.</p>}

        {state === 'loading' && <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {state === 'error' && <ErrorState message={`Could not load ${config.title.toLowerCase()}`} onRetry={load} />}
        {state === 'ready' && data.items.length === 0 && (
          <EmptyState title={`No ${config.title.toLowerCase()} found`} hint={filtered ? 'Try a different search or filter.' : `Add your first ${config.singular.toLowerCase()} to get started.`} action={!filtered && addButton} />
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
                    <tr key={it._id} className={`hover:bg-slate-50 ${config.rowClass?.(it) || ''}`}>
                      {cols.map((c, i) => <td key={c.label} className="px-4 py-3 text-slate-600">{i === 0 ? nameCell(it) : c.render(it)}</td>)}
                      <td className="px-4 py-3">{actions(it)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((it) => (
                <li key={it._id} className={`space-y-2 p-4 ${config.rowClass?.(it) || ''}`}>
                  <div className="flex items-start justify-between gap-2">{nameCell(it)}{cols.find((c) => c.badge) && <span className="shrink-0">{cols.find((c) => c.badge).render(it)}</span>}</div>
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
        {form && <ResourceForm config={config} item={form._id ? form : null} isAdmin={isAdmin} onClose={() => setForm(null)} onSaved={() => { setForm(null); changed(); }} />}
      </Modal>

      <ItemDrawer id={viewId} config={config} can={can} onClose={() => setViewId(null)} onChanged={changed} />

      <ConfirmDialog open={!!confirm} busy={busy} danger title={config.archive ? `Archive ${config.singular.toLowerCase()}` : `Delete ${config.singular.toLowerCase()}`}
        message={confirm ? (config.deleteMessage?.(confirm) || (config.archive ? `${nameOf(confirm)} will be hidden from the list. Their records and history are kept.` : `${nameOf(confirm)}${config.documents === false ? '' : ' and uploaded documents'} will be deleted for good.`)) : ''}
        confirmLabel={config.archive ? 'Archive' : 'Delete'} onConfirm={runConfirm} onClose={() => setConfirm(null)} />
    </>
  );
}
