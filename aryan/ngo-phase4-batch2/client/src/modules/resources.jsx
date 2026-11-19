import { Badge } from '../components/ui';
import { createResourceService } from '../services/resourceService';
import { fmtDate as date, inr, inrExact, label, localToday, options } from '../utils/format';

const CATEGORIES = [{ value: 'books', label: 'Books' }, { value: 'clothes', label: 'Clothes' }, { value: 'computers', label: 'Computers' }, { value: 'furniture', label: 'Furniture' },
  { value: 'medicalSupplies', label: 'Medical supplies' }, { value: 'vehicles', label: 'Vehicles' }, { value: 'equipment', label: 'Equipment' }, { value: 'stationery', label: 'Stationery' }, { value: 'other', label: 'Other' }];
const CONDITIONS = options(['new', 'good', 'fair', 'poor']);
const STATUSES = [{ value: 'available', label: 'Available' }, { value: 'assigned', label: 'Assigned' }, { value: 'inUse', label: 'In use' }, { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' }, { value: 'maintenance', label: 'Maintenance' }];
const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || label(v);

export default {
  module: 'resources', title: 'Resources', singular: 'Resource', service: createResourceService('/resources'), managerFilter: false, avatar: false, documents: false,
  subtitleText: 'Equipment, supplies and other things your organisation owns.', searchPlaceholder: 'Search by name, location or category',
  defaultSort: 'name', defaultOrder: 'asc',
  subtitle: (r) => categoryLabel(r.category),
  badges: (r) => [r.status],
  filters: [
    { param: 'status', label: 'All statuses', options: STATUSES },
    { param: 'category', label: 'All categories', options: CATEGORIES },
    { param: 'condition', label: 'Any condition', options: CONDITIONS },
    { param: 'person', label: 'Anyone', optionsFrom: 'people' },
  ],
  columns: [
    { label: 'Resource', sort: 'name' },
    { label: 'Quantity', sort: 'quantity', render: (r) => r.quantity },
    { label: 'Condition', render: (r) => label(r.condition) },
    { label: 'Status', sort: 'status', badge: true, render: (r) => <Badge value={r.status} /> },
    { label: 'Assigned to', render: (r) => r.assignedPerson?.name },
    { label: 'Location', render: (r) => r.location },
    { label: 'Value', sort: 'value', render: (r) => (r.value ? inr(r.value) : '—') },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true, default: 'other' },
    { name: 'quantity', label: 'Quantity', type: 'number', min: 0, default: 1 },
    { name: 'condition', label: 'Condition', type: 'select', options: CONDITIONS, required: true, default: 'good' },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, default: 'available' },
    { name: 'assignedPerson', label: 'Assigned to', type: 'person', help: 'Required when the status is Assigned.' },
    { name: 'location', label: 'Location' },
    { name: 'purchaseOrDonationDate', label: 'Purchased or donated on', type: 'date', default: localToday },
    { name: 'value', label: 'Value (₹)', type: 'number', min: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ],
  detailRows: (r) => [
    { label: 'Category', value: categoryLabel(r.category) }, { label: 'Quantity', value: r.quantity },
    { label: 'Condition', value: label(r.condition) }, { label: 'Location', value: r.location },
    { label: 'Assigned to', value: r.assignedPerson ? `${r.assignedPerson.name} (${r.assignedPerson.role})` : '' },
    { label: 'Purchased or donated', value: date(r.purchaseOrDonationDate) }, { label: 'Value', value: r.value ? inrExact(r.value) : '' },
    { label: 'Notes', value: r.notes, wide: true },
  ],
};
