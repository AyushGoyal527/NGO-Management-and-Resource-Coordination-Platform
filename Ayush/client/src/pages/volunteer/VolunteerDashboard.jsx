import { PageHeader } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function VolunteerDashboard() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Your volunteer workspace."
      />
      <div className="card p-5 text-sm text-slate-600">
        Your tasks, events and hours will show up here.
      </div>
    </>
  );
}
