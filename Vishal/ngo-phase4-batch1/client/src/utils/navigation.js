import { GraduationCap, HandHeart, HeartHandshake, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';

// Sidebar items per role. `permission` hides an item when the person lacks it.
// Later batches add Tasks, Donations, Food, ... here; they appear/disappear by permission automatically.
const modules = (prefix) => [
  { label: 'Volunteers', to: `${prefix}/volunteers`, icon: HandHeart, permission: 'volunteers.view' },
  { label: 'Students', to: `${prefix}/students`, icon: GraduationCap, permission: 'students.view' },
  { label: 'Beneficiaries', to: `${prefix}/beneficiaries`, icon: HeartHandshake, permission: 'beneficiaries.view' },
];

export const navigation = {
  admin: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
    ...modules('/admin'),
    { label: 'Users', to: '/admin/users', icon: Users, permission: 'users.view' },
    { label: 'Permissions', to: '/admin/permissions', icon: ShieldCheck, permission: 'users.edit' },
  ],
  manager: [{ label: 'Dashboard', to: '/manager', icon: LayoutDashboard, end: true }, ...modules('/manager')],
  volunteer: [{ label: 'Dashboard', to: '/volunteer', icon: LayoutDashboard, end: true }],
};
