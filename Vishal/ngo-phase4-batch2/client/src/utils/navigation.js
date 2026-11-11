import { Boxes, GraduationCap, HandHeart, HeartHandshake, LayoutDashboard, ShieldCheck, Soup, Users, Wallet } from 'lucide-react';

// Sidebar items per role. `permission` hides an item when the person lacks it.
// Later batches add Tasks, Events, Programs, ... here; they appear/disappear by permission automatically.
const modules = (prefix) => [
  { label: 'Volunteers', to: `${prefix}/volunteers`, icon: HandHeart, permission: 'volunteers.view' },
  { label: 'Students', to: `${prefix}/students`, icon: GraduationCap, permission: 'students.view' },
  { label: 'Beneficiaries', to: `${prefix}/beneficiaries`, icon: HeartHandshake, permission: 'beneficiaries.view' },
  { label: 'Donations', to: `${prefix}/donations`, icon: Wallet, permission: 'donations.view' },
  { label: 'Food', to: `${prefix}/food`, icon: Soup, permission: 'food.view' },
  { label: 'Resources', to: `${prefix}/resources`, icon: Boxes, permission: 'resources.view' },
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
