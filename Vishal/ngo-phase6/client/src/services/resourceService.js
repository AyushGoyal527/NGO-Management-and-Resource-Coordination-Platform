import api from './api';

const unwrap = (p) => p.then((r) => r.data.data);

// One service per module: createResourceService('/volunteers')
export const createResourceService = (base) => ({
  list: (params) => unwrap(api.get(base, { params })),
  get: (id) => unwrap(api.get(`${base}/${id}`)),
  create: (body) => unwrap(api.post(base, body)),
  update: (id, body) => unwrap(api.put(`${base}/${id}`, body)),
  remove: (id) => api.delete(`${base}/${id}`).then((r) => r.data),
  history: (id) => unwrap(api.get(`${base}/${id}/history`)),
  uploadPhoto: (id, file) => { const f = new FormData(); f.append('photo', file); return unwrap(api.post(`${base}/${id}/photo`, f)); },
  addDocuments: (id, files) => { const f = new FormData(); files.forEach((x) => f.append('files', x)); return unwrap(api.post(`${base}/${id}/documents`, f)); },
  removeDocument: (id, docId) => unwrap(api.delete(`${base}/${id}/documents/${docId}`)),
  action: (id, path, body) => unwrap(api.post(`${base}/${id}/${path}`, body)),
});

export const lookups = {
  managers: () => unwrap(api.get('/lookups/managers')),
  programs: () => unwrap(api.get('/lookups/programs')),
  volunteers: () => unwrap(api.get('/lookups/volunteers')),
  people: () => unwrap(api.get('/lookups/people')),
};

// Downloads need the login token, so files are fetched as a blob and saved, not opened as a plain link.
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// When a blob request fails, the server's JSON message is inside the blob. Read it so the person sees the real reason.
async function blobError(error) {
  const blob = error.response?.data;
  if (blob instanceof Blob) {
    try { const msg = JSON.parse(await blob.text()).message; if (msg) { error.response.data = { message: msg }; } } catch { /* not JSON */ }
  }
  return error;
}

export async function downloadFile(url, { params, fallbackName = 'download' } = {}) {
  try {
    const res = await api.get(url, { params, responseType: 'blob' });
    const match = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '');
    saveBlob(res.data, match ? match[1] : fallbackName);
  } catch (e) { throw await blobError(e); }
}

export const downloadDocument = (doc) => downloadFile(`/documents/${doc._id}/download`, { fallbackName: doc.originalName });
