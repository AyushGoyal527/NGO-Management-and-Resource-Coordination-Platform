import { EmptyState, ErrorState, PageHeader } from "../../components/ui";
import {
  DonutChart,
  EventList,
  Panel,
  TaskList,
  WidgetGrid,
} from "../../components/dashboard";
import { shortDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import useDashboard from "../../hooks/useDashboard";
import { dashboardService } from "../../services/dashboardService";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useDashboard(
    dashboardService.manager,
  );

  if (error)
    return (
      <div className="card">
        <ErrorState message="Could not load the dashboard" onRetry={reload} />
      </div>
    );

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Your team, tasks and upcoming work."
      />

      {data && data.widgets.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No modules switched on yet"
            hint="Ask an administrator to give you access to the modules you work with."
          />
        </div>
      ) : (
        <WidgetGrid widgets={data?.widgets} loading={loading} count={8} />
      )}

      {data && (data.dueSoon || data.upcomingEvents) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {data.taskBreakdown && (
            <Panel title="Task status" subtitle="Tasks you created">
              <DonutChart data={data.taskBreakdown} />
            </Panel>
          )}
          {data.dueSoon && (
            <Panel title="Due soon" subtitle="Your open tasks, earliest first">
              <TaskList
                tasks={data.dueSoon}
                empty={{
                  title: "No open tasks",
                  hint: "Tasks you create will show up here.",
                }}
              />
            </Panel>
          )}
          {data.upcomingEvents && (
            <Panel title="Upcoming events" subtitle="Events you manage">
              <EventList
                events={data.upcomingEvents}
                empty={{
                  title: "No upcoming events",
                  hint: "Events assigned to you will appear here.",
                }}
              />
            </Panel>
          )}
        </div>
      )}
      {data?.announcements?.length > 0 && (
        <div className="mt-6">
          <Panel
            title="Announcements"
            subtitle="Notices from the administrators"
          >
            <ul className="divide-y divide-slate-100">
              {data.announcements.map((a) => (
                <li key={a._id} className="py-2.5">
                  <p className="text-sm font-medium text-slate-800">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{a.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {shortDate(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
