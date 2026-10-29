import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  HeartHandshake,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { navigation } from "../utils/navigation";

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden items-center gap-1 text-sm text-slate-500 sm:flex"
    >
      {parts.map((p, i) => (
        <span key={p} className="flex items-center gap-1 capitalize">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {i < parts.length - 1 ? (
            <Link
              to={`/${parts.slice(0, i + 1).join("/")}`}
              className="hover:text-slate-800"
            >
              {p}
            </Link>
          ) : (
            <span className="font-medium text-slate-800">{p}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function DashboardLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  // Sidebar hides any module the person has no permission for.
  const items = (navigation[user.role] || []).filter(
    (i) => !i.permission || hasPermission(i.permission),
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-900 text-brand-100">
      <div className="flex h-16 items-center gap-2 px-5 text-white">
        <HeartHandshake className="h-6 w-6" />
        <span className="font-semibold">NGO Manager</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-white/15 font-medium text-white" : "hover:bg-white/10"}`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">
            {sidebar}
            <button
              className="absolute right-2 top-4 text-white"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            className="rounded p-1.5 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Breadcrumbs />
        </div>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            aria-haspopup="menu"
            aria-expanded={menu}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {user.name[0]}
            </span>
            <span className="hidden text-left text-sm sm:block">
              <span className="block font-medium leading-tight">
                {user.name}
              </span>
              <span className="block text-xs capitalize text-slate-500">
                {user.role}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          {menu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenu(false)}
              />
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
              >
                <p className="truncate px-3 py-2 text-xs text-slate-500">
                  {user.email}
                </p>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
