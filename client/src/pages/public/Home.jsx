import { Link } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import { useAuth, homePath } from "../../context/AuthContext";

// Temporary entry page. The CMS-driven public website replaces this in Phase 6.
export default function Home() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <HeartHandshake className="h-10 w-10 text-brand-600" />
      <h1 className="mt-4 text-3xl font-semibold text-slate-900">
        NGO Management System
      </h1>
      <p className="mt-2 max-w-md text-slate-600">
        Sign in to manage volunteers, programs and day-to-day work.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to={user ? homePath(user.role) : "/login"}
          className="btn-primary"
        >
          {user ? "Go to dashboard" : "Log in"}
        </Link>
        {!user && (
          <Link to="/register" className="btn-secondary">
            Create account
          </Link>
        )}
      </div>
    </div>
  );
}
