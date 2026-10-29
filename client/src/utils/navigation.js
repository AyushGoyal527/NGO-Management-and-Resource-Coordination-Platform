import { LayoutDashboard, Users, ShieldCheck } from 'lucide-react';

// Sidebar items per role. `permission` hides an item when the person lacks it.
// Later phases add Volunteers, Students, Tasks, Donations, ... here; they appear/disappear by permission automatically.
export const navigation = {
  admin: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Users', to: '/admin/users', icon: Users, permission: 'users.view' },
    { label: 'Permissions', to: '/admin/permissions', icon: ShieldCheck, permission: 'users.edit' },
  ],
  manager: [{ label: 'Dashboard', to: '/manager', icon: LayoutDashboard, end: true }],
  volunteer: [{ label: 'Dashboard', to: '/volunteer', icon: LayoutDashboard, end: true }],
};
