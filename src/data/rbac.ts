import { ActionKey, ModuleKey, PermissionMatrix, RoleDefinition, RoleId } from '../types/procurement';

export const ROLES: RoleDefinition[] = [
  {
    id: 'SUPER_ADMIN',
    name: 'System Administrator',
    shortLabel: 'SysAdmin',
    personaName: 'Alex Mercer',
    personaTitle: 'Platform & Governance Admin',
    defaultDepartmentId: 'ADMIN',
    badgeColor: 'bg-slate-900 text-white border-slate-700',
    description:
      'Full administrative control over fiscal settings, RBAC permission matrix, all procurement workflows, inventory, and audit logs.',
  },
  {
    id: 'BUDGET_OFFICER',
    name: 'Fiscal & Budget Officer',
    shortLabel: 'Budget',
    personaName: 'Morgan Reyes',
    personaTitle: 'Chief Budget & Fiscal Analyst',
    defaultDepartmentId: 'FIN',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description:
      'Configures fiscal year ceilings, allocates departmental MOOE & Capital Outlay budgets, verifies PPMPs, and certifies PR funds availability.',
  },
  {
    id: 'PROCUREMENT_OFFICER',
    name: 'Procurement / BAC Officer',
    shortLabel: 'Procurement',
    personaName: 'Taylor Santos',
    personaTitle: 'Procurement & Contracts Lead',
    defaultDepartmentId: 'ADMIN',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description:
      'Consolidates approved PPMPs into the master APP-CSE, validates PRs, generates and issues Purchase Orders (PO) to suppliers.',
  },
  {
    id: 'SUPPLY_CUSTODIAN',
    name: 'Supply & Inventory Custodian',
    shortLabel: 'Supply',
    personaName: 'Jordan Navarro',
    personaTitle: 'Property & Warehouse Custodian',
    defaultDepartmentId: 'OPS',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description:
      'Maintains the stock catalog, approves & issues Stock Requisitions (SR), receives PO deliveries into stock, and manages reorder alerts.',
  },
  {
    id: 'DEPT_USER',
    name: 'Department End-User',
    shortLabel: 'Dept User',
    personaName: 'Casey Lim',
    personaTitle: 'Department Planning Representative',
    defaultDepartmentId: 'IT',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description:
      'Prepares and submits departmental PPMPs, creates Stock Requisitions (SR) and Purchase Requests (PR), extracts uploaded files, and prints forms.',
  },
  {
    id: 'HOPE_APPROVER',
    name: 'Approving Authority (HOPE)',
    shortLabel: 'HOPE',
    personaName: 'Riley Cruz',
    personaTitle: 'Head of Procuring Entity',
    defaultDepartmentId: 'ADMIN',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description:
      'Reviews agency-wide fiscal utilization and grants final executive approval on PPMPs, APP-CSE, Purchase Requests, and Purchase Orders.',
  },
];

export const MODULE_METADATA: Array<{ key: ModuleKey; label: string; description: string }> = [
  { key: 'dashboard', label: 'Executive Dashboard', description: 'KPIs, alerts, and role-specific queue' },
  { key: 'fiscal', label: 'Fiscal Planning & Budgets', description: 'Ceilings, department allocations & tax calc' },
  { key: 'ppmp', label: 'PPMP Planning', description: 'Department quarterly procurement plans' },
  { key: 'app_cse', label: 'APP-CSE Consolidation', description: 'Consolidated annual CSE & Non-CSE plan' },
  { key: 'inventory', label: 'Inventory & Stock Ledger', description: 'Warehouse stock, alerts & movements' },
  { key: 'sr', label: 'Stock Requisition (SR)', description: 'Warehouse stock requests & issuance' },
  { key: 'pr', label: 'Purchase Request (PR)', description: 'Procurement requests & budget check' },
  { key: 'po', label: 'Purchase Order (PO)', description: 'Supplier PO generation & receiving' },
  { key: 'upload', label: 'File Upload & Extract', description: 'CSV, Excel, JSON, TXT, PDF extraction' },
  { key: 'print', label: 'Form Generator & Print', description: 'Physical copy document generator' },
  { key: 'rbac', label: 'RBAC & Audit Logs', description: 'Permission matrix & activity trail' },
];

export const ACTION_LABELS: Record<ActionKey, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  approve: 'Approve',
  certify_budget: 'Certify Funds',
  issue: 'Issue / Release',
  receive: 'Receive Goods',
  allocate: 'Allocate Budget',
  upload: 'Upload & Extract',
  print: 'Print Forms',
  admin: 'Administer RBAC',
};

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  SUPER_ADMIN: {
    dashboard: ['view'],
    fiscal: ['view', 'create', 'edit', 'allocate', 'print'],
    ppmp: ['view', 'create', 'edit', 'approve', 'certify_budget', 'upload', 'print'],
    app_cse: ['view', 'create', 'approve', 'print'],
    inventory: ['view', 'create', 'edit', 'receive', 'issue', 'upload', 'print'],
    sr: ['view', 'create', 'edit', 'approve', 'issue', 'print'],
    pr: ['view', 'create', 'edit', 'certify_budget', 'approve', 'print'],
    po: ['view', 'create', 'edit', 'approve', 'issue', 'receive', 'print'],
    upload: ['view', 'upload', 'create'],
    print: ['view', 'print', 'create'],
    rbac: ['view', 'admin', 'edit'],
  },
  BUDGET_OFFICER: {
    dashboard: ['view'],
    fiscal: ['view', 'create', 'edit', 'allocate', 'print'],
    ppmp: ['view', 'certify_budget', 'print'],
    app_cse: ['view', 'print'],
    inventory: ['view'],
    sr: ['view', 'print'],
    pr: ['view', 'certify_budget', 'print'],
    po: ['view', 'certify_budget', 'print'],
    upload: ['view', 'upload'],
    print: ['view', 'print', 'create'],
    rbac: ['view'],
  },
  PROCUREMENT_OFFICER: {
    dashboard: ['view'],
    fiscal: ['view'],
    ppmp: ['view', 'edit', 'print'],
    app_cse: ['view', 'create', 'print'],
    inventory: ['view'],
    sr: ['view', 'print'],
    pr: ['view', 'create', 'edit', 'print'],
    po: ['view', 'create', 'edit', 'issue', 'print'],
    upload: ['view', 'upload', 'create'],
    print: ['view', 'print', 'create'],
    rbac: ['view'],
  },
  SUPPLY_CUSTODIAN: {
    dashboard: ['view'],
    fiscal: ['view'],
    ppmp: ['view'],
    app_cse: ['view', 'print'],
    inventory: ['view', 'create', 'edit', 'receive', 'issue', 'upload', 'print'],
    sr: ['view', 'create', 'approve', 'issue', 'print'],
    pr: ['view', 'create', 'print'],
    po: ['view', 'receive', 'print'],
    upload: ['view', 'upload', 'create'],
    print: ['view', 'print', 'create'],
    rbac: ['view'],
  },
  DEPT_USER: {
    dashboard: ['view'],
    fiscal: ['view'],
    ppmp: ['view', 'create', 'edit', 'upload', 'print'],
    app_cse: ['view', 'print'],
    inventory: ['view'],
    sr: ['view', 'create', 'edit', 'print'],
    pr: ['view', 'create', 'edit', 'print'],
    po: ['view', 'print'],
    upload: ['view', 'upload', 'create'],
    print: ['view', 'print', 'create'],
    rbac: ['view'],
  },
  HOPE_APPROVER: {
    dashboard: ['view'],
    fiscal: ['view', 'print'],
    ppmp: ['view', 'approve', 'print'],
    app_cse: ['view', 'approve', 'print'],
    inventory: ['view'],
    sr: ['view', 'approve', 'print'],
    pr: ['view', 'approve', 'print'],
    po: ['view', 'approve', 'print'],
    upload: ['view'],
    print: ['view', 'print'],
    rbac: ['view'],
  },
};

export function hasPermission(
  matrix: PermissionMatrix,
  role: RoleId,
  module: ModuleKey,
  action: ActionKey
): boolean {
  const rolePerms = matrix[role];
  if (!rolePerms) return false;
  const modulePerms = rolePerms[module];
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}

export function getAuthorizedRolesForAction(
  matrix: PermissionMatrix,
  module: ModuleKey,
  action: ActionKey
): RoleDefinition[] {
  return ROLES.filter((r) => hasPermission(matrix, r.id, module, action));
}
