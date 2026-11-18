import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Bell, CalendarClock, CheckCheck, CheckCircle2, HandCoins, Package, ShieldCheck, Soup, Trash2, UserCheck } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, Pagination, Skeleton } from '../../components/ui';
import { CHANGED, notificationApi } from '../../services/notificationApi';
import { errorMessage } from '../../services/api';
import { safeLink, timeAgo } from '../../utils/format';

const TYPES = {
  'task-assigned': { label: 'Task assigned', icon: CheckCircle2 }, 'task-deadline': { label: 'Task deadline', icon: AlertTriangle }, 'task-status': { label: 'Task update', icon: CheckCircle2 },
  'event-upcoming': { label: 'Event', icon: CalendarClock }, 'donation-received': { label: 'Donation', icon: HandCoins }, 'resource-low': { label: 'Resource running low', icon: Package },
  'food-low': { label: 'Food low', icon: Soup }, 'food-expiring': { label: 'Food expiry', icon: Soup }, 'manager-assigned': { label: 'Assignment', icon: UserCheck }, 'permission-changed': { label: 'Permissions', icon: ShieldCheck },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ unread: '', type: '', page: 1 });
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = { page: filters.page, limit: 10 };
    if (filters.unread) params.unread = 'true';
    if (filters.type) params.type = filters.type;
    notificationApi.list(params).then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
  }, [filters]);
  useEffect(() => { setState((s) => (s === 'ready' ? s : 'loading')); load(); }, [load]);
  useEffect(() => { window.addEventListener(CHANGED, load); return () => window.removeEventListener(CHANGED, load); }, [load]);

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const open = async (n) => {
    if (!n.read) { try { await notificationApi.markRead(n._id); } catch { /* still follow the link */ } }
    const to = safeLink(n.link);
    if (to) navigate(to);
  };
  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const filtered = !!(filters.unread || filters.type);

  return (
    <>
      <PageHeader title="Notifications" subtitle="Task deadlines, events, stock alerts and updates that need your attention."
        actions={(
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" disabled={busy || !data?.unread} onClick={() => run(notificationApi.markAllRead, 'All marked as read')}><CheckCheck className="h-4 w-4" />Mark all as read</button>
            <button className="btn-secondary" disabled={busy} onClick={() => run(notificationApi.clearRead, 'Read notifications cleared')}><Trash2 className="h-4 w-4" />Clear read</button>
          </div>
        )} />
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <select className="input w-auto" aria-label="Show" value={filters.unread} onChange={(e) => set({ unread: e.target.value })}><option value="">All notifications</option><option value="true">Unread only</option></select>
          <select className="input w-auto" aria-label="Type" value={filters.type} onChange={(e) => set({ type: e.target.value })}><option value="">All types</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          {data && <span className="text-sm text-slate-500">{data.unread} unread</span>}
        </div>
        {state === 'loading' && <div className="space-y-3 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}
        {state === 'error' && <ErrorState message="Could not load notifications" onRetry={load} />}
        {state === 'ready' && data.items.length === 0 && <EmptyState title={filtered ? 'Nothing matches these filters' : 'No notifications yet'} hint={filtered ? 'Try showing all notifications.' : 'Alerts about tasks, events and stock will appear here.'} />}
        {state === 'ready' && data.items.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((n) => {
                const Icon = (TYPES[n.type] || { icon: Bell }).icon;
                return (
                  <li key={n._id} className={`flex items-start gap-3 px-4 py-3 ${n.read ? '' : 'bg-brand-50/40'}`}>
                    <span className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-600"><Icon className="h-4 w-4" /></span>
                    <button className="min-w-0 flex-1 text-left" onClick={() => open(n)}>
                      <span className={`block text-sm ${n.read ? 'text-slate-700' : 'font-medium text-slate-900'}`}>{n.title}{!n.read && <span className="sr-only"> (unread)</span>}</span>
                      {n.message && <span className="block text-sm text-slate-500">{n.message}</span>}
                      <span className="block text-xs text-slate-400">{TYPES[n.type]?.label} · {timeAgo(n.createdAt)}</span>
                    </button>
                    {!n.read && <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" aria-label={`Mark as read: ${n.title}`} disabled={busy} onClick={() => run(() => notificationApi.markRead(n._id))}><CheckCheck className="h-4 w-4" /></button>}
                    <button className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Delete: ${n.title}`} disabled={busy} onClick={() => run(() => notificationApi.remove(n._id))}><Trash2 className="h-4 w-4" /></button>
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
