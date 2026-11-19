import api from './api';
import { createResourceService } from './resourceService';

const unwrap = (p) => p.then((r) => r.data.data);

export const tasksService = {
  ...createResourceService('/tasks'),
  setStatus: (id, status) => unwrap(api.post(`/tasks/${id}/status`, { status })),
  addComment: (id, text) => unwrap(api.post(`/tasks/${id}/comments`, { text })),
  deleteComment: (id, commentId) => unwrap(api.delete(`/tasks/${id}/comments/${commentId}`)),
};

export const programsService = {
  ...createResourceService('/programs'),
  summary: (id) => unwrap(api.get(`/programs/${id}/summary`)),
};

export const eventsService = createResourceService('/events');
