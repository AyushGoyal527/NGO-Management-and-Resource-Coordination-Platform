import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => globalThis.__auth }));
vi.mock('../src/services/notificationApi', async (orig) => {
  const real = await orig();
  return { ...real,
    notificationApi: { list: vi.fn(), unread: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), remove: vi.fn(), clearRead: vi.fn() },
    activityApi: { list: vi.fn(), filters: vi.fn() }, reportApi: { catalog: vi.fn(), run: vi.fn() } };
});
vi.mock('../src/services/resourceService', async (orig) => ({ ...(await orig()), downloadFile: vi.fn(async () => {}), lookups: { managers: vi.fn(async () => ({ items: [{ _id: 'm1', name: 'Meera' }] })), programs: vi.fn(async () => ({ items: [] })), volunteers: vi.fn(async () => ({ items: [] })), people: vi.fn(async () => ({ items: [] })) } }));

import toast from 'react-hot-toast';
import { activityApi, notificationApi, reportApi } from '../src/services/notificationApi';
import { downloadFile } from '../src/services/resourceService';
import NotificationBell from '../src/components/NotificationBell';
import NotificationsPage from '../src/pages/shared/NotificationsPage';
import ActivityLogPage, { summarize } from '../src/pages/admin/ActivityLogPage';
import ReportsPage from '../src/pages/shared/ReportsPage';
import DashboardLayout from '../src/layouts/DashboardLayout';
import { safeLink, timeAgo } from '../src/utils/format';

const login = (role, permissions = []) => { globalThis.__auth = { user: { _id: 'u1', name: 'Meera Rao', email: 'm@x.org', role, permissions }, hasPermission: (p) => role === 'admin' || permissions.includes(p), logout: vi.fn() }; };
const paged = (items, extra = {}) => ({ items, pagination: { page: 1, limit: 10, total: items.length, pages: 1 }, ...extra });
const note = (o) => ({ _id: o.id, title: o.title, read: false, type: 'task-assigned', createdAt: new Date().toISOString(), link: '/volunteer/tasks', ...o });
const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
const shell = (ui, path = '/manager') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<>{ui}<Where /></>} /></Routes></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('helpers', () => {
  it('time ago wording', () => {
    expect(timeAgo(new Date())).toBe('just now');
    expect(timeAgo(new Date(Date.now() - 5 * 60000))).toBe('5 min ago');
    expect(timeAgo(new Date(Date.now() - 3 * 3600000))).toBe('3 h ago');
    expect(timeAgo(new Date(Date.now() - 2 * 86400000))).toBe('2 d ago');
  });
  it('only follows links inside the app', () => {
    expect(safeLink('/manager/tasks')).toBe('/manager/tasks');
    expect(safeLink('https://evil.example')).toBeNull();
    expect(safeLink('//evil.example')).toBeNull();
    expect(safeLink('javascript:alert(1)')).toBeNull();
    expect(safeLink(undefined)).toBeNull();
  });
  it('summarises activity entries', () => {
    expect(summarize({ action: 'update', newValue: { status: 'done', title: 'x' } })).toBe('Changed: status, title');
    expect(summarize({ action: 'create', newValue: { name: 'Vik' } })).toBe('Vik');
    expect(summarize({ action: 'delete', previousValue: { name: 'Old' } })).toBe('Old');
    expect(summarize({ action: 'login' })).toBe('');
  });
});

describe('notification bell', () => {
  it('shows the unread count, lists items, marks one read and goes to its page', async () => {
    login('manager');
    notificationApi.unread.mockResolvedValue(3);
    notificationApi.list.mockResolvedValue({ items: [note({ id: 'n1', title: 'New task: Pack kits', message: 'Due 2026-11-03' }), note({ id: 'n2', title: 'Old news', read: true, link: 'https://evil.example' })], unread: 3 });
    notificationApi.markRead.mockResolvedValue();
    shell(<NotificationBell role="manager" />);
    const bell = await screen.findByRole('button', { name: 'Notifications, 3 unread' });
    await userEvent.click(bell);
    expect(await screen.findByText('New task: Pack kits')).toBeTruthy();
    expect(screen.getByText('Due 2026-11-03')).toBeTruthy();
    await userEvent.click(screen.getByText('New task: Pack kits'));
    expect(notificationApi.markRead).toHaveBeenCalledWith('n1');
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/volunteer/tasks'));
  });
  it('does not mark an already-read item and refuses outside links', async () => {
    login('manager');
    notificationApi.unread.mockResolvedValue(0);
    notificationApi.list.mockResolvedValue({ items: [note({ id: 'n2', title: 'Old news', read: true, link: 'https://evil.example' })], unread: 0 });
    shell(<NotificationBell role="manager" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    await userEvent.click(await screen.findByText('Old news'));
    expect(notificationApi.markRead).not.toHaveBeenCalled();
    expect(screen.getByTestId('where').textContent).toBe('/manager');
  });
  it('mark all as read, empty state and error with retry', async () => {
    login('manager');
    notificationApi.unread.mockResolvedValue(2);
    notificationApi.list.mockResolvedValue({ items: [note({ id: 'n1', title: 'A' })], unread: 2 });
    notificationApi.markAllRead.mockResolvedValue();
    shell(<NotificationBell role="manager" />);
    await userEvent.click(await screen.findByRole('button', { name: /Notifications, 2 unread/ }));
    await userEvent.click(await screen.findByText('Mark all as read'));
    expect(notificationApi.markAllRead).toHaveBeenCalled();
    cleanup();
    notificationApi.unread.mockResolvedValue(0);
    notificationApi.list.mockResolvedValue({ items: [], unread: 0 });
    shell(<NotificationBell role="volunteer" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText(/all caught up/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See all notifications' }).getAttribute('href')).toBe('/volunteer/notifications');
    cleanup();
    notificationApi.list.mockRejectedValueOnce(new Error('x'));
    shell(<NotificationBell role="manager" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText(/Could not load notifications/)).toBeTruthy();
    await userEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText(/all caught up/)).toBeTruthy();
  });
  it('shows 99+ and a quiet bell when the count call fails', async () => {
    login('manager');
    notificationApi.unread.mockResolvedValue(250);
    shell(<NotificationBell role="manager" />);
    expect((await screen.findByRole('button', { name: /250 unread/ })).textContent).toBe('99+');
    cleanup();
    notificationApi.unread.mockRejectedValue(new Error('x'));
    shell(<NotificationBell role="manager" />);
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeTruthy();
  });
});

describe('notifications page', () => {
  it('lists, filters to unread, marks read, deletes, and clears read', async () => {
    login('volunteer');
    notificationApi.list.mockResolvedValue(paged([note({ id: 'n1', title: 'Task due tomorrow: Banners', type: 'task-deadline' }), note({ id: 'n2', title: 'Read one', read: true })], { unread: 1 }));
    notificationApi.markRead.mockResolvedValue(); notificationApi.remove.mockResolvedValue(); notificationApi.clearRead.mockResolvedValue();
    shell(<NotificationsPage />, '/volunteer/notifications');
    expect(await screen.findByText('Task due tomorrow: Banners')).toBeTruthy();
    expect(screen.getByText('1 unread')).toBeTruthy();
    await userEvent.click(screen.getByLabelText('Mark as read: Task due tomorrow: Banners'));
    expect(notificationApi.markRead).toHaveBeenCalledWith('n1');
    expect(screen.queryByLabelText('Mark as read: Read one')).toBeNull();
    await userEvent.click(screen.getByLabelText('Delete: Read one'));
    expect(notificationApi.remove).toHaveBeenCalledWith('n2');
    await userEvent.click(screen.getByRole('button', { name: /Clear read/ }));
    expect(notificationApi.clearRead).toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText('Show'), 'true');
    await waitFor(() => expect(notificationApi.list.mock.calls.some(([p]) => p.unread === 'true')).toBe(true));
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'food-low');
    await waitFor(() => expect(notificationApi.list.mock.calls.some(([p]) => p.type === 'food-low')).toBe(true));
  });
  it('empty state, failure toast and load error', async () => {
    login('volunteer');
    notificationApi.list.mockResolvedValue(paged([], { unread: 0 }));
    shell(<NotificationsPage />, '/volunteer/notifications');
    expect(await screen.findByText('No notifications yet')).toBeTruthy();
    cleanup();
    notificationApi.list.mockResolvedValue(paged([note({ id: 'n1', title: 'X' })], { unread: 1 }));
    notificationApi.remove.mockRejectedValue({ response: { data: { message: 'Notification not found' } } });
    shell(<NotificationsPage />, '/volunteer/notifications');
    await userEvent.click(await screen.findByLabelText('Delete: X'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Notification not found'));
    cleanup();
    notificationApi.list.mockRejectedValue(new Error('x'));
    shell(<NotificationsPage />, '/volunteer/notifications');
    expect(await screen.findByText('Could not load notifications')).toBeTruthy();
  });
});

describe('activity log', () => {
  const entry = { _id: 'a1', action: 'update', module: 'tasks', timestamp: '2026-10-31T10:00:00Z', user: { _id: 'u2', name: 'Vik', role: 'volunteer' }, previousValue: { status: 'assigned' }, newValue: { status: 'accepted' } };
  beforeEach(() => { activityApi.filters.mockResolvedValue({ modules: ['tasks', 'users'], actions: ['update', 'login'], users: [{ _id: 'u2', name: 'Vik', role: 'volunteer' }] }); });
  it('lists entries, expands before/after, filters and exports without paging params', async () => {
    login('admin');
    activityApi.list.mockResolvedValue(paged([entry, { _id: 'a2', action: 'login', module: 'auth', timestamp: '2026-10-31T09:00:00Z' }]));
    render(<ActivityLogPage />);
    expect(await screen.findByText('Changed: status')).toBeTruthy();
    expect(screen.getByText('Unknown person')).toBeTruthy();
    await userEvent.click(screen.getByLabelText('Show details of Update in Tasks'));
    const table = await screen.findByRole('table');
    expect(within(table).getByText('assigned')).toBeTruthy();
    expect(within(table).getByText('accepted')).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText('Module'), 'tasks');
    await userEvent.selectOptions(screen.getByLabelText('Person'), 'u2');
    await waitFor(() => expect(activityApi.list.mock.calls.some(([p]) => p.module === 'tasks' && p.user === 'u2' && p.page === 1)).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: /Export CSV/ }));
    expect(downloadFile).toHaveBeenCalledWith('/activity-logs/export', { params: { module: 'tasks', user: 'u2' }, fallbackName: 'activity-log.csv' });
  });
  it('ignores a backwards date range with a warning; shows empty and error states', async () => {
    login('admin');
    activityApi.list.mockResolvedValue(paged([]));
    render(<ActivityLogPage />);
    expect(await screen.findByText('No activity found')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('From'), '2026-03-01');
    await userEvent.type(screen.getByLabelText('To'), '2026-02-01');
    expect(await screen.findByRole('alert')).toBeTruthy();
    await waitFor(() => expect(activityApi.list.mock.calls.at(-1)[0].from).toBeUndefined());
    cleanup();
    activityApi.list.mockRejectedValue(new Error('x'));
    render(<ActivityLogPage />);
    expect(await screen.findByText('Could not load the activity log')).toBeTruthy();
  });
  it('export failure shows the server reason', async () => {
    login('admin');
    activityApi.list.mockResolvedValue(paged([entry]));
    downloadFile.mockRejectedValueOnce({ response: { data: { message: 'You do not have permission to perform this action' } } });
    render(<ActivityLogPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Export CSV/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You do not have permission to perform this action'));
  });
});

describe('reports', () => {
  const catalog = { canExport: true, items: [
    { key: 'donations', title: 'Donations', description: 'Money in.', filters: [{ param: 'status', label: 'Status', options: [{ value: 'received', label: 'Received' }] }, { param: 'from', label: 'Donated from', type: 'date' }, { param: 'to', label: 'Donated to', type: 'date' }] },
    { key: 'volunteers', title: 'Volunteers', description: 'People.', filters: [{ param: 'manager', label: 'Manager', type: 'manager', adminOnly: true }] },
  ] };
  const result = (key = 'donations', total = 2) => ({ report: { key, title: key }, columns: [{ key: 'donor', label: 'Donor', type: 'text' }, { key: 'amount', label: 'Amount (Rs.)', type: 'money' }], rows: [{ donor: 'Asha', amount: '1,500.00' }, { donor: 'Anonymous', amount: '' }].slice(0, total), total, truncated: false, summary: [{ label: 'Donations', value: String(total) }, { label: 'Money received (Rs.)', value: '1,500.00' }] });
  it('runs the first report, shows summary and rows, reruns on filter change and downloads with the filters', async () => {
    login('manager', ['reports.view', 'reports.export', 'donations.view']);
    reportApi.catalog.mockResolvedValue(catalog); reportApi.run.mockResolvedValue(result());
    render(<ReportsPage />);
    expect(await screen.findByText('1,500.00', { selector: 'td' })).toBeTruthy();
    expect(screen.getByText('Money received (Rs.)')).toBeTruthy();
    expect(screen.getByText('Showing 2 of 2 rows.')).toBeTruthy();
    expect(reportApi.run).toHaveBeenCalledWith('donations', {});
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'received');
    await userEvent.type(screen.getByLabelText('Donated from'), '2026-10-01');
    await waitFor(() => expect(reportApi.run).toHaveBeenLastCalledWith('donations', { status: 'received', from: '2026-10-01' }));
    await userEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    expect(downloadFile).toHaveBeenCalledWith('/reports/donations/export', { params: { status: 'received', from: '2026-10-01', format: 'pdf' }, fallbackName: 'donations.pdf' });
    await userEvent.click(screen.getByRole('button', { name: /Download CSV/ }));
    expect(downloadFile).toHaveBeenLastCalledWith('/reports/donations/export', { params: { status: 'received', from: '2026-10-01', format: 'csv' }, fallbackName: 'donations.csv' });
  });
  it('hides downloads without the export permission', async () => {
    login('manager', ['reports.view']);
    reportApi.catalog.mockResolvedValue({ ...catalog, canExport: false }); reportApi.run.mockResolvedValue(result());
    render(<ReportsPage />);
    await screen.findByText('Asha');
    expect(screen.queryByRole('button', { name: /Download/ })).toBeNull();
    expect(screen.getByText(/needs the export permission/)).toBeTruthy();
  });
  it('switching reports clears filters; the admin-only manager filter loads managers', async () => {
    login('admin');
    reportApi.catalog.mockResolvedValue(catalog); reportApi.run.mockImplementation(async (k) => result(k));
    render(<ReportsPage />);
    await screen.findByText('Asha');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'received');
    await userEvent.click(screen.getByRole('button', { name: /Volunteers/ }));
    await waitFor(() => expect(reportApi.run).toHaveBeenLastCalledWith('volunteers', {}));
    const m = await screen.findByLabelText('Manager');
    await waitFor(() => expect(within(m).getByText('Meera')).toBeTruthy());
    await userEvent.selectOptions(m, 'm1');
    await waitFor(() => expect(reportApi.run).toHaveBeenLastCalledWith('volunteers', { manager: 'm1' }));
  });
  it('shows empty result, truncation note, run error with retry, backwards range, download failure, empty catalogue', async () => {
    login('manager', ['reports.view', 'reports.export']);
    reportApi.catalog.mockResolvedValue(catalog);
    reportApi.run.mockResolvedValue(result('donations', 0));
    render(<ReportsPage />);
    expect(await screen.findByText('No records match these filters')).toBeTruthy();
    reportApi.run.mockResolvedValue({ ...result(), total: 20000, truncated: true });
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'received');
    expect(await screen.findByText(/Showing 2 of more than 20000 rows\. Download the report/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Donated from'), '2026-03-01');
    await userEvent.type(screen.getByLabelText('Donated to'), '2026-02-01');
    expect(await screen.findByRole('alert')).toBeTruthy();
    await waitFor(() => expect(reportApi.run.mock.calls.at(-1)[1].from).toBeUndefined());
    downloadFile.mockRejectedValueOnce({ response: { data: { message: 'You do not have permission to perform this action' } } });
    await userEvent.click(screen.getByRole('button', { name: /Download CSV/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You do not have permission to perform this action'));
    reportApi.run.mockRejectedValue(new Error('x'));
    await userEvent.click(screen.getByRole('button', { name: /Clear filters/ }));
    expect(await screen.findByText('Could not run this report')).toBeTruthy();
    cleanup();
    reportApi.catalog.mockResolvedValue({ canExport: false, items: [] });
    render(<ReportsPage />);
    expect(await screen.findByText('No reports available')).toBeTruthy();
  });
});

describe('layout', () => {
  it('shows the bell and only the sidebar items a person may use', async () => {
    notificationApi.unread.mockResolvedValue(0);
    login('manager', ['tasks.view', 'reports.view']);
    render(<MemoryRouter initialEntries={['/manager']}><Routes><Route path="/manager" element={<DashboardLayout />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeTruthy();
    const nav = screen.getAllByRole('navigation').find((n) => !n.getAttribute('aria-label'));
    const labels = within(nav).getAllByRole('link').map((l) => l.textContent);
    expect(labels).toEqual(['Dashboard', 'Tasks', 'Reports']);
    cleanup();
    login('admin');
    render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<DashboardLayout />} /></Routes></MemoryRouter>);
    const nav2 = screen.getAllByRole('navigation').find((n) => !n.getAttribute('aria-label'));
    const l2 = within(nav2).getAllByRole('link').map((l) => l.textContent);
    expect(l2).toContain('Activity log'); expect(l2).toContain('Reports');
    cleanup();
    login('volunteer', ['tasks.view', 'events.view']);
    render(<MemoryRouter initialEntries={['/volunteer']}><Routes><Route path="/volunteer" element={<DashboardLayout />} /></Routes></MemoryRouter>);
    const nav3 = screen.getAllByRole('navigation').find((n) => !n.getAttribute('aria-label'));
    expect(within(nav3).getAllByRole('link').map((l) => l.textContent)).toEqual(['Dashboard', 'My tasks', 'Events']);
  });
});
