import api from "./api";

const unwrap = (p) => p.then((r) => r.data.data);
export const CHANGED = "notifications:changed";
// Tells the bell (and any open notifications page) that something changed, so counts never go stale.
export const announceChange = () => window.dispatchEvent(new Event(CHANGED));

export const notificationApi = {
  list: (params) => unwrap(api.get("/notifications", { params })),
  unread: () =>
    unwrap(api.get("/notifications/unread-count")).then((d) => d.unread),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(announceChange),
  markAllRead: () => api.patch("/notifications/read-all").then(announceChange),
  remove: (id) => api.delete(`/notifications/${id}`).then(announceChange),
  clearRead: () => api.delete("/notifications/read").then(announceChange),
};

export const activityApi = {
  list: (params) => unwrap(api.get("/activity-logs", { params })),
  filters: () => unwrap(api.get("/activity-logs/filters")),
};

export const reportApi = {
  catalog: () => unwrap(api.get("/reports")),
  run: (key, params) => unwrap(api.get(`/reports/${key}`, { params })),
};
