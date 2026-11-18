import api from './api';

const unwrap = (p) => p.then((r) => r.data.data);

export const userService = {
  list: (params) => unwrap(api.get('/users', { params })),
  stats: () => unwrap(api.get('/users/stats')),
  catalog: () => unwrap(api.get('/users/permission-catalog')),
  create: (body) => unwrap(api.post('/users', body)),
  update: (id, body) => unwrap(api.put(`/users/${id}`, body)),
  setRole: (id, role) => unwrap(api.patch(`/users/${id}/role`, { role })),
  setPermissions: (id, body) => unwrap(api.patch(`/users/${id}/permissions`, body)),
  setStatus: (id, status) => unwrap(api.patch(`/users/${id}/status`, { status })),
  resetPassword: (id, newPassword) => unwrap(api.post(`/users/${id}/reset-password`, { newPassword })),
  archive: (id) => unwrap(api.delete(`/users/${id}`)),
};
