import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Facebook,
  HeartHandshake,
  Instagram,
  Menu,
  Twitter,
  X,
  Youtube,
} from "lucide-react";
import { SiteProvider, useSite } from "../context/SiteContext";
import { useAuth, homePath } from "../context/AuthContext";
import { Wrap } from "../components/site";
import { imageSrc } from "../services/websiteApi";

const NAV = [
  ["Home", "/", true],
  ["About", "/about"],
  ["Programs", "/programs"],
  ["Events", "/events"],
  ["Volunteer", "/volunteer"],
  ["Contact", "/contact"],
];
const SOCIAL = [
  ["facebook", Facebook, "Facebook"],
  ["instagram", Instagram, "Instagram"],
  ["twitter", Twitter, "X (Twitter)"],
  ["youtube", Youtube, "YouTube"],
];
const link = ({ isActive }) =>
  `rounded px-2 py-1 text-[15px] ${isActive ? "font-semibold text-brand-700" : "text-slate-700 hover:text-brand-700"}`;

function Shell() {
  const { site } = useSite();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const org = site?.organization || {};
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <Wrap className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 font-display text-lg font-semibold text-ink"
          >
            {org.logo ? (
              <img
                src={imageSrc(org.logo)}
                alt=""
                className="h-9 w-9 rounded object-contain"
              />
            ) : (
              <HeartHandshake
                className="h-7 w-7 shrink-0 text-brand-600"
                aria-hidden="true"
              />
            )}
            <span className="truncate">{org.name || "Home"}</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map(([text, to, end]) => (
              <NavLink key={to} to={to} end={end} className={link}>
                {text}
              </NavLink>
            ))}
            <Link
              to="/donate"
              className="btn bg-sun-500 font-semibold text-ink hover:bg-sun-400"
            >
              Donate
            </Link>
            <Link
              to={user ? homePath(user.role) : "/login"}
              className="ml-1 btn-secondary"
            >
              {user ? "Dashboard" : "Staff login"}
            </Link>
          </nav>
          <button
            className="rounded p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </Wrap>
        {open && (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="border-t border-slate-200 bg-white lg:hidden"
          >
            <Wrap className="flex flex-col gap-1 py-3">
              {NAV.map(([text, to, end]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={(s) => `${link(s)} py-2`}
                >
                  {text}
                </NavLink>
              ))}
              <Link
                to="/donate"
                className="btn mt-2 bg-sun-500 font-semibold text-ink"
              >
                Donate
              </Link>
              <Link
                to={user ? homePath(user.role) : "/login"}
                className="btn-secondary"
              >
                {user ? "Dashboard" : "Staff login"}
              </Link>
            </Wrap>
          </nav>
        )}
      </header>

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <footer className="bg-ink text-slate-300">
        <Wrap className="grid gap-8 py-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="font-display text-xl font-semibold text-white">
              {org.name || "Our organisation"}
            </p>
            {org.tagline && <p className="mt-2 max-w-sm">{org.tagline}</p>}
            {org.registrationNumber && (
              <p className="mt-3 text-sm text-slate-400">
                Registration no. {org.registrationNumber}
              </p>
            )}
            <div className="mt-4 flex gap-3">
              {SOCIAL.filter(([k]) => org.socialLinks?.[k]).map(
                ([k, Icon, name]) => (
                  <a
                    key={k}
                    href={org.socialLinks[k]}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">{name} (opens in a new tab)</span>
                  </a>
                ),
              )}
            </div>
          </div>
          <div>
            <p className="font-medium text-white">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[...NAV.slice(1), ["Donate", "/donate"]].map(([t, to]) => (
                <li key={to}>
                  <Link className="hover:text-white hover:underline" to={to}>
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-medium text-white">Get in touch</p>
            <ul className="mt-3 space-y-2">
              {org.email && (
                <li>
                  <a
                    className="break-all hover:text-white hover:underline"
                    href={`mailto:${org.email}`}
                  >
                    {org.email}
                  </a>
                </li>
              )}
              {org.phone && (
                <li>
                  <a
                    className="hover:text-white hover:underline"
                    href={`tel:${org.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {org.phone}
                  </a>
                </li>
              )}
              {org.address && <li>{org.address}</li>}
            </ul>
          </div>
        </Wrap>
        <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {org.name || ""}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function PublicLayout() {
  return (
    <SiteProvider>
      <Shell />
    </SiteProvider>
  );
}
