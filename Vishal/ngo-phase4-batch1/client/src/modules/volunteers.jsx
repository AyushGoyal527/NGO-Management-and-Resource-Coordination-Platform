import { Badge } from '../components/ui';
import { fmtDate } from '../components/ItemDrawer';
import { createResourceService } from '../services/resourceService';

const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
const STATUSES = ['active', 'pending', 'inactive', 'suspended'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

export default {
  module: 'volunteers', title: 'Volunteers', singular: 'Volunteer', service: createResourceService('/volunteers'),
  subtitleText: 'People who give their time to your programs.', searchPlaceholder: 'Search by name, email, phone or skill', photoField: 'profilePhoto',
  defaultSort: 'name', defaultOrder: 'asc',
  subtitle: (v) => v.email || v.phone,
  badges: (v) => [v.status],
  filters: [{ param: 'status', label: 'All statuses', options: STATUSES }, { param: 'gender', label: 'Any gender', options: GENDERS }],
  columns: [
    { label: 'Name', sort: 'name' },
    { label: 'Phone', render: (v) => v.phone },
    { label: 'Status', sort: 'status', badge: true, render: (v) => <Badge value={v.status} /> },
    { label: 'Hours', sort: 'volunteerHours', render: (v) => v.volunteerHours },
    { label: 'Manager', adminOnly: true, render: (v) => v.assignedManager?.name },
    { label: 'Joined', sort: 'joiningDate', render: (v) => fmtDate(v.joiningDate) },
  ],
  fields: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Email', type: 'email', help: 'Matching a volunteer login email links this profile to their account.' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'gender', label: 'Gender', type: 'select', options: GENDERS },
    { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { name: 'joiningDate', label: 'Joining date', type: 'date' },
    { name: 'address', label: 'Address', type: 'textarea', wide: true },
    { name: 'skills', label: 'Skills', type: 'tags', placeholder: 'teaching, cooking, driving', wide: true, help: 'Separate with commas.' },
    { name: 'availability', label: 'Availability', placeholder: 'Weekends, evenings…' },
    { name: 'volunteerHours', label: 'Volunteer hours', type: 'number', min: 0 },
    { name: 'emergencyContact.name', label: 'Emergency contact name' },
    { name: 'emergencyContact.phone', label: 'Emergency contact phone', type: 'tel' },
    { name: 'emergencyContact.relation', label: 'Relationship' },
    { name: 'assignedManager', label: 'Assigned manager', type: 'manager' },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, default: 'active' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ],
  detailRows: (v) => [
    { label: 'Email', value: v.email }, { label: 'Phone', value: v.phone },
    { label: 'Gender', value: v.gender }, { label: 'Date of birth', value: fmtDate(v.dateOfBirth) },
    { label: 'Joined', value: fmtDate(v.joiningDate) }, { label: 'Volunteer hours', value: v.volunteerHours },
    { label: 'Manager', value: v.assignedManager?.name }, { label: 'Availability', value: v.availability },
    { label: 'Skills', value: v.skills?.join(', '), wide: true }, { label: 'Address', value: v.address, wide: true },
    { label: 'Emergency contact', value: v.emergencyContact ? [v.emergencyContact.name, v.emergencyContact.relation && `(${v.emergencyContact.relation})`, v.emergencyContact.phone].filter(Boolean).join(' ') : '', wide: true },
    { label: 'Notes', value: v.notes, wide: true },
  ],
};
