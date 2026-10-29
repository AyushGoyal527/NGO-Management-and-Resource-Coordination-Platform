import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';

// Phase 2: account statistics come live from MongoDB. The full NGO widgets and charts arrive in Phase 3.
export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => { userService.stats().then(setStats).catch(() => setError(true)); }, []);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Account overview for your organisation." />
      {error ? <div className="card"><ErrorState message="Could not load account statistics" onRetry={() => { setError(false); userService.stats().then(setStats).catch(() => setError(true)); }} /></div> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total accounts" value={stats?.total} loading={!stats} />
          <StatCard label="Active" value={stats?.active} loading={!stats} />
          <StatCard label="Awaiting approval" value={stats?.pending} loading={!stats} />
          <StatCard label="Managers" value={stats?.managers} loading={!stats} />
        </div>
      )}
      {stats?.pending > 0 && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-slate-700">{stats.pending} {stats.pending === 1 ? 'person is' : 'people are'} waiting for approval.</p>
          <Link to="/admin/users" className="btn-primary">Review accounts</Link>
        </div>
      )}
    </>
  );
}
