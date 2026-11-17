import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, FileText } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton, Spinner } from '../components/ui';
import DonationStats from '../components/DonationStats';
import { fmtDate } from '../components/ItemDrawer';
import { donationApi } from '../services/donationApi';
import { errorMessage } from '../services/api';
import { fmtDate as date, inr, inrExact, label, localToday, options } from '../utils/format';

const TYPES = options(['money', 'food', 'clothes', 'books', 'medicine', 'equipment', 'other']);
const METHODS = [{ value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }, { value: 'bank-transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' }, { value: 'online', label: 'Online' }, { value: 'in-kind', label: 'In kind (goods)' }];
const STATUSES = [{ value: 'received', label: 'Received' }, { value: 'pending', label: 'Pending' }, { value: 'inquiry', label: 'Inquiry' }, { value: 'failed', label: 'Failed' }];
const DONOR_TYPES = options(['individual', 'organization', 'anonymous']);
const amountText = (d) => (d.amount > 0 ? inr(d.amount) : '—');

function ExportButton({ params, hasPermission }) {
  const [busy, setBusy] = useState(false);
  if (!hasPermission('reports.export')) return null;
  const run = async () => {
    setBusy(true);
    try { await donationApi.exportCsv(params); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return <button className="btn-secondary" onClick={run} disabled={busy} title="Download the donations matching your filters as a CSV file">{busy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}Export CSV</button>;
}

function DonorTab({ item }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setHistory(null); setError(false); donationApi.donorHistory(item._id).then(setHistory).catch(() => setError(true)); }, [item._id, item.status, item.amount]);

  const receipt = async () => {
    setBusy(true);
    try { await donationApi.downloadReceipt(item); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 p-5">
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-800">Receipt</p>
        {item.status === 'received' && item.receiptNumber ? (
          <>
            <p className="mt-1 text-sm text-slate-600">Receipt no. <span className="font-medium text-slate-800">{item.receiptNumber}</span></p>
            <button className="btn-primary mt-3" onClick={receipt} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}Download receipt (PDF)</button>
          </>
        ) : <p className="mt-1 text-sm text-slate-500">A receipt is created automatically once this donation is marked as received.</p>}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-800">Donor history</p>
        {error && <ErrorState message="Could not load donor history" />}
        {!history && !error && <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>}
        {history && (history.items.length <= 1
          ? <EmptyState title="First donation from this donor" hint={item.donorType === 'anonymous' ? 'Anonymous gifts are not linked together.' : 'Donations with the same email or name will be listed here.'} />
          : (
            <>
              <p className="mb-2 text-sm text-slate-600">{history.totals.count} received · <span className="font-medium text-slate-800">{inrExact(history.totals.amount)}</span> in total</p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {history.items.map((h) => (
                  <li key={h._id} className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${h._id === item._id ? 'bg-brand-50' : ''}`}>
                    <div className="min-w-0"><p className="text-slate-800">{fmtDate(h.donationDate)} · {label(h.donationType)}</p><p className="truncate text-xs text-slate-500">{[h.receiptNumber, h.campaign].filter(Boolean).join(' · ') || 'No receipt yet'}</p></div>
                    <div className="shrink-0 text-right"><p className="font-medium text-slate-800">{amountText(h)}</p><Badge value={h.status} /></div>
                  </li>
                ))}
              </ul>
            </>
          ))}
      </div>
    </div>
  );
}

export default {
  module: 'donations', title: 'Donations', singular: 'Donation', service: donationApi, managerFilter: false, avatar: false,
  subtitleText: 'Money and goods given to your organisation.', searchPlaceholder: 'Search by donor, email, receipt no. or transaction ID',
  defaultSort: 'donationDate', defaultOrder: 'desc', dateRange: { label: 'Donated' },
  nameOf: (d) => d.donorName,
  subtitle: (d) => d.email || d.receiptNumber,
  badges: (d) => [d.status],
  deleteMessage: (d) => `The record for ${d.donorName} and its receipt number will be deleted for good. Mark it as failed instead if you only want to stop counting it.`,
  filters: [
    { param: 'status', label: 'All statuses', options: STATUSES },
    { param: 'type', label: 'All types', options: TYPES },
    { param: 'method', label: 'Any payment method', options: METHODS },
    { param: 'campaign', label: 'All campaigns', load: () => donationApi.campaigns().then((d) => d.items.map((c) => ({ value: c, label: c }))) },
    { param: 'donorType', label: 'Any donor type', options: DONOR_TYPES },
  ],
  columns: [
    { label: 'Donor', sort: 'donorName' },
    { label: 'Date', sort: 'donationDate', render: (d) => date(d.donationDate) },
    { label: 'Type', render: (d) => label(d.donationType) },
    { label: 'Amount', sort: 'amount', render: (d) => amountText(d) },
    { label: 'Status', sort: 'status', badge: true, render: (d) => <Badge value={d.status} /> },
    { label: 'Receipt no.', render: (d) => d.receiptNumber },
  ],
  fields: [
    { name: 'donorName', label: 'Donor name', required: true },
    { name: 'donorType', label: 'Donor type', type: 'select', options: DONOR_TYPES, required: true, default: 'individual' },
    { name: 'email', label: 'Email', type: 'email', help: 'Used to link a donor’s gifts together.' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'donationType', label: 'Donation type', type: 'select', options: TYPES, required: true, default: 'money' },
    { name: 'amount', label: 'Amount (₹)', type: 'number', min: 0, help: 'Required for money. For goods, leave blank or enter an estimated value.' },
    { name: 'paymentMethod', label: 'Payment method', type: 'select', options: METHODS },
    { name: 'transactionId', label: 'Transaction ID', help: 'Each transaction ID can only be recorded once.' },
    { name: 'donationDate', label: 'Donation date', type: 'date', default: localToday },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, default: 'received', help: 'A receipt number is created when a donation is marked as received.' },
    { name: 'campaign', label: 'Campaign' },
    { name: 'purpose', label: 'Purpose' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ],
  detailRows: (d) => [
    { label: 'Donor type', value: label(d.donorType) }, { label: 'Date', value: date(d.donationDate) },
    { label: 'Email', value: d.email }, { label: 'Phone', value: d.phone },
    { label: 'Donation type', value: label(d.donationType) }, { label: 'Amount', value: d.amount > 0 ? inrExact(d.amount) : '' },
    { label: 'Payment method', value: METHODS.find((m) => m.value === d.paymentMethod)?.label }, { label: 'Transaction ID', value: d.transactionId },
    { label: 'Receipt no.', value: d.receiptNumber }, { label: 'Campaign', value: d.campaign },
    { label: 'Purpose', value: d.purpose, wide: true }, { label: 'Notes', value: d.notes, wide: true },
  ],
  extraTabs: [{ key: 'donor', label: 'Receipt & donor', render: (props) => <DonorTab {...props} /> }],
  renderAbove: (ctx) => <DonationStats {...ctx} />,
  headerActions: (ctx) => <ExportButton {...ctx} />,
};
