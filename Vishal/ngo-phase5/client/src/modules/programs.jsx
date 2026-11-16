import { useEffect, useState } from 'react';
import { Badge, ErrorState, Skeleton } from '../components/ui';
import { programsService } from '../services/taskApi';
import { fmtDate as date, inr, inrExact, label, options } from '../utils/format';

const TYPES = [{ value: 'food-distribution', label: 'Food distribution' }, { value: 'education', label: 'Education' }, { value: 'medical', label: 'Medical' },
  { value: 'donation-drive', label: 'Donation drive' }, { value: 'community-event', label: 'Community event' }, { value: 'other', label: 'Other' }];
const STATUSES = options(['planned', 'active', 'completed', 'paused']);
const typeLabel = (v) => TYPES.find((t) => t.value === v)?.label || label(v);
const period = (p) => [date(p.startDate), date(p.endDate)].filter(Boolean).join(' – ');

// How much work is linked to a program: events, students and beneficiaries.
function Overview({ item, service }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { setData(null); setError(false); service.summary(item._id).then((d) => setData(d.summary)).catch(() => setError(true)); }, [service, item._id]);
  if (error) return <ErrorState message="Could not load the overview" />;
  if (!data) return <div className="grid grid-cols-2 gap-3 p-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  const tiles = [['Events', data.events], ['Upcoming events', data.upcomingEvents], ['Students', data.students], ['Beneficiaries', data.beneficiaries]];
  return (
    <dl className="grid grid-cols-2 gap-3 p-5">
      {tiles.map(([k, v]) => <div key={k} className="rounded-lg border border-slate-200 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt><dd className="mt-1 text-2xl font-semibold text-slate-900">{v}</dd></div>)}
    </dl>
  );
}

export default {
  module: 'programs', title: 'Programs', singular: 'Program', service: programsService, managerFilter: true, avatar: false, documents: false,
  subtitleText: 'The long-running work your organisation does. Events, students and beneficiaries link to a program.',
  searchPlaceholder: 'Search by name, location or description', defaultSort: 'name', defaultOrder: 'asc',
  subtitle: (p) => typeLabel(p.type),
  badges: (p) => [p.status],
  filters: [{ param: 'status', label: 'All statuses', options: STATUSES }, { param: 'type', label: 'All types', options: TYPES }],
  columns: [
    { label: 'Program', sort: 'name' },
    { label: 'Status', sort: 'status', badge: true, render: (p) => <Badge value={p.status} /> },
    { label: 'Dates', sort: 'startDate', render: (p) => period(p) || '—' },
    { label: 'Location', render: (p) => p.location },
    { label: 'Budget', sort: 'budget', render: (p) => (p.budget ? inr(p.budget) : '—') },
    { label: 'Manager', adminOnly: true, render: (p) => p.manager?.name },
  ],
  extraTabs: [{ key: 'overview', label: 'Overview', render: ({ item, service }) => <Overview item={item} service={service} /> }],
  fields: [
    { name: 'name', label: 'Program name', required: true, wide: true },
    { name: 'type', label: 'Type', type: 'select', options: TYPES, required: true, default: 'other' },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, default: 'planned' },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'endDate', label: 'End date', type: 'date', validate: (v, all) => !v || !all.startDate || v >= all.startDate || 'The end date cannot be before the start date' },
    { name: 'location', label: 'Location' },
    { name: 'budget', label: 'Budget (₹)', type: 'number', min: 0 },
    { name: 'manager', label: 'Manager', type: 'manager' },
    { name: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  deleteMessage: (p) => `${p.name} will be deleted. Programs that students, beneficiaries or events still use cannot be deleted; mark them as completed instead.`,
  detailRows: (p) => [
    { label: 'Type', value: typeLabel(p.type) }, { label: 'Status', value: label(p.status) }, { label: 'Dates', value: period(p) },
    { label: 'Location', value: p.location }, { label: 'Budget', value: p.budget ? inrExact(p.budget) : '' }, { label: 'Manager', value: p.manager?.name },
    { label: 'Description', value: p.description, wide: true },
  ],
};
