import { Badge } from '../components/ui';
import { eventsService } from '../services/taskApi';
import { fmtDate as date, options } from '../utils/format';

const STATUSES = options(['upcoming', 'ongoing', 'completed', 'cancelled']);
const time = (e) => [e.startTime, e.endTime].filter(Boolean).join(' – ');
const names = (list) => (list || []).map((x) => x.name).join(', ');
const count = (list, one) => (list?.length ? `${list.length} ${one}${list.length === 1 ? '' : 's'}` : '');

export default {
  module: 'events', title: 'Events', singular: 'Event', service: eventsService, managerFilter: true, avatar: false,
  subtitleText: 'Camps, drives and community days, with the volunteers assigned to each.', searchPlaceholder: 'Search by name, location or type',
  defaultSort: 'date', defaultOrder: 'asc', dateRange: { label: 'Date' },
  subtitle: (e) => e.program?.name || e.programType,
  badges: (e) => [e.status],
  filters: [
    { param: 'status', label: 'All statuses', options: STATUSES },
    { param: 'when', label: 'Past and upcoming', options: [{ value: 'upcoming', label: 'Today and later' }, { value: 'past', label: 'Past only' }] },
    { param: 'program', label: 'All programs', optionsFrom: 'programs' },
  ],
  columns: [
    { label: 'Event', sort: 'name' },
    { label: 'Date', sort: 'date', render: (e) => <span>{date(e.date)}{time(e) && <span className="block text-xs text-slate-400">{time(e)}</span>}</span> },
    { label: 'Location', sort: 'location', render: (e) => e.location },
    { label: 'Status', sort: 'status', badge: true, render: (e) => <Badge value={e.status} /> },
    { label: 'Volunteers', render: (e) => e.assignedVolunteers?.length || 0 },
    { label: 'Manager', adminOnly: true, render: (e) => e.manager?.name },
  ],
  fields: [
    { name: 'name', label: 'Event name', required: true, wide: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, default: 'upcoming' },
    { name: 'startTime', label: 'Start time', type: 'time' },
    { name: 'endTime', label: 'End time', type: 'time', validate: (v, all) => !v || !all.startTime || v > all.startTime || 'The end time must be after the start time' },
    { name: 'location', label: 'Location', wide: true },
    { name: 'program', label: 'Program', type: 'program' },
    { name: 'programType', label: 'Type (for example Medical camp)' },
    { name: 'manager', label: 'Manager', type: 'manager' },
    { name: 'assignedVolunteers', label: 'Volunteers', type: 'volunteers', wide: true },
    { name: 'isPublic', label: 'Show on the public website', type: 'checkbox', checkboxLabel: 'Show on the public website', default: true, wide: true },
    { name: 'description', label: 'Description', type: 'textarea', wide: true },
  ],
  detailRows: (e) => [
    { label: 'Date', value: date(e.date) }, { label: 'Time', value: time(e) }, { label: 'Location', value: e.location },
    { label: 'Program', value: e.program?.name }, { label: 'Type', value: e.programType },
    { label: 'Manager', value: e.manager?.name }, { label: 'Organised by', value: e.organizer?.name },
    { label: 'Volunteers', value: names(e.assignedVolunteers) || 'None assigned yet', wide: true },
    { label: 'Beneficiaries', value: count(e.beneficiaries, 'beneficiary').replace('beneficiarys', 'beneficiaries') },
    { label: 'Students', value: count(e.students, 'student') }, { label: 'Resources needed', value: names(e.requiredResources) },
    { label: 'On the public website', value: e.isPublic ? 'Yes' : 'No' },
    { label: 'Description', value: e.description, wide: true },
  ],
};
