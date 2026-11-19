import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { ErrorState, Skeleton } from "./ui";
import { useSite } from "../context/SiteContext";
import { imageSrc } from "../services/websiteApi";
import { fmtDate, label } from "../utils/format";

export const Wrap = ({ children, className = "" }) => (
  <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
    {children}
  </div>
);

export const Section = ({
  id,
  title,
  intro,
  action,
  tone = "plain",
  children,
}) => (
  <section
    id={id}
    aria-labelledby={id ? `${id}-h` : undefined}
    className={`py-14 sm:py-20 ${tone === "leaf" ? "bg-brand-50" : ""}`}
  >
    <Wrap>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2
            id={id ? `${id}-h` : undefined}
            className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl"
          >
            {title}
          </h2>
          {intro && (
            <p className="mt-3 text-lg leading-relaxed text-slate-600">
              {intro}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </Wrap>
  </section>
);

export const PageTop = ({ title, intro }) => (
  <div className="border-b border-brand-100 bg-brand-50 py-12 sm:py-16">
    <Wrap>
      <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        {title}
      </h1>
      {intro && (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          {intro}
        </p>
      )}
    </Wrap>
  </div>
);

// A photo cropped to a doorway shape. With no photo it is a solid green arch, so the page still has its shape.
export const Arch = ({ src, alt = "", className = "" }) => (
  <div className={`arch overflow-hidden bg-brand-700 ${className}`}>
    {src ? (
      <img
        src={imageSrc(src)}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    ) : null}
  </div>
);

export const SiteGate = ({ children }) => {
  const { site, loading, error, reload } = useSite();
  if (error)
    return (
      <Wrap className="py-20">
        <ErrorState message="This page could not be loaded" onRetry={reload} />
      </Wrap>
    );
  if (loading || !site)
    return (
      <Wrap className="space-y-4 py-16">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </Wrap>
    );
  return children(site);
};

export const Note = ({ title, hint, action }) => (
  <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
    <p className="font-medium text-slate-800">{title}</p>
    {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const STATUS = {
  active: "Running now",
  planned: "Starting soon",
  completed: "Completed",
};
const period = (p) =>
  [fmtDate(p.startDate), fmtDate(p.endDate)].filter(Boolean).join(" to ");

export function ProgramList({ programs }) {
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200">
      {programs.map((p, i) => (
        <li
          key={`${p.name}-${i}`}
          className="grid gap-2 py-6 sm:grid-cols-[1fr_2fr] sm:gap-8"
        >
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">
              {p.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-brand-700">
              {STATUS[p.status] || label(p.status)}
            </p>
          </div>
          <div>
            {p.description && (
              <p className="leading-relaxed text-slate-700">{p.description}</p>
            )}
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              {p.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {p.location}
                </span>
              )}
              {period(p) && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {period(p)}
                </span>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const timeRange = (e) => [e.startTime, e.endTime].filter(Boolean).join(" to ");
export function EventRows({ events }) {
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200">
      {events.map((e, i) => {
        const d = new Date(e.date);
        return (
          <li key={`${e.name}-${i}`} className="flex gap-5 py-5">
            <time
              dateTime={String(e.date).slice(0, 10)}
              className="w-16 shrink-0 text-center"
            >
              <span className="block font-display text-3xl font-semibold leading-none text-brand-700">
                {d.getUTCDate()}
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                {d.toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </span>
            </time>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold text-ink">
                {e.name}
              </h3>
              {e.description && (
                <p className="mt-1 leading-relaxed text-slate-700">
                  {e.description}
                </p>
              )}
              <p className="mt-1 flex flex-wrap gap-x-5 text-sm text-slate-500">
                {timeRange(e) && <span>{timeRange(e)}</span>}
                {e.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {e.location}
                  </span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Stories({ items }) {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      {items.map((s, i) => (
        <article
          key={i}
          className="flex flex-col gap-4 sm:flex-row md:flex-col lg:flex-row"
        >
          {s.image && (
            <img
              src={imageSrc(s.image)}
              alt=""
              loading="lazy"
              className="h-44 w-full rounded-lg object-cover sm:w-44 md:w-full lg:w-44"
            />
          )}
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">
              {s.title}
            </h3>
            <p className="mt-2 leading-relaxed text-slate-700">{s.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Testimonials({ items }) {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      {items.map((t, i) => (
        <figure key={i} className="border-l-4 border-sun-500 pl-5">
          <blockquote className="font-display text-xl leading-relaxed text-ink">
            “{t.quote}”
          </blockquote>
          <figcaption className="mt-3 flex items-center gap-3 text-sm text-slate-600">
            {t.image && (
              <img
                src={imageSrc(t.image)}
                alt=""
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <span>
              <span className="font-medium text-slate-900">{t.name}</span>
              {t.role ? `, ${t.role}` : ""}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export const LinkButton = ({ to, children, variant = "primary" }) => (
  <Link
    to={to}
    className={
      variant === "sun"
        ? "btn bg-sun-500 px-5 py-3 text-base font-semibold text-ink hover:bg-sun-400"
        : variant === "light"
          ? "btn border border-white/60 px-5 py-3 text-base text-white hover:bg-white/10"
          : variant === "secondary"
            ? "btn-secondary px-5 py-3 text-base"
            : "btn-primary px-5 py-3 text-base"
    }
  >
    {children}
  </Link>
);
