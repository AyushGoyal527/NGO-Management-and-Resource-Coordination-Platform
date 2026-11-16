import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Badge, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Spinner } from '../../components/ui';
import { activityApi } from '../../services/notificationApi';
import { downloadFile } from '../../services/resourceService';
import { errorMessage } from '../../services/api';
import { fmtDateTime, label } from '../../utils/format';

const NAME_KEYS = ['name', 'title', 'foodItem', 'donorName', 'email', 'receiptNumber', 'report'];
const show = (v) => {
  if (v === undefined || v === null || v === '') return '—';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > 300 ? `${s.slice(0, 300)}…` : s;
};

// One plain sentence per entry: which fields changed, or the name of the record.
export function summarize(a) {
  const next = a.newValue && typeof a.newValue === 'object' ? a.newValue : null;
  if (!next) return a.previousValue?.name ? String(a.previousValue.name) : '';
  if (a.action === 'update' || a.action === 'change-permissions') return `Changed: ${Object.keys(next).join(', ')}`;
  const key = NAME_KEYS.find((k) => next[k]);
  return key ? String(next[key]) : '';
}

function Details({ entry }) {
  const keys = [...new Set([...Object.keys(entry.previousValue || {}), ...Object.keys(entry.newValue || {})])];
  if (!keys.length) return <p className="text-sm text-slate-500">No extra details were recorded for this action.</p>;
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-slate-500"><tr><th className="py-1 pr-3 font-medium">Field</th><th className="py-1 pr-3 font-medium">Before</th><th className="py-1 font-medium">After</th></tr></thead>
      <tbody className="align-top">
        {keys.map((k) => (
          <tr key={k} className="border-t border-slate-200">
            <td className="py-1.5 pr-3 font-medium text-slate-700">{k}</td>
            <td className="break-all py-1.5 pr-3 text-slate-600">{show(entry.previousValue?.[k])}</td>
            <td className="break-all py-1.5 text-slate-600">{show(entry.newValue?.[k])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ActivityLogPage() {
  const [filters, setFilters] = useState({ user: '', module: '', action: '', from: '', to: '', page: 1 });
  const [options, setOptions] = useState({ modules: [], actions: [], users: [] });
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [openId, setOpenId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const rangeInvalid = !!(filters.from && filters.to && filters.from > filters.to);
  const params = useMemo(() => {
    const p = { page: filters.page, limit: 20 };
    ['user', 'module', 'action'].forEach((k) => { if (filters[k]) p[k] = filters[k]; });
    if (!rangeInvalid) { if (filters.from) p.from = filters.from; if (filters.to) p.to = filters.to; }
    return p;
  }, [filters, rangeInvalid]);

  useEffect(() => { activityApi.filters().then(setOptions).catch(() => {}); }, []);
  const load = useCallback(() => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    activityApi.list(params).then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
  }, [params]);
  useEffect(load, [load]);

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const filtered = ['user', 'module', 'action', 'from', 'to'].some((k) => filters[k]);
  const exportCsv = async () => {
    setExporting(true);
    try { const { page, limit, ...rest } = params; await downloadFile('/activity-logs/export', { params: rest, fallbackName: 'activity-log.csv' }); } catch (e) { toast.error(errorMessage(e)); } finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader title="Activity log" subtitle="Who did what, and when. Every change to records, permissions and exports is listed here."
        actions={<button className="btn-secondary" onClick={exportCsv} disabled={exporting}>{exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}Export CSV</button>} />
      <div className="card">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">
          <select className="input w-auto" aria-label="Person" value={filters.user} onChange={(e) => set({ user: e.target.value })}><option value="">Everyone</option>{options.users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}</select>
          <select className="input w-auto" aria-label="Module" value={filters.module} onChange={(e) => set({ module: e.target.value })}><option value="">All modules</option>{options.modules.map((m) => <option key={m} value={m}>{label(m)}</option>)}</select>
          <select className="input w-auto" aria-label="Action" value={filters.action} onChange={(e) => set({ action: e.target.value })}><option value="">All actions</option>{options.actions.map((a) => <option key={a} value={a}>{label(a)}</option>)}</select>
          <div><label className="mb-0.5 block text-xs text-slate-500" htmlFor="act-from">From</label><input id="act-from" type="date" className="input" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} /></div>
          <div><label className="mb-0.5 block text-xs text-slate-500" htmlFor="act-to">To</label><input id="act-to" type="date" className="input" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} /></div>
          {filtered && <button className="btn-secondary px-3" onClick={() => set({ user: '', module: '', action: '', from: '', to: '' })}>Clear</button>}
        </div>
        {rangeInvalid && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">The start date is after the end date, so the range is ignored.</p>}
        {state === 'loading' && <div className="space-y-3 p-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {state === 'error' && <ErrorState message="Could not load the activity log" onRetry={load} />}
        {state === 'ready' && data.items.length === 0 && <EmptyState title="No activity found" hint={filtered ? 'Try a different filter or date range.' : 'Actions people take will be recorded here.'} />}
        {state === 'ready' && data.items.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((a) => {
                const open = openId === a._id;
                const text = summarize(a);
                return (
                  <li key={a._id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <button className="mt-0.5 rounded p-1 text-slate-500 hover:bg-slate-100" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} details of ${label(a.action)} in ${label(a.module)}`} onClick={() => setOpenId(open ? null : a._id)}>
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800">
                          <span className="font-medium">{a.user?.name || 'Unknown person'}</span>{a.user?.role && <span className="ml-2"><Badge value={a.user.role} /></span>}
                          <span className="text-slate-500"> · {label(a.action)} · </span><span className="font-medium">{label(a.module)}</span>
                        </p>
                        {text && <p className="break-words text-sm text-slate-500">{text}</p>}
                        <p className="text-xs text-slate-400">{fmtDateTime(a.timestamp)}</p>
                        {open && <div className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3"><Details entry={a} /></div>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination pagination={data.pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </div>
    </>
  );
}
