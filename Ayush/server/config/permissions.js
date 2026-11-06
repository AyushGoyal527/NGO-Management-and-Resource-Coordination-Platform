// Single source of truth for roles, statuses and the module.action permission catalog.
const ROLES = ['admin', 'manager', 'volunteer'];
const USER_STATUSES = ['active', 'inactive', 'pending', 'archived'];

const MODULES = {
  volunteers: ['view', 'create', 'edit', 'delete'],
  students: ['view', 'create', 'edit', 'delete'],
  beneficiaries: ['view', 'create', 'edit', 'delete'],
  donations: ['view', 'create', 'edit', 'delete'],
  food: ['view', 'create', 'edit', 'delete', 'distribute'],
  resources: ['view', 'create', 'edit', 'delete'],
  tasks: ['view', 'create', 'edit', 'delete', 'assign'],
  events: ['view', 'create', 'edit', 'delete'],
  reports: ['view', 'create', 'export'],
  users: ['view', 'create', 'edit', 'delete'],
  settings: ['view', 'edit'],
};

const ALL_PERMISSIONS = Object.entries(MODULES).flatMap(([m, actions]) => actions.map((a) => `${m}.${a}`));

const DEFAULTS = {
  admin: [], // admins bypass permission checks
  manager: [
    'volunteers.view', 'volunteers.create', 'volunteers.edit',
    'students.view', 'students.create', 'students.edit',
    'beneficiaries.view', 'beneficiaries.create', 'beneficiaries.edit',
    'food.view', 'food.create', 'food.edit', 'food.distribute',
    'resources.view', 'resources.create', 'resources.edit',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign',
    'events.view', 'events.create', 'events.edit',
    'reports.view',
  ],
  volunteer: ['tasks.view', 'events.view'],
};

const defaultPermissionsFor = (role) => [...(DEFAULTS[role] || [])];

// Keeps only known permissions, de-duplicates, and makes sure any granted action also grants "<module>.view".
function normalizePermissions(list = []) {
  const set = new Set(list.filter((p) => ALL_PERMISSIONS.includes(p)));
  for (const p of [...set]) set.add(`${p.split('.')[0]}.view`);
  return [...set];
}

module.exports = { ROLES, USER_STATUSES, MODULES, ALL_PERMISSIONS, defaultPermissionsFor, normalizePermissions };
