import { Badge } from '../components/ui';
import { CommentsTab, DueBadge, MoveControl, PRIORITIES, STATUSES } from '../components/TaskParts';
import { tasksService } from '../services/taskApi';
import { lookups } from '../services/resourceService';
import { fmtDate as date, fmtDateTime } from '../utils/format';

const names = (list) => (list || []).map((u) => u.name).join(', ');
const assignee = (t) => [t.assignedUser?.name, ...(t.assignedTeam || []).map((u) => u.name)].filter(Boolean);

// Config for the list view and the details drawer; the board in TasksPage uses the same service and drawer.
export default {
  module: 'tasks', title: 'Tasks', singular: 'Task', service: tasksService, nameOf: (t) => t.title, avatar: false, managerFilter: false,
  subtitleText: 'Assign work, follow progress and keep an eye on deadlines.', searchPlaceholder: 'Search by title, category or location',
  defaultSort: 'dueDate', defaultOrder: 'asc',
  subtitle: (t) => t.category,
  badges: (t) => [t.status, t.priority],
  rowClass: (t) => (t.isOverdue ? 'bg-red-50/40' : ''),
  filters: [
    { param: 'status', label: 'All statuses', options: STATUSES },
    { param: 'priority', label: 'All priorities', options: PRIORITIES },
    { param: 'overdue', label: 'All deadlines', options: [{ value: 'true', label: 'Overdue only' }] },
    { param: 'assignee', label: 'Anyone', load: () => lookups.volunteers().then((d) => d.items.map((v) => ({ value: v._id, label: v.name }))) },
  ],
  columns: [
    { label: 'Task', sort: 'title' },
    { label: 'Status', sort: 'status', badge: true, render: (t) => <Badge value={t.status} /> },
    { label: 'Priority', render: (t) => <Badge value={t.priority} /> },
    { label: 'Due', sort: 'dueDate', render: (t) => (t.dueDate ? <span>{date(t.dueDate)} <DueBadge task={t} /></span> : '—') },
    { label: 'Assigned to', render: (t) => assignee(t).join(', ') || 'Unassigned' },
  ],
  rowActions: (t, { reload }) => <MoveControl task={t} service={tasksService} compact onMoved={() => reload()} />,
  drawerActions: (t, { service, onItem }) => (
    <div className="flex flex-wrap items-center gap-2">
      <DueBadge task={t} />
      <MoveControl task={t} service={service} onMoved={(item) => (item ? onItem(item) : service.get(t._id).then((d) => onItem(d.item)).catch(() => {}))} />
    </div>
  ),
  extraTabs: [{ key: 'comments', label: 'Comments', render: (p) => <CommentsTab {...p} /> }],
  fields: [
    { name: 'title', label: 'Title', required: true, wide: true },
    { name: 'description', label: 'Description', type: 'textarea', wide: true },
    { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, required: true, default: 'medium' },
    { name: 'category', label: 'Category' },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'dueDate', label: 'Due date', type: 'date', validate: (v, all) => !v || !all.startDate || v >= all.startDate || 'The due date cannot be before the start date' },
    { name: 'location', label: 'Location', wide: true },
    { name: 'assignedUser', label: 'Assigned to', type: 'volunteer', permission: 'tasks.assign' },
    { name: 'assignedTeam', label: 'Team members (optional)', type: 'volunteers', permission: 'tasks.assign', wide: true },
  ],
  detailRows: (t) => [
    { label: 'Status', value: STATUSES.find((s) => s.value === t.status)?.label }, { label: 'Priority', value: PRIORITIES.find((p) => p.value === t.priority)?.label },
    { label: 'Due date', value: date(t.dueDate) }, { label: 'Start date', value: date(t.startDate) },
    { label: 'Assigned to', value: t.assignedUser?.name || 'Unassigned' }, { label: 'Team', value: names(t.assignedTeam) },
    { label: 'Category', value: t.category }, { label: 'Location', value: t.location },
    { label: 'Created by', value: t.createdBy?.name }, { label: 'Completed', value: t.completedAt ? fmtDateTime(t.completedAt) : '' },
    { label: 'Description', value: t.description, wide: true },
  ],
};
