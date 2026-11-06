import { useEffect } from "react";
import { AlertCircle, Inbox, Loader2, X } from "lucide-react";

export const Spinner = ({ className = "" }) => (
  <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />
);

export const FullPageSpinner = () => (
  <div className="flex h-screen items-center justify-center text-brand-600">
    <Spinner className="h-8 w-8" />
  </div>
);

const badgeColors = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  inactive: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
  admin: "bg-violet-50 text-violet-700",
  manager: "bg-sky-50 text-sky-700",
  volunteer: "bg-teal-50 text-teal-700",
};
export const Badge = ({ value }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badgeColors[value] || "bg-slate-100 text-slate-600"}`}
  >
    {value}
  </span>
);

export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
);

export const EmptyState = ({ title, hint, action }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <Inbox className="mb-3 h-10 w-10 text-slate-300" />
    <p className="font-medium text-slate-700">{title}</p>
    {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
    <p className="font-medium text-slate-700">{message}</p>
    {onRetry && (
      <button className="btn-secondary mt-4" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  busy,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className={danger ? "btn-danger" : "btn-primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy && <Spinner className="h-4 w-4" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export const Pagination = ({ pagination, onPage }) => {
  if (!pagination || pagination.total === 0) return null;
  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary px-3 py-1"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary px-3 py-1"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

export const StatCard = ({ label, value, loading }) => (
  <div className="card p-4">
    <p className="text-sm text-slate-500">{label}</p>
    {loading ? (
      <Skeleton className="mt-2 h-8 w-16" />
    ) : (
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
    )}
  </div>
);
