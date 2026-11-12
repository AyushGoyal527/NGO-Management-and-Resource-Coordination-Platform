import api from './api';
import { createResourceService } from './resourceService';

const unwrap = (p) => p.then((r) => r.data.data);

export const foodApi = {
  ...createResourceService('/food'),
  alerts: () => unwrap(api.get('/food/alerts')),
  available: () => unwrap(api.get('/food/available')),
  distributions: (params) => unwrap(api.get('/food/distributions', { params })),
  distribute: (body) => unwrap(api.post('/food/distributions', body)),
  removeDistribution: (id) => api.delete(`/food/distributions/${id}`).then((r) => r.data),
};
