import { useEffect, useState } from 'react';
import { ErrorState } from './ui';
import { BarsChart, DonutChart, Panel, TrendChart, WidgetGrid } from './dashboard';
import { donationApi } from '../services/donationApi';

// Summary cards and charts for the donations page. They follow the date range chosen in the list below.
export default function DonationStats({ params, version }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const from = params.from || '';
  const to = params.to || '';

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(false);
    donationApi.stats({ from: from || undefined, to: to || undefined })
      .then((d) => { if (live) setStats(d); })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [from, to, version, attempt]);

  if (error) return <div className="card mb-5"><ErrorState message="Could not load donation statistics" onRetry={() => setAttempt((a) => a + 1)} /></div>;

  const t = stats?.totals;
  const widgets = t && [
    { key: 'totalDonations', label: 'Total received', value: t.amount, format: 'currency', hint: from || to ? 'In the selected dates' : 'All time' },
    { key: 'donationsReceived', label: 'Donations received', value: t.count },
    { key: 'averageGift', label: 'Average gift', value: t.average, format: 'currency', hint: 'Money donations only' },
    { key: 'awaitingDonations', label: 'Awaiting confirmation', value: t.awaiting, hint: 'Inquiries and pending' },
  ];

  return (
    <div className="mb-5 space-y-4">
      <WidgetGrid widgets={widgets} loading={!stats} count={4} />
      {stats && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Money received" subtitle="By month" className="lg:col-span-2"><TrendChart data={stats.byMonth} xKey="label" yKey="amount" money /></Panel>
          <Panel title="What was given" subtitle="Number of donations by type"><DonutChart data={stats.byType.map((r) => ({ name: r.name, value: r.count }))} /></Panel>
          <Panel title="Top campaigns" subtitle="Money received" className="lg:col-span-2"><BarsChart data={stats.byCampaign} xKey="name" yKey="amount" color="#e0a526" /></Panel>
          <Panel title="Payment methods" subtitle="Money received"><DonutChart data={stats.byMethod.filter((m) => m.amount > 0).map((r) => ({ name: r.name, value: r.amount }))} /></Panel>
        </div>
      )}
    </div>
  );
}
