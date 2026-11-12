import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { ErrorState, Skeleton, Spinner } from './ui';
import { Field } from '../pages/auth/AuthShell';
import { foodApi } from '../services/foodApi';
import { lookups } from '../services/resourceService';
import { errorMessage } from '../services/api';
import { localToday, num } from '../utils/format';

const unit = (u) => (u === 'litre' ? 'litres' : u);

// Record food handed out. The server takes it off the stock in one step, so two people cannot give out the same food.
export default function DistributionForm({ isAdmin, onClose, onSaved }) {
  const [stock, setStock] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { date: localToday(), location: '', numberOfBeneficiaries: '', items: [{ inventory: '', quantity: '' }], assignedVolunteers: [], manager: '', notes: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const chosen = watch('items');

  useEffect(() => {
    foodApi.available().then((d) => setStock(d.items)).catch(() => setLoadError(true));
    lookups.volunteers().then((d) => setVolunteers(d.items)).catch(() => {});
    if (isAdmin) lookups.managers().then((d) => setManagers(d.items)).catch(() => {});
  }, [isAdmin]);

  const byId = Object.fromEntries((stock || []).map((s) => [s._id, s]));

  const onSubmit = async (v) => {
    setError('');
    const payload = {
      date: v.date || undefined, location: v.location, notes: v.notes || undefined,
      numberOfBeneficiaries: v.numberOfBeneficiaries === '' ? undefined : Number(v.numberOfBeneficiaries),
      items: v.items.map((i) => ({ inventory: i.inventory, quantity: Number(i.quantity) })),
      assignedVolunteers: v.assignedVolunteers || [], manager: isAdmin && v.manager ? v.manager : undefined,
    };
    try { await foodApi.distribute(payload); toast.success('Distribution recorded and stock updated'); onSaved(); } catch (e) { setError(errorMessage(e)); }
  };

  if (loadError) return <ErrorState message="Could not load the available stock" />;
  if (!stock) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (stock.length === 0) return (
    <div className="py-6 text-center text-sm text-slate-600">
      <p className="font-medium text-slate-800">Nothing is available to distribute</p>
      <p className="mt-1">Everything is used up or expired. Add stock first.</p>
      <button className="btn-secondary mt-4" onClick={onClose}>Close</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" error={errors.date?.message}><input type="date" className="input" max={localToday()} {...register('date', { required: 'Date is required' })} /></Field>
        <Field label="Location" error={errors.location?.message}><input className="input" placeholder="Where was it given out?" {...register('location', { required: 'Location is required' })} /></Field>
        <Field label="People served (optional)" error={errors.numberOfBeneficiaries?.message}>
          <input type="number" min="0" step="1" className="input" {...register('numberOfBeneficiaries', { validate: (v) => v === '' || Number.isInteger(Number(v)) && Number(v) >= 0 || 'Enter a whole number' })} />
        </Field>
        {isAdmin && <Field label="Manager"><select className="input" {...register('manager')}><option value="">Me</option>{managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select></Field>}
      </div>

      <fieldset className="mt-5">
        <legend className="label">Food given out</legend>
        <div className="space-y-2">
          {fields.map((f, i) => {
            const selected = byId[chosen?.[i]?.inventory];
            return (
              <div key={f.id} className="grid grid-cols-[1fr_110px_auto] items-start gap-2">
                <div>
                  <select aria-label={`Food item ${i + 1}`} className="input" {...register(`items.${i}.inventory`, { required: 'Choose a food item' })}>
                    <option value="">Choose item…</option>
                    {stock.map((s) => <option key={s._id} value={s._id} disabled={chosen?.some((c, j) => j !== i && c.inventory === s._id)}>{s.foodItem} ({num(s.remainingQuantity)} {unit(s.unit)} left)</option>)}
                  </select>
                  {errors.items?.[i]?.inventory && <p className="mt-1 text-xs text-red-600">{errors.items[i].inventory.message}</p>}
                </div>
                <div>
                  <input aria-label={`Quantity ${i + 1}`} type="number" step="any" min="0" placeholder={selected ? unit(selected.unit) : 'Qty'} className="input"
                    {...register(`items.${i}.quantity`, {
                      required: 'Enter quantity',
                      validate: (v) => {
                        if (!(Number(v) > 0)) return 'Must be above zero';
                        if (selected && Number(v) > selected.remainingQuantity) return `Only ${num(selected.remainingQuantity)} left`;
                        return true;
                      },
                    })} />
                  {errors.items?.[i]?.quantity && <p className="mt-1 text-xs text-red-600">{errors.items[i].quantity.message}</p>}
                </div>
                <button type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label={`Remove item ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}><X className="h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
        {fields.length < stock.length && <button type="button" className="btn-secondary mt-2 px-3 py-1.5" onClick={() => append({ inventory: '', quantity: '' })}><Plus className="h-4 w-4" />Add another item</button>}
      </fieldset>

      {volunteers.length > 0 && (
        <fieldset className="mt-5">
          <legend className="label">Volunteers who helped (optional)</legend>
          <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
            {volunteers.map((v) => <label key={v._id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"><input type="checkbox" value={v._id} className="h-4 w-4 accent-brand-600" {...register('assignedVolunteers')} />{v.name}</label>)}
          </div>
        </fieldset>
      )}

      <div className="mt-5"><Field label="Notes (optional)"><textarea rows={2} className="input" {...register('notes')} /></Field></div>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Record distribution</button>
      </div>
    </form>
  );
}
