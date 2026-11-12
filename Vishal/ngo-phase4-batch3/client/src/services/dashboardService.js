import api from './api';

const get = (role) => api.get(`/dashboard/${role}`).then((r) => r.data.data);
export const dashboardService = { admin: () => get('admin'), manager: () => get('manager'), volunteer: () => get('volunteer') };
