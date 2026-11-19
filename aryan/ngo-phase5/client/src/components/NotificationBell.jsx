import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Skeleton } from './ui';
import { CHANGED, notificationApi } from '../services/notificationApi';
import { safeLink, timeAgo } from '../utils/format';

const POLL_MS = 60000;

export default function NotificationBell({ role }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;

  const loadList = useCallback(() => {
    setError(false);
    notificationApi.list({ limit: 8 }).then((d) => { setItems(d.items); setUnread(d.unread); }).catch(() => setError(true));
  }, []);
  const refreshCount = useCallback(() => {
    notificationApi.unread().then(setUnread).catch(() => {}); // a failed poll just keeps the last count
    if (openRef.current) loadList();
  }, [loadList]);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(() => { if (!document.hidden) refreshCount(); }, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener(CHANGED, onFocus);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener(CHANGED, onFocus); window.removeEventListener('focus', onFocus); };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadList();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loadList]);

  const choose = async (n) => {
    setOpen(false);
    if (!n.read) { try { await notificationApi.markRead(n._id); } catch { /* the link still works */ } }
    const to = safeLink(n.link);
    if (to) navigate(to);
  };
  const markAll = async () => { try { await notificationApi.markAllRead(); } catch { /* shown again on next refresh */ } };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-haspopup="dialog" aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Notifications" className="absolute right-0 z-20 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              {unread > 0 && <button className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline" onClick={markAll}><CheckCheck className="h-3.5 w-3.5" />Mark all as read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {error && <div className="px-4 py-8 text-center text-sm text-slate-500">Could not load notifications. <button className="font-medium text-brand-700 hover:underline" onClick={loadList}>Try again</button></div>}
              {!items && !error && <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
              {items && items.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">You are all caught up. New alerts will show up here.</p>}
              {items && items.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {items.map((n) => (
                    <li key={n._id}>
                      <button className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/40'}`} onClick={() => choose(n)}>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-600'}`} aria-label={n.read ? undefined : 'Unread'} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${n.read ? 'text-slate-700' : 'font-medium text-slate-900'}`}>{n.title}</span>
                          {n.message && <span className="block truncate text-xs text-slate-500">{n.message}</span>}
                          <span className="block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link to={`/${role}/notifications`} onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-slate-50">See all notifications</Link>
          </div>
        </>
      )}
    </div>
  );
}
