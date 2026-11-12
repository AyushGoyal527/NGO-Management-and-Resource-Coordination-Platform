import { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { Badge, ConfirmDialog, EmptyState, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import { daysFromToday, fmtDateTime } from '../utils/format';

export const STATUSES = [
  { value: 'assigned', label: 'Assigned' }, { value: 'accepted', label: 'Accepted' }, { value: 'inProgress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
];
export const PRIORITIES = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }];
// Same moves the server allows a volunteer. Managers and admins can move a task to any other status.
export const VOLUNTEER_MOVES = { assigned: ['accepted', 'inProgress'], accepted: ['inProgress', 'completed'], inProgress: ['completed'] };
const MOVE_LABEL = { accepted: 'Accept', inProgress: 'Start work', completed: 'Mark done' };
const OPEN = ['assigned', 'accepted', 'inProgress'];

// "Overdue by 2 days", "Due today", "Due tomorrow", "Due in 5 days". Finished or cancelled tasks have no deadline to show.
export function dueInfo(task) {
  const days = daysFromToday(task.dueDate);
  if (days === null || !OPEN.includes(task.status)) return null;
  if (days < 0) return { text: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, tone: 'text-red-700 bg-red-50' };
  if (days === 0) return { text: 'Due today', tone: 'text-amber-700 bg-amber-50' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'text-amber-700 bg-amber-50' };
  return { text: `Due in ${days} days`, tone: 'text-slate-600 bg-slate-100' };
}

export const DueBadge = ({ task }) => {
  const d = dueInfo(task);
  return d ? <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${d.tone}`}>{d.text}</span> : null;
};

// Volunteers get buttons for the next steps; managers with tasks.edit get a "Move to" menu.
export function MoveControl({ task, service, onMoved, compact = false }) {
  const { user, hasPermission } = useAuth();
  const [busy, setBusy] = useState(false);
  const isVolunteer = user.role === 'volunteer';
  const allowed = isVolunteer ? (VOLUNTEER_MOVES[task.status] || []) : (user.role === 'admin' || hasPermission('tasks.edit') ? STATUSES.map((s) => s.value).filter((s) => s !== task.status) : []);
  if (!allowed.length) return null;

  const move = async (status) => {
    if (!status) return;
    setBusy(true);
    try {
      const { item } = await service.setStatus(task._id, status);
      toast.success('Task updated');
      onMoved(item);
    } catch (e) {
      toast.error(errorMessage(e));
      onMoved(null); // refresh: someone else may have changed it
    } finally { setBusy(false); }
  };

  if (!isVolunteer) {
    return (
      <select className={`input ${compact ? 'w-auto py-1 text-xs' : 'w-auto'}`} aria-label={`Move ${task.title}`} value="" disabled={busy} onChange={(e) => move(e.target.value)}>
        <option value="">Move to…</option>
        {allowed.map((s) => <option key={s} value={s}>{STATUSES.find((x) => x.value === s).label}</option>)}
      </select>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((s, i) => (
        <button key={s} className={`${i === 0 ? 'btn-primary' : 'btn-secondary'} ${compact ? 'px-3 py-1 text-xs' : ''}`} disabled={busy} onClick={() => move(s)} aria-label={`${MOVE_LABEL[s]}: ${task.title}`}>
          {busy && i === 0 && <Spinner className="h-3.5 w-3.5" />}{MOVE_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

export function CommentsTab({ item, service, onItem }) {
  const { user, hasPermission } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(null);
  const canModerate = user.role !== 'volunteer' && (user.role === 'admin' || hasPermission('tasks.edit'));
  const clean = text.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!clean) return;
    setBusy(true);
    try { onItem((await service.addComment(item._id, clean)).item); setText(''); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const confirmRemove = async () => {
    setBusy(true);
    try { onItem((await service.deleteComment(item._id, remove._id)).item); setRemove(null); toast.success('Comment deleted'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <div className="p-5">
      <form onSubmit={submit} className="mb-5">
        <label htmlFor="task-comment" className="label">Add a comment</label>
        <textarea id="task-comment" rows={2} className="input" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question or share progress" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">{text.length}/1000</span>
          <button className="btn-primary" disabled={busy || !clean}>{busy && <Spinner className="h-4 w-4" />}Post comment</button>
        </div>
      </form>
      {item.comments?.length ? (
        <ul className="space-y-3">
          {item.comments.map((c) => (
            <li key={c._id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm"><span className="font-medium text-slate-800">{c.user?.name || 'Someone'}</span>{c.user?.role && <span className="ml-2"><Badge value={c.user.role} /></span>}</p>
                {(c.user?._id === user._id || canModerate) && (
                  <button className="rounded p-1 text-red-600 hover:bg-red-50" aria-label="Delete comment" onClick={() => setRemove(c)}><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{c.text}</p>
              <p className="mt-1 text-xs text-slate-400">{fmtDateTime(c.createdAt)}</p>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No comments yet" hint="Comments are seen by everyone on this task." />}
      <ConfirmDialog open={!!remove} danger busy={busy} title="Delete comment" message="This comment will be removed for everyone." confirmLabel="Delete" onConfirm={confirmRemove} onClose={() => setRemove(null)} />
    </div>
  );
}
