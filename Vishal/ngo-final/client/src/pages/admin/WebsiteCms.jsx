import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ExternalLink, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { ErrorState, PageHeader, Skeleton, Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { errorMessage } from "../../services/api";
import { imageSrc, websiteAdmin } from "../../services/websiteApi";

// Builds a value for a field from what is saved. Empty text stays '' so inputs stay controlled.
const blank = (f) =>
  f.type === "list" || f.type === "images"
    ? []
    : f.type === "group"
      ? Object.fromEntries(f.fields.map((x) => [x.key, blank(x)]))
      : "";
const initial = (fields, data = {}) =>
  Object.fromEntries(fields.map((f) => [f.key, data[f.key] ?? blank(f)]));

function ImageInput({ id, label, value, onChange, disabled }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange((await websiteAdmin.uploadImage(file)).url);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img
          src={imageSrc(value)}
          alt=""
          className="h-16 w-24 rounded-md border border-slate-200 object-cover"
        />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400">
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label
          className={`btn-secondary cursor-pointer ${disabled || busy ? "pointer-events-none opacity-60" : ""}`}
        >
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {value ? "Replace" : "Upload"}
          <span className="sr-only"> {label}</span>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={pick}
            disabled={disabled || busy}
          />
        </label>
        {value && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onChange("")}
            disabled={disabled}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// One field, driven by the definition the server sent.
function FieldInput({ f, value, onChange, siblings, id, disabled }) {
  if (f.showWhen && siblings?.[f.showWhen.key] !== f.showWhen.equals)
    return null;
  const common = { id, disabled, className: "input" };
  const label = (
    <label htmlFor={id} className="label">
      {f.label}
      {f.required && <span className="text-red-600"> *</span>}
    </label>
  );
  switch (f.type) {
    case "textarea":
      return (
        <div>
          {label}
          <textarea
            {...common}
            rows={4}
            maxLength={f.max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {value.length}/{f.max}
          </p>
        </div>
      );
    case "select":
      return (
        <div>
          {label}
          <select
            {...common}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Choose…</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "number":
      return (
        <div>
          {label}
          <input
            {...common}
            type="number"
            min={f.min}
            max={f.max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "image":
      return (
        <div>
          <span className="label">{f.label}</span>
          <ImageInput
            id={id}
            label={f.label}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      );
    case "images":
      return (
        <div>
          <span className="label">{f.label}</span>
          <ul className="space-y-3">
            {value.map((img, i) => (
              <li key={i} className="rounded-lg border border-slate-200 p-3">
                <ImageInput
                  id={`${id}-${i}`}
                  label={`${f.label} ${i + 1}`}
                  value={img.url}
                  disabled={disabled}
                  onChange={(url) =>
                    onChange(
                      url
                        ? value.map((x, j) => (j === i ? { ...x, url } : x))
                        : value.filter((_, j) => j !== i),
                    )
                  }
                />
                <div className="mt-2">
                  <label htmlFor={`${id}-${i}-alt`} className="label">
                    Describe this picture (for screen readers)
                  </label>
                  <input
                    id={`${id}-${i}-alt`}
                    className="input"
                    maxLength={150}
                    value={img.alt || ""}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(
                        value.map((x, j) =>
                          j === i ? { ...x, alt: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
          {value.length < f.max && (
            <button
              type="button"
              className="btn-secondary mt-3"
              disabled={disabled}
              onClick={() => onChange([...value, { url: "", alt: "" }])}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add image
            </button>
          )}
        </div>
      );
    case "group":
      return (
        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">
            {f.label}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {f.fields.map((g) => (
              <FieldInput
                key={g.key}
                f={g}
                id={`${id}-${g.key}`}
                value={value[g.key] ?? ""}
                siblings={value}
                disabled={disabled}
                onChange={(v) => onChange({ ...value, [g.key]: v })}
              />
            ))}
          </div>
        </fieldset>
      );
    case "list":
      return (
        <div>
          <span className="label">{f.label}</span>
          <ul className="space-y-4">
            {value.map((row, i) => (
              <li key={i} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    #{i + 1}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline"
                    disabled={disabled}
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove<span className="sr-only"> item {i + 1}</span>
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {f.item.map((g) => (
                    <div
                      key={g.key}
                      className={
                        g.type === "textarea" || g.type === "image"
                          ? "sm:col-span-2"
                          : ""
                      }
                    >
                      <FieldInput
                        f={g}
                        id={`${id}-${i}-${g.key}`}
                        value={row[g.key] ?? blank(g)}
                        siblings={row}
                        disabled={disabled}
                        onChange={(v) =>
                          onChange(
                            value.map((x, j) =>
                              j === i ? { ...x, [g.key]: v } : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {value.length < f.max && (
            <button
              type="button"
              className="btn-secondary mt-3"
              disabled={disabled}
              onClick={() => onChange([...value, {}])}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
          )}
          {value.length >= f.max && (
            <p className="mt-2 text-xs text-slate-500">
              You have reached the limit of {f.max}.
            </p>
          )}
        </div>
      );
    default:
      return (
        <div>
          {label}
          <input
            {...common}
            type={
              f.type === "email" ? "email" : f.type === "url" ? "url" : "text"
            }
            maxLength={f.max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}

// Removes blank rows and empty values so the server only gets what the person filled in.
function prune(fields, values) {
  const out = {};
  fields.forEach((f) => {
    let v = values[f.key];
    if (f.type === "group") v = prune(f.fields, v || {});
    else if (f.type === "list")
      v = (v || [])
        .map((row) => prune(f.item, row))
        .filter((r) => Object.keys(r).length);
    else if (f.type === "images")
      v = (v || [])
        .filter((x) => x.url)
        .map((x) => (x.alt ? x : { url: x.url }));
    else if (typeof v === "string") v = v.trim();
    const empty =
      v === "" ||
      v === undefined ||
      (Array.isArray(v) && !v.length) ||
      (v &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        !Object.keys(v).length);
    if (!empty) out[f.key] = f.type === "number" ? Number(v) : v;
  });
  return out;
}

function SectionForm({ title, help, fields, data, canEdit, onSave }) {
  const [values, setValues] = useState(() => initial(fields, data));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setValues(initial(fields, data)), [data, fields]);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave(prune(fields, values));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="card space-y-5 p-5" aria-label={title}>
      <div>
        <h2 className="text-lg font-medium text-slate-900">{title}</h2>
        {help && <p className="text-sm text-slate-500">{help}</p>}
      </div>
      {!canEdit && (
        <p
          role="status"
          className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          You can view this page but not change it.
        </p>
      )}
      {fields.map((f) => (
        <FieldInput
          key={f.key}
          f={f}
          id={`f-${f.key}`}
          value={values[f.key]}
          siblings={values}
          disabled={!canEdit || saving}
          onChange={(v) => setValues((o) => ({ ...o, [f.key]: v }))}
        />
      ))}
      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {canEdit && (
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}Save changes
          </button>
        </div>
      )}
    </form>
  );
}

export default function WebsiteCms() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings.edit");
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("organization");

  const load = useCallback(() => {
    setError(false);
    websiteAdmin
      .get()
      .then(setData)
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  if (error)
    return (
      <div className="card">
        <ErrorState
          message="Could not load the website settings"
          onRetry={load}
        />
      </div>
    );
  if (!data)
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );

  const tabs = [
    { key: "organization", label: "Organisation" },
    ...data.schema.order.map((k) => ({
      key: k,
      label: data.schema.sections[k].label,
    })),
  ];
  const saveSection = async (key, body) => {
    const content = await websiteAdmin.saveSection(key, body);
    setData((d) => ({ ...d, sections: { ...d.sections, [key]: content } }));
    toast.success(`${data.schema.sections[key].label} saved`);
  };
  const saveOrg = async (body) => {
    const org = await websiteAdmin.saveOrganization(body);
    setData((d) => ({ ...d, organization: org }));
    toast.success("Organisation details saved");
  };

  return (
    <>
      <PageHeader
        title="Website"
        subtitle="Everything visitors read on your public website. Changes go live as soon as you save."
        actions={
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            View website
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        }
      />
      <div
        role="tablist"
        aria-label="Website sections"
        className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls="cms-panel"
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="cms-panel" aria-labelledby={`tab-${tab}`}>
        {tab === "organization" ? (
          <SectionForm
            key="organization"
            title="Organisation"
            help="Name, contact details and social links shown in the header, footer and contact page."
            fields={data.schema.organization}
            data={data.organization}
            canEdit={canEdit}
            onSave={saveOrg}
          />
        ) : (
          <SectionForm
            key={tab}
            title={data.schema.sections[tab].label}
            help={data.schema.sections[tab].help}
            fields={data.schema.sections[tab].fields}
            data={data.sections[tab]}
            canEdit={canEdit}
            onSave={(b) => saveSection(tab, b)}
          />
        )}
      </div>
    </>
  );
}
