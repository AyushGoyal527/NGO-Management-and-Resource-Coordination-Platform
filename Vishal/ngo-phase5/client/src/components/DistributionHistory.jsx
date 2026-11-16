import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, Pagination, Skeleton } from './ui';
import { foodApi } from '../services/foodApi';
import { errorMessage } from '../services/api';
import { fmtDate, num } from '../utils/format';

const unit = (u) => (u === 'litre' ? 'litres' : u || '');

export default function DistributionHistory({ canDelete, isAdmin, refreshKey, onChange }) {
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: null });
  const [state, setState] = useState('loading');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const invalid = !!(range.from && range.to && range.from > range.to);

  const load = useCallback(() => {
    setState('loading');
    foodApi.distributions({ page, limit: 10, from: !invalid && range.from || undefined, to: !invalid && range.to || undefined })
      .then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
  }, [page, range, invalid]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [load, refreshKey]);

  const remove = async () => {
    setBusy(true);
    try {
      await foodApi.removeDistribution(confirm._id);
      toast.success('Deleted. The stock was put back');
      setConfirm(null); onChange?.();
      if (data.items.length === 1 && page > 1) setPage(page - 1); else load();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const itemsText = (d) => d.items.map((i) => `${i.foodItem} ${num(i.quantity)}${i.unit ? ` ${unit(i.unit)}` : ''}`);

  return (
    <div className="card">
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">
        <div><label className="mb-0.5 block text-xs text-slate-500" htmlFor="dist-from">Given out from</label><input id="dist-from" type="date" className="input" value={range.from} max={range.to || undefined} onChange={(e) => { setPage(1); setRange({ ...range, from: e.target.value }); }} /></div>
        <div><label className="mb-0.5 block text-xs text-slate-500" htmlFor="dist-to">to</label><input id="dist-to" type="date" className="input" value={range.to} min={range.from || undefined} onChange={(e) => { setPage(1); setRange({ ...range, to: e.target.value }); }} /></div>
        {(range.from || range.to) && <button className="btn-secondary px-3" onClick={() => { setPage(1); setRange({ from: '', to: '' }); }}>Clear</button>}
      </div>
      {invalid && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">The start date is after the end date, so the range is ignored.</p>}

      {state === 'loading' && <div className="space-y-3 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}
      {state === 'error' && <ErrorState message="Could not load distributions" onRetry={load} />}
      {state === 'ready' && data.items.length === 0 && <EmptyState title="No distributions yet" hint={range.from || range.to ? 'Try a different date range.' : 'Use “Record distribution” when food is given out.'} />}
      {state === 'ready' && data.items.length > 0 && (
        <>
          <ul className="divide-y divide-slate-100">
            {data.items.map((d) => (
              <li key={d._id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{d.location} <span className="font-normal text-slate-500">· {fmtDate(d.date)}</span></p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">{itemsText(d).map((t) => <span key={t} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{t}</span>)}</div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {[d.numberOfBeneficiaries ? `${d.numberOfBeneficiaries} people served` : null, d.assignedVolunteers?.length ? `Volunteers: ${d.assignedVolunteers.map((v) => v.name).join(', ')}` : null, isAdmin && d.manager ? `Manager: ${d.manager.name}` : null].filter(Boolean).join(' · ')}
                  </p>
                  {d.notes && <p className="mt-1 text-sm text-slate-600">{d.notes}</p>}
                </div>
                {canDelete && <button className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Delete distribution at ${d.location}`} title="Delete and put the stock back" onClick={() => setConfirm(d)}><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}

      <ConfirmDialog open={!!confirm} danger busy={busy} title="Delete distribution" confirmLabel="Delete and restore stock" onConfirm={remove} onClose={() => setConfirm(null)}
        message={confirm ? `The record for ${confirm.location} (${fmtDate(confirm.date)}) will be deleted and ${itemsText(confirm).join(', ')} will be added back to stock.` : ''} />
    </div>
  );
}
