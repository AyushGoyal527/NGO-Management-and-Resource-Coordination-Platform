import { PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function ManagerDashboard() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Your manager workspace." />
      <div className="card p-5 text-sm text-slate-600">
        You can access <strong>{user.permissions.length}</strong> permissions. Your task, people and resource modules will appear in the sidebar as they are switched on for your account.
      </div>
    </>
  );
}
