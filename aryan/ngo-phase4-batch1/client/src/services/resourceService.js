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
};

// Documents need the login token, so they are fetched as a blob and saved, not opened as a plain link.
export async function downloadDocument(doc) {
  const res = await api.get(`/documents/${doc._id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.download = doc.originalName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
