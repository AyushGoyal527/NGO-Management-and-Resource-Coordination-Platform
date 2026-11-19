import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, PackageMinus } from 'lucide-react';
import { foodApi } from '../services/foodApi';
import { expiryText } from '../modules/foodInventory';
import { fmtDate, num } from '../utils/format';

const SHOW = 5;
const unit = (u) => (u === 'litre' ? 'litres' : u);

function Group({ icon: Icon, tone, title, items, line }) {
  if (!items.length) return null;
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" />{title} ({items.length})</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.slice(0, SHOW).map((f) => <li key={f._id}>{line(f)}</li>)}
        {items.length > SHOW && <li className="opacity-80">and {items.length - SHOW} more. Use the stock filter below to see them all.</li>}
      </ul>
    </div>
  );
}

// Low stock, expiring soon and expired items. Reloads whenever stock changes.
export default function FoodAlerts({ version }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); foodApi.alerts().then(setData).catch(() => setError(true)); }, [version]);

  if (error) return <p className="mb-4 text-sm text-slate-500">Stock alerts could not be loaded right now.</p>;
  if (!data) return null;
  if (data.total === 0) return <p className="mb-4 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />No low stock or expiry alerts.</p>;

  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3" aria-label="Stock alerts">
      <Group icon={AlertTriangle} tone="border-red-200 bg-red-50 text-red-900" title="Expired, still in stock" items={data.expired}
        line={(f) => `${f.foodItem}: ${num(f.remainingQuantity)} ${unit(f.unit)} left, ${expiryText(f).toLowerCase()}`} />
      <Group icon={Clock} tone="border-amber-200 bg-amber-50 text-amber-900" title="Expiring soon" items={data.expiring}
        line={(f) => `${f.foodItem}: ${fmtDate(f.expiryDate)} (${expiryText(f).toLowerCase()})`} />
      <Group icon={PackageMinus} tone="border-amber-200 bg-amber-50 text-amber-900" title="Running low" items={data.lowStock}
        line={(f) => `${f.foodItem}: ${num(f.remainingQuantity)} ${unit(f.unit)} left (alert at ${num(f.lowStockThreshold)})`} />
    </div>
  );
}
