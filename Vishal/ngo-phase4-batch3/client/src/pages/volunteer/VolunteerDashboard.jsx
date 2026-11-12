import { ErrorState, PageHeader } from '../../components/ui';
import { EmptyState } from '../../components/ui';
import { EventList, Panel, TaskList, WidgetGrid, shortDate, statusLabel } from '../../components/dashboard';
import { useAuth } from '../../context/AuthContext';
import useDashboard from '../../hooks/useDashboard';
import { dashboardService } from '../../services/dashboardService';

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useDashboard(dashboardService.volunteer);

  if (error) return <div className="card"><ErrorState message="Could not load your dashboard" onRetry={reload} /></div>;

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here is what is on your plate." />
      <WidgetGrid widgets={data?.widgets} loading={loading} count={5} />

      {data && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="Today's tasks" subtitle="Due today or already overdue">
            <TaskList tasks={data.todaysTasks} empty={{ title: 'Nothing due today', hint: 'You are all caught up.' }} />
          </Panel>
          <Panel title="Current assignments" subtitle="Tasks you have accepted or started">
            <TaskList tasks={data.currentAssignments} empty={{ title: 'No active assignments', hint: 'Accepted tasks will show up here.' }} />
          </Panel>
          <Panel title="Upcoming events" subtitle="Events you are assigned to">
            <EventList events={data.upcomingEvents} empty={{ title: 'No upcoming events', hint: 'Your manager will assign you to events.' }} />
          </Panel>
          <Panel title="Announcements">
            {data.announcements.length === 0 ? <EmptyState title="No announcements" hint="Messages from the team will appear here." /> : (
              <ul className="divide-y divide-slate-100">
                {data.announcements.map((a) => (
                  <li key={a._id} className="py-2.5">
                    <p className="text-sm font-medium text-slate-800">{a.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{a.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{shortDate(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Recent activity" subtitle="Your latest task updates" className="lg:col-span-2">
            {data.recentActivity.length === 0 ? <EmptyState title="No activity yet" hint="Updates to your tasks will be listed here." /> : (
              <ul className="divide-y divide-slate-100">
                {data.recentActivity.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-slate-800">{r.text}</span>
                    <span className="shrink-0 text-xs text-slate-500">{statusLabel[r.status]} · {shortDate(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
