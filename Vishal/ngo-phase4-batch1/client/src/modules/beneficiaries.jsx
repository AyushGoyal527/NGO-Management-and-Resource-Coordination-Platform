import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Badge, EmptyState, Spinner } from '../components/ui';
import { fmtDate } from '../components/ItemDrawer';
import { createResourceService } from '../services/resourceService';
import { errorMessage } from '../services/api';

const GENDERS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
const CATEGORIES = [{ value: 'below-poverty-line', label: 'Below poverty line' }, { value: 'low-income', label: 'Low income' }, { value: 'middle-income', label: 'Middle income' }, { value: 'other', label: 'Other' }];
const STATUSES = ['active', 'inactive', 'archived'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
const label = (list, v) => list.find((o) => o.value === v)?.label || v;

function AssistanceTab({ item, service, can, onItem }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { type: '', date: new Date().toISOString().slice(0, 10), notes: '' } });
  const history = item.assistanceProvided || [];

  const onSubmit = async (v) => {
    try { onItem((await service.action(item._id, 'assistance', v)).item); toast.success('Assistance recorded'); reset({ type: '', date: v.date, notes: '' }); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="p-5">
      {item.assistanceRequired?.length > 0 && <p className="mb-4 text-sm text-slate-600"><span className="font-medium text-slate-800">Needs:</span> {item.assistanceRequired.join(', ')}</p>}
      {can('edit') && (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-5 space-y-3 rounded-lg bg-slate-50 p-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="as-type">What was given</label><input id="as-type" className="input" placeholder="Ration kit, medicine…" {...register('type', { required: 'Describe the assistance' })} />{errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}</div>
            <div><label className="label" htmlFor="as-date">Date</label><input id="as-date" type="date" className="input" {...register('date')} /></div>
          </div>
          <div><label className="label" htmlFor="as-notes">Notes (optional)</label><input id="as-notes" className="input" {...register('notes')} /></div>
          <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Record assistance</button>
        </form>
      )}
      {history.length ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {history.map((h, i) => (
            <li key={h._id || i} className="px-3 py-2.5 text-sm"><div className="flex justify-between gap-3"><span className="font-medium text-slate-800">{h.type}</span><span className="shrink-0 text-xs text-slate-500">{fmtDate(h.date)}</span></div>{h.notes && <p className="text-xs text-slate-500">{h.notes}</p>}</li>
          ))}
        </ul>
      ) : <EmptyState title="No assistance recorded" hint="Record each time you help this person." />}
    </div>
  );
}

export default {
  module: 'beneficiaries', title: 'Beneficiaries', singular: 'Beneficiary', service: createResourceService('/beneficiaries'), archive: true,
  subtitleText: 'People and families your NGO supports.', searchPlaceholder: 'Search by name, contact or address', photoField: 'photo',
  defaultSort: 'name', defaultOrder: 'asc',
  subtitle: (b) => [b.age && `${b.age} yrs`, b.gender].filter(Boolean).join(' · '),
  badges: (b) => [b.status],
  filters: [
    { param: 'status', label: 'All except archived', options: STATUSES },
    { param: 'economicCategory', label: 'All categories', options: CATEGORIES },
    { param: 'program', label: 'All programs', optionsFrom: 'programs' },
  ],
  columns: [
    { label: 'Name', sort: 'name' },
    { label: 'Contact', render: (b) => b.contact },
    { label: 'Status', badge: true, render: (b) => <Badge value={b.status} /> },
    { label: 'Family size', sort: 'familySize', render: (b) => b.familySize },
    { label: 'Category', render: (b) => label(CATEGORIES, b.economicCategory) },
    { label: 'Program', render: (b) => b.assignedProgram?.name },
    { label: 'Manager', adminOnly: true, render: (b) => b.assignedManager?.name },
  ],
  fields: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'age', label: 'Age', type: 'number', min: 0, max: 120 },
    { name: 'gender', label: 'Gender', type: 'select', options: GENDERS },
    { name: 'contact', label: 'Contact number', type: 'tel' },
    { name: 'familySize', label: 'Family size', type: 'number', min: 1 },
    { name: 'economicCategory', label: 'Economic category', type: 'select', options: CATEGORIES },
    { name: 'assistanceRequired', label: 'Assistance required', type: 'tags', placeholder: 'food, medicine, education support', wide: true, help: 'Separate with commas.' },
    { name: 'assignedProgram', label: 'Program', type: 'program' },
    { name: 'assignedManager', label: 'Assigned manager', type: 'manager' },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, default: 'active' },
    { name: 'address', label: 'Address', type: 'textarea', wide: true },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ],
  detailRows: (b) => [
    { label: 'Age', value: b.age }, { label: 'Gender', value: b.gender }, { label: 'Contact', value: b.contact }, { label: 'Family size', value: b.familySize },
    { label: 'Economic category', value: label(CATEGORIES, b.economicCategory) }, { label: 'Program', value: b.assignedProgram?.name },
    { label: 'Manager', value: b.assignedManager?.name }, { label: 'Needs', value: b.assistanceRequired?.join(', '), wide: true },
    { label: 'Address', value: b.address, wide: true }, { label: 'Notes', value: b.notes, wide: true },
  ],
  extraTabs: [{ key: 'assistance', label: 'Assistance', render: (props) => <AssistanceTab {...props} /> }],
};
