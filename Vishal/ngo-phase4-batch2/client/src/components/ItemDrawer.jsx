import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Download, FileText, Trash2, Upload } from 'lucide-react';
import { Avatar, Badge, ConfirmDialog, Drawer, EmptyState, ErrorState, Skeleton, Spinner, Tabs } from './ui';
import { downloadDocument } from '../services/resourceService';
import { errorMessage } from '../services/api';

import { fmtDate, fmtDateTime } from '../utils/format';

export { fmtDate };
const size = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const MAX = 5 * 1024 * 1024;

function DetailsTab({ rows }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
      {rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== '').map((r) => (
        <div key={r.label} className={r.wide ? 'sm:col-span-2' : ''}>
          <dt className="text-xs uppercase tracking-wide text-slate-500">{r.label}</dt>
          <dd className="mt-0.5 whitespace-pre-line text-sm text-slate-800">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DocumentsTab({ item, service, canEdit, onItem }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(null);

  const upload = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    if (files.length > 5) return toast.error('Upload up to 5 files at a time');
    const big = files.find((f) => f.size > MAX);
    if (big) return toast.error(`"${big.name}" is larger than 5 MB`);
    setBusy(true);
    try { onItem((await service.addDocuments(item._id, files)).item); toast.success('Uploaded'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const confirmRemove = async () => {
    setBusy(true);
    try { onItem((await service.removeDocument(item._id, remove._id)).item); setRemove(null); toast.success('Removed'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const download = (d) => downloadDocument(d).catch(() => toast.error('Could not download this file'));

  return (
    <div className="p-5">
      {canEdit && (
        <>
          <input ref={input} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={upload} />
          <button className="btn-secondary mb-4" onClick={() => input.current.click()} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}Upload files</button>
          <p className="mb-4 text-xs text-slate-500">JPG, PNG, WEBP or PDF, up to 5 MB each.</p>
        </>
      )}
      {item.documents?.length ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {item.documents.map((d) => (
            <li key={d._id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{d.originalName}</p><p className="text-xs text-slate-500">{size(d.size)} · {fmtDate(d.createdAt)}</p></div>
              <button className="rounded p-1.5 text-slate-600 hover:bg-slate-100" aria-label={`Download ${d.originalName}`} onClick={() => download(d)}><Download className="h-4 w-4" /></button>
              {canEdit && <button className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Remove ${d.originalName}`} onClick={() => setRemove(d)}><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No documents yet" hint={canEdit ? 'Upload IDs, certificates or forms here.' : undefined} />}
      <ConfirmDialog open={!!remove} danger busy={busy} title="Remove document" message={`Remove "${remove?.originalName}"? The file is deleted for good.`} confirmLabel="Remove" onConfirm={confirmRemove} onClose={() => setRemove(null)} />
    </div>
  );
}

function HistoryTab({ service, id }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { service.history(id).then((d) => setItems(d.items)).catch(() => setError(true)); }, [service, id]);
  if (error) return <ErrorState message="Could not load history" />;
  if (!items) return <div className="space-y-3 p-5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (!items.length) return <EmptyState title="No history yet" hint="Changes to this record will be listed here." />;
  return (
    <ul className="divide-y divide-slate-100 px-5">
      {items.map((h) => {
        const changed = h.newValue && typeof h.newValue === 'object' ? Object.keys(h.newValue).join(', ') : '';
        return (
          <li key={h._id} className="py-3 text-sm">
            <p className="text-slate-800"><span className="font-medium">{h.user?.name || 'Someone'}</span> <span className="capitalize">{h.action.replace(/-/g, ' ')}</span>{changed && action(h) ? <span className="text-slate-500"> · {changed}</span> : null}</p>
            <p className="text-xs text-slate-500">{fmtDateTime(h.timestamp)}</p>
          </li>
        );
      })}
    </ul>
  );
}
const action = (h) => ['update', 'create'].includes(h.action);

export default function ItemDrawer({ id, config, can, onClose, onChanged }) {
  const { service } = config;
  const [item, setItem] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('details');
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef(null);

  const load = useCallback(() => {
    setError(false);
    service.get(id).then((d) => setItem(d.item)).catch(() => setError(true));
  }, [service, id]);
  useEffect(() => { setItem(null); setTab('details'); if (id) load(); }, [id, load]);

  const update = (next) => { setItem(next); onChanged(); };

  const changePhoto = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Choose a JPG, PNG or WEBP image');
    if (file.size > MAX) return toast.error('Image must be under 5 MB');
    setUploading(true);
    try { update((await service.uploadPhoto(item._id, file)).item); toast.success('Photo updated'); } catch (err) { toast.error(errorMessage(err)); } finally { setUploading(false); }
  };

  const hasDocs = config.documents !== false;
  const tabs = [{ key: 'details', label: 'Details' }, ...(config.extraTabs || []).map((t) => ({ key: t.key, label: t.label })), ...(hasDocs ? [{ key: 'documents', label: 'Documents' }] : []), { key: 'history', label: 'History' }];
  const nameOf = config.nameOf || ((it) => it.name);
  const extra = (config.extraTabs || []).find((t) => t.key === tab);

  return (
    <Drawer open={!!id} title={config.singular} onClose={onClose}>
      {error && <ErrorState message={`Could not load this ${config.singular.toLowerCase()}`} onRetry={load} />}
      {!item && !error && <div className="space-y-3 p-5"><Skeleton className="h-16 w-full" />{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>}
      {item && (
        <>
          <div className="flex items-center gap-4 px-5 py-5">
            {config.avatar !== false && <div className="relative">
              <Avatar name={nameOf(item)} src={item[config.photoField]} size={64} />
              {can('edit') && config.photoField && (
                <>
                  <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={changePhoto} />
                  <button className="absolute -bottom-1 -right-1 rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm hover:bg-slate-50" aria-label="Change photo" onClick={() => photoInput.current.click()} disabled={uploading}>
                    {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                </>
              )}
            </div>}
            <div className="min-w-0"><h3 className="truncate text-lg font-semibold text-slate-900">{nameOf(item)}</h3><div className="mt-1 flex flex-wrap gap-1.5">{config.badges(item).map((b) => <Badge key={b} value={b} />)}</div></div>
          </div>
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {tab === 'details' && <DetailsTab rows={config.detailRows(item)} />}
          {extra && extra.render({ item, service, can, onItem: update })}
          {hasDocs && tab === 'documents' && <DocumentsTab item={item} service={service} canEdit={can('edit')} onItem={update} />}
          {tab === 'history' && <HistoryTab service={service} id={item._id} />}
        </>
      )}
    </Drawer>
  );
}
