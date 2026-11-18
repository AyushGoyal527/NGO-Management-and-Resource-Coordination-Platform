import { Badge } from '../components/ui';
import { createResourceService } from '../services/resourceService';
import { fmtDate, label } from '../utils/format';

const AUDIENCES = [{ value: 'all', label: 'Everyone' }, { value: 'managers', label: 'Managers' }, { value: 'volunteers', label: 'Volunteers' }];
const audienceLabel = (v) => AUDIENCES.find((a) => a.value === v)?.label || label(v);
const expired = (a) => a.expiresAt && new Date(a.expiresAt) < new Date();

export default {
  module: 'announcements', title: 'Announcements', singular: 'Announcement', service: createResourceService('/announcements'), nameOf: (a) => a.title,
  subtitleText: 'Short notices that appear on dashboards. People are also notified when you post one.', searchPlaceholder: 'Search by title or message',
  avatar: false, documents: false, defaultSort: 'createdAt', defaultOrder: 'desc',
  subtitle: (a) => `For ${audienceLabel(a.audience).toLowerCase()}${expired(a) ? ' · expired' : ''}`,
  filters: [{ param: 'audience', label: 'Any audience', options: AUDIENCES }],
  columns: [
    { label: 'Title', sort: 'title' },
    { label: 'For', sort: 'audience', render: (a) => <Badge value={audienceLabel(a.audience)} /> },
    { label: 'Posted by', render: (a) => a.createdBy?.name },
    { label: 'Posted', sort: 'createdAt', render: (a) => fmtDate(a.createdAt) },
    { label: 'Expires', sort: 'expiresAt', render: (a) => (a.expiresAt ? `${fmtDate(a.expiresAt)}${expired(a) ? ' (expired)' : ''}` : 'Never') },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, wide: true },
    { name: 'message', label: 'Message', type: 'textarea', required: true, wide: true },
    { name: 'audience', label: 'Who should see it', type: 'select', options: AUDIENCES, default: 'all', required: true, adminOnly: true, help: 'Managers post to volunteers.' },
    { name: 'expiresAt', label: 'Hide after (optional)', type: 'date', help: 'Pick a future date. Leave empty to keep it until you delete it.' },
  ],
  deleteMessage: (a) => `"${a.title}" will be removed from every dashboard.`,
  detailRows: (a) => [
    { label: 'For', value: audienceLabel(a.audience) }, { label: 'Posted by', value: a.createdBy?.name },
    { label: 'Posted', value: fmtDate(a.createdAt) }, { label: 'Expires', value: a.expiresAt ? fmtDate(a.expiresAt) : 'Never' },
    { label: 'Message', value: a.message, wide: true },
  ],
};
