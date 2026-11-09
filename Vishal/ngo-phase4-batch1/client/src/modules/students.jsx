import { useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, EmptyState } from '../components/ui';
import { fmtDate } from '../components/ItemDrawer';
import { createResourceService } from '../services/resourceService';
import { errorMessage } from '../services/api';

const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
const EDU = ['enrolled', 'on-hold', 'completed', 'dropped'].map((v) => ({ value: v, label: v.replace('-', ' ').replace(/^./, (c) => c.toUpperCase()) }));
const today = () => new Date().toISOString().slice(0, 10);

const Progress = ({ value = 0 }) => (
  <div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600" style={{ width: `${value}%` }} /></div><span className="text-xs">{value}%</span></div>
);

function AttendanceTab({ item, service, can, onItem }) {
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const records = item.attendance || [];
  const present = records.filter((a) => a.present).length;

  const mark = async (isPresent) => {
    setBusy(true);
    try { onItem((await service.action(item._id, 'attendance', { date, present: isPresent })).item); toast.success('Attendance saved'); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div className="p-5">
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        {records.length ? <><strong>{Math.round((present / records.length) * 100)}%</strong> attendance · {present} present of {records.length} recorded days</> : 'No attendance recorded yet.'}
      </div>
      {can('edit') && (
        <div className="mb-5 flex flex-wrap items-end gap-2">
          <div><label className="label" htmlFor="att-date">Date</label><input id="att-date" type="date" className="input" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <button className="btn-primary" disabled={busy || !date} onClick={() => mark(true)}>Present</button>
          <button className="btn-secondary" disabled={busy || !date} onClick={() => mark(false)}>Absent</button>
        </div>
      )}
      {records.length ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {records.slice(0, 30).map((a) => (
            <li key={a._id || a.date} className="flex items-center justify-between px-3 py-2 text-sm"><span>{fmtDate(a.date)}</span><span className={a.present ? 'font-medium text-emerald-700' : 'font-medium text-red-600'}>{a.present ? 'Present' : 'Absent'}</span></li>
          ))}
        </ul>
      ) : <EmptyState title="Nothing to show" hint="Mark a day above to start tracking." />}
    </div>
  );
}

export default {
  module: 'students', title: 'Students', singular: 'Student', service: createResourceService('/students'), archive: true,
  subtitleText: 'Children and young people in your education programs.', searchPlaceholder: 'Search by name, school or class', photoField: 'photo',
  defaultSort: 'name', defaultOrder: 'asc',
  subtitle: (s) => [s.school, s.class && `Class ${s.class}`].filter(Boolean).join(' · '),
  badges: (s) => [s.educationStatus],
  filters: [{ param: 'educationStatus', label: 'All education statuses', options: EDU }, { param: 'program', label: 'All programs', optionsFrom: 'programs' }],
  columns: [
    { label: 'Name', sort: 'name' },
    { label: 'Class', sort: 'class', render: (s) => s.class },
    { label: 'Status', badge: true, render: (s) => <Badge value={s.educationStatus} /> },
    { label: 'Progress', sort: 'educationProgress', render: (s) => <Progress value={s.educationProgress} /> },
    { label: 'Program', render: (s) => s.program?.name },
    { label: 'Manager', adminOnly: true, render: (s) => s.assignedManager?.name },
  ],
  fields: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'gender', label: 'Gender', type: 'select', options: GENDERS },
    { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { name: 'age', label: 'Age', type: 'number', min: 1, max: 120 },
    { name: 'school', label: 'School' },
    { name: 'class', label: 'Class' },
    { name: 'educationStatus', label: 'Education status', type: 'select', options: EDU, required: true, default: 'enrolled' },
    { name: 'educationProgress', label: 'Education progress (%)', type: 'number', min: 0, max: 100, default: 0 },
    { name: 'program', label: 'Program', type: 'program' },
    { name: 'assignedManager', label: 'Assigned manager', type: 'manager' },
    { name: 'parentGuardian.name', label: 'Parent / guardian name' },
    { name: 'parentGuardian.relation', label: 'Relationship' },
    { name: 'parentGuardian.phone', label: 'Parent / guardian phone', type: 'tel' },
    { name: 'contact', label: 'Contact number', type: 'tel' },
    { name: 'address', label: 'Address', type: 'textarea', wide: true },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ],
  detailRows: (s) => [
    { label: 'Gender', value: s.gender }, { label: 'Age', value: s.age }, { label: 'Date of birth', value: fmtDate(s.dateOfBirth) },
    { label: 'School', value: s.school }, { label: 'Class', value: s.class }, { label: 'Program', value: s.program?.name },
    { label: 'Education progress', value: s.educationProgress !== undefined ? `${s.educationProgress}%` : '' }, { label: 'Manager', value: s.assignedManager?.name },
    { label: 'Parent / guardian', value: s.parentGuardian ? [s.parentGuardian.name, s.parentGuardian.relation && `(${s.parentGuardian.relation})`, s.parentGuardian.phone].filter(Boolean).join(' ') : '', wide: true },
    { label: 'Contact', value: s.contact }, { label: 'Address', value: s.address, wide: true }, { label: 'Notes', value: s.notes, wide: true },
  ],
  extraTabs: [{ key: 'attendance', label: 'Attendance', render: (props) => <AttendanceTab {...props} /> }],
};
