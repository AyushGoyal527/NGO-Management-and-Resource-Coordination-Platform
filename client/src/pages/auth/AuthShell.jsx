import { HeartHandshake } from "lucide-react";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand-700">
          <HeartHandshake className="h-7 w-7" />
          <span className="text-lg font-semibold">NGO Manager</span>
        </div>
        <div className="card p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const Field = ({ label, error, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export const passwordRules = {
  required: "Password is required",
  minLength: { value: 8, message: "Use at least 8 characters" },
  validate: (v) =>
    (/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) ||
    "Include upper case, lower case and a number",
};
