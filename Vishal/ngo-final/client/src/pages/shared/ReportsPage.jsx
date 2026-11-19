import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Download, FileText } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  Spinner,
} from "../../components/ui";
import { reportApi } from "../../services/notificationApi";
import { downloadFile, lookups } from "../../services/resourceService";
import { errorMessage } from "../../services/api";

const right = (type) =>
  type === "number" || type === "money" ? "text-right" : "";

export default function ReportsPage() {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(false);
  const [key, setKey] = useState(null);
  const [filters, setFilters] = useState({});
  const [managers, setManagers] = useState([]);
  const [result, setResult] = useState(null);
  const [state, setState] = useState("idle");
  const [downloading, setDownloading] = useState("");

  const loadCatalog = useCallback(() => {
    setCatalogError(false);
    reportApi
      .catalog()
      .then((d) => {
        setCatalog(d);
        setKey((k) => k || d.items[0]?.key || null);
      })
      .catch(() => setCatalogError(true));
  }, []);
  useEffect(loadCatalog, [loadCatalog]);

  const report = catalog?.items.find((r) => r.key === key);
  useEffect(() => {
    if (report?.filters.some((f) => f.type === "manager"))
      lookups
        .managers()
        .then((d) => setManagers(d.items))
        .catch(() => {});
  }, [report]);

  const rangeInvalid = !!(
    filters.from &&
    filters.to &&
    filters.from > filters.to
  );
  const params = useMemo(() => {
    const p = {};
    (report?.filters || []).forEach((f) => {
      if (
        filters[f.param] &&
        !(rangeInvalid && (f.param === "from" || f.param === "to"))
      )
        p[f.param] = filters[f.param];
    });
    return p;
  }, [report, filters, rangeInvalid]);
  const paramsKey = JSON.stringify(params);

  const run = useCallback(() => {
    if (!key) return;
    setState("loading");
    reportApi
      .run(key, JSON.parse(paramsKey))
      .then((d) => {
        setResult(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [key, paramsKey]);
  useEffect(run, [run]);

  const pick = (k) => {
    setKey(k);
    setFilters({});
    setResult(null);
  };
  const download = async (format) => {
    setDownloading(format);
    try {
      await downloadFile(`/reports/${key}/export`, {
        params: { ...params, format },
        fallbackName: `${key}.${format}`,
      });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading("");
    }
  };

  if (catalogError)
    return (
      <ErrorState message="Could not load the reports" onRetry={loadCatalog} />
    );
  if (!catalog)
    return (
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  if (!catalog.items.length)
    return (
      <>
        <PageHeader title="Reports" />
        <div className="card">
          <EmptyState
            title="No reports available"
            hint="Ask an admin to give you access to the data you want to report on."
          />
        </div>
      </>
    );

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Pick a report, narrow it down, then download it as a spreadsheet (CSV) or a printable PDF."
      />
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <nav aria-label="Reports" className="card h-fit p-2">
          <ul className="space-y-0.5">
            {catalog.items.map((r) => (
              <li key={r.key}>
                <button
                  onClick={() => pick(r.key)}
                  aria-current={r.key === key ? "true" : undefined}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${r.key === key ? "bg-brand-50 font-medium text-brand-800" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className="min-w-0 space-y-4" aria-label={report?.title}>
          <div className="card p-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {report?.title}
            </h2>
            <p className="text-sm text-slate-500">{report?.description}</p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              {report?.filters.map((f) => (
                <div key={f.param}>
                  <label
                    className="mb-0.5 block text-xs text-slate-500"
                    htmlFor={`rf-${f.param}`}
                  >
                    {f.label}
                  </label>
                  {f.type === "date" ? (
                    <input
                      id={`rf-${f.param}`}
                      type="date"
                      className="input"
                      value={filters[f.param] || ""}
                      max={
                        f.param === "from" ? filters.to || undefined : undefined
                      }
                      min={
                        f.param === "to" ? filters.from || undefined : undefined
                      }
                      onChange={(e) =>
                        setFilters((x) => ({ ...x, [f.param]: e.target.value }))
                      }
                    />
                  ) : (
                    <select
                      id={`rf-${f.param}`}
                      className="input w-auto"
                      value={filters[f.param] || ""}
                      onChange={(e) =>
                        setFilters((x) => ({ ...x, [f.param]: e.target.value }))
                      }
                    >
                      <option value="">
                        {f.type === "manager" ? "All managers" : "Any"}
                      </option>
                      {(f.type === "manager"
                        ? managers.map((m) => ({ value: m._id, label: m.name }))
                        : f.options
                      ).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {Object.keys(params).length > 0 && (
                <button
                  className="btn-secondary px-3"
                  onClick={() => setFilters({})}
                >
                  Clear filters
                </button>
              )}
              {catalog.canExport && (
                <div className="ml-auto flex gap-2">
                  <button
                    className="btn-secondary"
                    disabled={!!downloading || state !== "ready"}
                    onClick={() => download("csv")}
                  >
                    {downloading === "csv" ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download CSV
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!!downloading || state !== "ready"}
                    onClick={() => download("pdf")}
                  >
                    {downloading === "pdf" ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </button>
                </div>
              )}
            </div>
            {rangeInvalid && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                The start date is after the end date, so the date range is
                ignored.
              </p>
            )}
            {!catalog.canExport && (
              <p className="mt-3 text-xs text-slate-500">
                You can view reports here. Downloading needs the export
                permission from an admin.
              </p>
            )}
          </div>

          {state === "loading" && !result && (
            <div className="card space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {state === "error" && (
            <div className="card">
              <ErrorState message="Could not run this report" onRetry={run} />
            </div>
          )}
          {result && result.report.key === key && state !== "error" && (
            <div
              className={state === "loading" ? "opacity-60" : ""}
              aria-busy={state === "loading"}
            >
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {result.summary.map((s) => (
                  <div key={s.label} className="card p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {s.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="card overflow-hidden">
                {result.total === 0 ? (
                  <EmptyState
                    title="No records match these filters"
                    hint="Try clearing a filter or widening the dates."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <tr>
                            {result.columns.map((c) => (
                              <th
                                key={c.key}
                                className={`whitespace-nowrap px-4 py-3 font-medium ${right(c.type)}`}
                              >
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.rows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              {result.columns.map((c) => (
                                <td
                                  key={c.key}
                                  className={`px-4 py-2.5 text-slate-700 ${right(c.type)}`}
                                >
                                  {r[c.key] || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                      Showing {result.rows.length} of{" "}
                      {result.truncated
                        ? `more than ${result.total}`
                        : result.total}{" "}
                      rows.
                      {result.total > result.rows.length && catalog.canExport
                        ? " Download the report to see all of them."
                        : ""}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
