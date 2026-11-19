import { Link } from 'react-router-dom';
import { ErrorState, PageHeader } from '../../components/ui';
import { BarsChart, DonutChart, Panel, TrendChart, WidgetGrid } from '../../components/dashboard';
import { useAuth } from '../../context/AuthContext';
import useDashboard from '../../hooks/useDashboard';
import { dashboardService } from '../../services/dashboardService';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useDashboard(dashboardService.admin);

  if (error) return <div className="card"><ErrorState message="Could not load the dashboard" onRetry={reload} /></div>;
  const c = data?.charts;

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="How your organisation is doing right now." />

      {data?.pendingApprovals > 0 && (
        <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">{data.pendingApprovals} {data.pendingApprovals === 1 ? 'account is' : 'accounts are'} waiting for your approval.</p>
          <Link to="/admin/users" className="btn-primary">Review accounts</Link>
        </div>
      )}

      <WidgetGrid widgets={data?.widgets} loading={loading} count={10} />

      {c && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="Donations over time" subtitle="Money received, last 6 months" className="lg:col-span-2"><TrendChart data={c.donationsOverTime} xKey="label" yKey="amount" money /></Panel>
          <Panel title="Volunteer activity" subtitle="Hours logged by your most active volunteers"><BarsChart data={c.volunteerActivity} xKey="name" yKey="hours" /></Panel>
          <Panel title="Food distribution" subtitle="Quantity given out, by item"><BarsChart data={c.foodDistribution} xKey="name" yKey="quantity" color="#e0a526" /></Panel>
          <Panel title="Beneficiaries" subtitle="By economic category"><DonutChart data={c.beneficiaryStats} /></Panel>
          <Panel title="Students" subtitle="Enrolled students by class"><BarsChart data={c.studentStats} xKey="name" yKey="students" color="#3b82c4" /></Panel>
          <Panel title="Task completion" subtitle="All tasks by status"><DonutChart data={c.taskCompletion} /></Panel>
          <Panel title="Resource usage" subtitle="Items by status"><BarsChart data={c.resourceUsage} xKey="name" yKey="value" color="#7c5cc4" /></Panel>
        </div>
      )}
    </>
  );
}
