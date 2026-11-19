import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Skeleton, Spinner } from './ui';
import { Field } from '../pages/auth/AuthShell';
import { lookups } from '../services/resourceService';
import { errorMessage } from '../services/api';

const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => {
  const keys = p.split('.');
  keys.slice(0, -1).reduce((a, k) => (a[k] = a[k] || {}), o)[keys[keys.length - 1]] = v;
};

function toForm(fields, item, isAdmin) {
  const out = {};
  fields.forEach((f) => {
    if (f.type === 'manager' && !isAdmin) return;
    let v = item ? getPath(item, f.name) : undefined;
    if (f.type === 'date' && v) v = String(v).slice(0, 10);
    if (f.type === 'tags') v = Array.isArray(v) ? v.join(', ') : '';
    if (f.type === 'manager' || f.type === 'program' || f.type === 'person') v = v?._id || v || '';
    if (v === undefined || v === null) v = item ? '' : (typeof f.default === 'function' ? f.default() : (f.default ?? ''));
    setPath(out, f.name, v);
  });
  return out;
}

function toPayload(fields, values, isAdmin) {
  const out = {};
  fields.forEach((f) => {
    if (f.type === 'manager' && !isAdmin) return;
    let v = getPath(values, f.name);
    if (f.type === 'tags') v = (v || '').split(',').map((x) => x.trim()).filter(Boolean);
    setPath(out, f.name, v);
  });
  return out;
}

export default function ResourceForm({ config, item, isAdmin, onClose, onSaved }) {
  const [options, setOptions] = useState(null); // lookups must be loaded before selects render, or defaults would not match
  const [error, setError] = useState('');
  const fields = config.fields.filter((f) => f.type !== 'manager' || isAdmin);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: toForm(config.fields, item, isAdmin) });

  useEffect(() => {
    let live = true;
    Promise.all([
      isAdmin ? lookups.managers().then((d) => d.items).catch(() => []) : [],
      fields.some((f) => f.type === 'program') ? lookups.programs().then((d) => d.items).catch(() => []) : [],
      fields.some((f) => f.type === 'person') ? lookups.people().then((d) => d.items).catch(() => []) : [],
    ]).then(([managers, programs, people]) => { if (live) { setOptions({ manager: managers, program: programs, person: people }); reset(toForm(config.fields, item, isAdmin)); } });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values) => {
    setError('');
    try {
      const payload = toPayload(config.fields, values, isAdmin);
      if (item) await config.service.update(item._id, payload); else await config.service.create(payload);
      toast.success(`${config.singular} ${item ? 'updated' : 'created'}`);
      onSaved();
    } catch (e) { setError(errorMessage(e)); }
  };

  if (!options) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  const input = (f) => {
    const common = { className: 'input', ...register(f.name, f.required ? { required: `${f.label} is required` } : {}) };
    if (f.type === 'textarea') return <textarea rows={3} {...common} />;
    if (f.type === 'select') return (<select {...common}>{!f.required && <option value="">Not set</option>}{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>);
    if (f.type === 'manager' || f.type === 'program' || f.type === 'person') {
      return (<select {...common}><option value="">{f.type === 'manager' || f.type === 'person' ? 'Unassigned' : 'None'}</option>{options[f.type].map((o) => <option key={o._id} value={o._id}>{o.name}{o.role ? ` (${o.role})` : ''}</option>)}</select>);
    }
    const type = { number: 'number', date: 'date', email: 'email', tel: 'tel' }[f.type] || 'text';
    return <input type={type} min={f.min} max={f.max} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} {...common} />;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.wide ? 'sm:col-span-2' : ''}>
            <Field label={f.label} error={getPath(errors, f.name)?.message}>{input(f)}</Field>
            {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}{item ? 'Save changes' : `Add ${config.singular.toLowerCase()}`}</button>
      </div>
    </form>
  );
}
