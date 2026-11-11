import { Badge } from '../components/ui';
import { foodApi } from '../services/foodApi';
import { fmtDate, label, localToday, num, options } from '../utils/format';

const UNITS = [{ value: 'kg', label: 'kg' }, { value: 'g', label: 'g' }, { value: 'litre', label: 'litres' }, { value: 'packets', label: 'packets' }, { value: 'boxes', label: 'boxes' }, { value: 'pieces', label: 'pieces' }];
const unitLabel = (u) => UNITS.find((x) => x.value === u)?.label || u;
const DAY = 24 * 60 * 60 * 1000;

// Same rules as the server: an expiry date is good through the end of that day; "soon" means within 14 days.
export const stockState = (f) => (f.remainingQuantity <= 0 ? 'out of stock' : f.remainingQuantity <= f.lowStockThreshold ? 'low stock' : 'in stock');
export const daysLeft = (f) => (f.expiryDate ? Math.floor((new Date(f.expiryDate).getTime() + DAY - Date.now()) / DAY) : null);
export const expiryState = (f) => {
  const d = daysLeft(f);
  if (d === null || f.remainingQuantity <= 0) return null;
  return d < 0 ? 'expired' : d <= 14 ? 'expiring soon' : null;
};
export const expiryText = (f) => {
  const d = daysLeft(f);
  if (d === null) return '';
  if (d < 0) return `Expired ${-d} ${-d === 1 ? 'day' : 'days'} ago`;
  if (d === 0) return 'Expires today';
  return `${d} ${d === 1 ? 'day' : 'days'} left`;
};

const StockBar = ({ f }) => {
  const pct = f.quantity ? Math.max(0, Math.min(100, (f.remainingQuantity / f.quantity) * 100)) : 0;
  const color = stockState(f) === 'in stock' ? 'bg-brand-600' : stockState(f) === 'low stock' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="min-w-[140px]">
      <p className="text-slate-800"><span className="font-medium">{num(f.remainingQuantity)}</span> <span className="text-slate-500">of {num(f.quantity)} {unitLabel(f.unit)}</span></p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
};

export default {
  module: 'food', title: 'Food items', singular: 'Food item', service: foodApi, managerFilter: false, avatar: false, documents: false,
  searchPlaceholder: 'Search by item, source or storage location', defaultSort: 'expiryDate', defaultOrder: 'asc',
  nameOf: (f) => f.foodItem,
  subtitle: (f) => [f.source, f.storageLocation].filter(Boolean).join(' · '),
  badges: (f) => [stockState(f), expiryState(f)].filter(Boolean),
  rowClass: (f) => (expiryState(f) === 'expired' ? 'bg-red-50/50' : ''),
  deleteMessage: (f) => `${f.foodItem} will be removed from stock. Past distributions keep their record of it.`,
  filters: [
    { param: 'alert', label: 'All stock', options: [{ value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }, { value: 'expiring', label: 'Expiring soon' }, { value: 'expired', label: 'Expired' }] },
    { param: 'unit', label: 'Any unit', options: UNITS },
  ],
  columns: [
    { label: 'Item', sort: 'foodItem' },
    { label: 'Stock', sort: 'remainingQuantity', render: (f) => <StockBar f={f} /> },
    { label: 'Status', badge: true, render: (f) => <span className="flex flex-wrap gap-1"><Badge value={stockState(f)} />{expiryState(f) && <Badge value={expiryState(f)} />}</span> },
    { label: 'Expiry', sort: 'expiryDate', render: (f) => (f.expiryDate ? <span><span className="block">{fmtDate(f.expiryDate)}</span><span className="text-xs text-slate-500">{f.remainingQuantity > 0 ? expiryText(f) : ''}</span></span> : '—') },
    { label: 'Received', sort: 'receivedDate', render: (f) => fmtDate(f.receivedDate) },
  ],
  fields: [
    { name: 'foodItem', label: 'Food item', required: true },
    { name: 'unit', label: 'Unit', type: 'select', options: UNITS, required: true, default: 'kg' },
    { name: 'quantity', label: 'Quantity received', type: 'number', min: 0, required: true, help: 'Total received. Remaining stock is worked out automatically.' },
    { name: 'lowStockThreshold', label: 'Low stock alert at', type: 'number', min: 0, default: 10, help: 'You get an alert when the remaining amount falls to this level.' },
    { name: 'expiryDate', label: 'Expiry date', type: 'date' },
    { name: 'receivedDate', label: 'Received on', type: 'date', default: localToday },
    { name: 'source', label: 'Source', placeholder: 'Donation, market, supplier…' },
    { name: 'storageLocation', label: 'Storage location' },
  ],
  detailRows: (f) => [
    { label: 'Received', value: `${num(f.quantity)} ${unitLabel(f.unit)}` }, { label: 'Distributed', value: `${num(f.distributedQuantity)} ${unitLabel(f.unit)}` },
    { label: 'Remaining', value: `${num(f.remainingQuantity)} ${unitLabel(f.unit)}` }, { label: 'Low stock alert at', value: `${num(f.lowStockThreshold)} ${unitLabel(f.unit)}` },
    { label: 'Expiry date', value: f.expiryDate ? `${fmtDate(f.expiryDate)}${f.remainingQuantity > 0 ? ` (${expiryText(f)})` : ''}` : '' }, { label: 'Received on', value: fmtDate(f.receivedDate) },
    { label: 'Source', value: f.source }, { label: 'Storage', value: f.storageLocation },
  ],
};
