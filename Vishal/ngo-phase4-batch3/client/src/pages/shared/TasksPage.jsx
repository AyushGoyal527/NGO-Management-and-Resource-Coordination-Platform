import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, LayoutGrid, List, MessageSquare, Paperclip, Pencil, Plus, Search, Trash2, User } from 'lucide-react';
import { Badge, ConfirmDialog, ErrorState, Modal, PageHeader, Skeleton } from '../../components/ui';
import ResourcePage from '../../components/ResourcePage';
import ResourceForm from '../../components/ResourceForm';
import ItemDrawer from '../../components/ItemDrawer';
import { DueBadge, MoveControl, PRIORITIES, STATUSES } from '../../components/TaskParts';
import config from '../../modules/tasks';
import useDebounce from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { lookups } from '../../services/resourceService';
import { errorMessage } from '../../services/api';
import { fmtDate } from '../../utils/format';

const PER_COLUMN = 50;
const FINISHED = ['completed', 'cancelled'];
const assignees = (t) => [t.assignedUser?.name, ...(t.assignedTeam || []).map((u) => u.name)].filter(Boolean);

function Card({ task, canManage, canDelete, onOpen, onMoved, onEdit, onDelete }) {
  const who = assignees(task);
  return (
    <li className={`rounded-lg border bg-white p-3 shadow-sm ${task.isOverdue ? 'border-red-200' : 'border-slate-200'}`}>
      <button className="block w-full text-left" onClick={() => onOpen(task._id)} aria-label={`Open ${task.title}`}>
        <span className="block text-sm font-medium text-slate-900">{task.title}</span>
        {task.category && <span className="block text-xs text-slate-500">{task.category}</span>}
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-1.5"><Badge value={task.priority} /><DueBadge task={task} /></div>
      <div className="mt-2 space-y-1 text-xs text-slate-500">
        <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{who.length ? who.join(', ') : 'Unassigned'}</p>
        {task.dueDate && <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(task.dueDate)}</p>}
        {(task.comments?.length > 0 || task.documents?.length > 0) && (
          <p className="flex items-center gap-3">
            {task.comments?.length > 0 && <span className="flex items-center gap-1" title="Comments"><MessageSquare className="h-3.5 w-3.5" />{task.comments.length}</span>}
            {task.documents?.length > 0 && <span className="flex items-center gap-1" title="Attachments"><Paperclip className="h-3.5 w-3.5" />{task.documents.length}</span>}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <MoveControl task={task} service={config.service} compact onMoved={onMoved} />
        {canManage && (
          <span className="flex shrink-0">
            <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}><Pencil className="h-4 w-4" /></button>
            {canDelete && <button className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task)}><Trash2 className="h-4 w-4" /></button>}
          </span>
        )}
      </div>
    </li>
  );
}

// The board: one column per status, loaded separately so a long list of finished tasks never hides the open ones.
function Board({ filters, version, can, canDelete, isVolunteer, onOpen, onEdit, onDelete, onMoved, showCancelled }) {
  const [cols, setCols] = useState(null);
  const [error, setError] = useState(false);
  const key = JSON.stringify(filters);
  const statuses = STATUSES.filter((s) => showCancelled || s.value !== 'cancelled').map((s) => s.value);

  const load = useCallback(() => {
    setError(false);
    const f = JSON.parse(key);
    Promise.all(statuses.map((status) => config.service.list({ ...f, status, limit: PER_COLUMN, sortBy: 'dueDate', order: FINISHED.includes(status) ? 'desc' : 'asc' })))
      .then((res) => setCols(Object.fromEntries(statuses.map((s, i) => [s, res[i]]))))
      .catch(() => setError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, showCancelled]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load, version]);

  if (error) return <div className="card"><ErrorState message="Could not load tasks" onRetry={load} /></div>;
  if (!cols) return <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>;

  const shown = statuses.filter((s) => cols[s]); // right after the cancelled toggle changes, the new column is still loading
  const total = Object.values(cols).reduce((n, c) => n + c.pagination.total, 0);
  const filtered = Object.keys(filters).some((k) => filters[k]);
  if (total === 0) {
    return (
      <div className="card px-6 py-14 text-center">
        <p className="font-medium text-slate-700">{filtered ? 'No tasks match these filters' : isVolunteer ? 'No tasks have been given to you yet' : 'No tasks yet'}</p>
        <p className="mt-1 text-sm text-slate-500">{filtered ? 'Try clearing a filter.' : isVolunteer ? 'When a manager assigns you work, it shows up here.' : 'Add a task to get started.'}</p>
      </div>
    );
  }
  return (
    <div className={`grid gap-4 ${shown.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} md:grid-cols-2`}>
      {shown.map((s) => {
        const col = cols[s];
        return (
          <section key={s} aria-label={`${STATUSES.find((x) => x.value === s).label} tasks`} className="rounded-xl bg-slate-100 p-3">
            <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">{STATUSES.find((x) => x.value === s).label}<span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">{col.pagination.total}</span></h2>
            {col.items.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">Nothing here</p> : (
              <ul className="space-y-3">
                {col.items.map((t) => <Card key={t._id} task={t} canManage={!isVolunteer && can('edit')} canDelete={canDelete} onOpen={onOpen} onMoved={onMoved} onEdit={onEdit} onDelete={onDelete} />)}
              </ul>
            )}
            {col.pagination.total > col.items.length && <p className="mt-3 text-center text-xs text-slate-500">Showing {col.items.length} of {col.pagination.total}. Use the list view to see all.</p>}
          </section>
        );
      })}
    </div>
  );
}

export default function TasksPage() {
  const { user, hasPermission } = useAuth();
  const isAdmin = user.role === 'admin';
  const isVolunteer = user.role === 'volunteer';
  const can = (a) => isAdmin || hasPermission(`tasks.${a}`);
  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [version, setVersion] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => { if (!isVolunteer) lookups.volunteers().then((d) => setVolunteers(d.items)).catch(() => {}); }, [isVolunteer]);

  const filters = useMemo(() => ({ search: debounced, priority, assignee, overdue: overdue ? 'true' : '' }), [debounced, priority, assignee, overdue]);
  const add = can('create') && !isVolunteer && <button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add task</button>;

  const remove = async () => {
    setBusy(true);
    try { await config.service.remove(confirm._id); toast.success('Task deleted'); setConfirm(null); bump(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const canDelete = can('delete') && !isVolunteer;

  const toggle = (v, Icon, text) => (
    <button className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${view === v ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600'}`} aria-pressed={view === v} onClick={() => setView(v)}><Icon className="h-4 w-4" />{text}</button>
  );

  return (
    <>
      <PageHeader title={isVolunteer ? 'My tasks' : 'Tasks'} subtitle={isVolunteer ? 'Accept your tasks, update their progress and talk to your manager.' : config.subtitleText}
        actions={<div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg bg-slate-100 p-1" role="group" aria-label="View">{toggle('board', LayoutGrid, 'Board')}{toggle('list', List, 'List')}</div>{view === 'board' && add}</div>} />

      {view === 'board' ? (
        <>
          <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search tasks" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-auto" aria-label="All priorities" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
            {volunteers.length > 0 && <select className="input w-auto" aria-label="Anyone" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Anyone</option>{volunteers.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}</select>}
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />Overdue only</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />Show cancelled</label>
          </div>
          <Board filters={filters} version={version} can={can} canDelete={canDelete} isVolunteer={isVolunteer} showCancelled={showCancelled} onOpen={setOpenId} onEdit={setForm} onDelete={setConfirm} onMoved={bump} />
        </>
      ) : <ResourcePage config={config} embedded refreshKey={version} onChange={bump} />}

      <ItemDrawer id={openId} config={config} can={can} onClose={() => setOpenId(null)} onChanged={bump} />
      <Modal open={!!form} wide title={form?._id ? 'Edit task' : 'Add task'} onClose={() => setForm(null)}>
        {form && <ResourceForm config={config} item={form._id ? form : null} isAdmin={isAdmin} onClose={() => setForm(null)} onSaved={() => { setForm(null); bump(); }} />}
      </Modal>
      <ConfirmDialog open={!!confirm} busy={busy} danger title="Delete task" message={confirm ? `"${confirm.title}" and its comments and attachments will be deleted for good.` : ''} confirmLabel="Delete" onConfirm={remove} onClose={() => setConfirm(null)} />
    </>
  );
}
