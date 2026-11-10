import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { ActionKey, ModuleKey } from '../types/procurement';
import { getAuthorizedRolesForAction } from '../data/rbac';
import { useDemo } from '../context/DemoContext';

export const RbacNoticeBanner: React.FC<{
  module: ModuleKey;
  action: ActionKey;
  actionLabel: string;
}> = ({ module, action, actionLabel }) => {
  const { state, can, switchRole, activeRoleDef } = useDemo();
  if (can(module, action)) return null;

  const allowed = getAuthorizedRolesForAction(state.permissionMatrix, module, action);

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-amber-900">
        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>
          <strong>View-only mode</strong> for {activeRoleDef.name} — “{actionLabel}” requires:{' '}
          <span className="font-medium">
            {allowed.map((r) => r.shortLabel).join(', ') || 'Admin'}
          </span>
          .
        </span>
      </div>
      {allowed.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {allowed.slice(0, 2).map((r) => (
            <button
              key={r.id}
              onClick={() => switchRole(r.id)}
              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300/80 text-amber-900 font-semibold hover:bg-amber-100/70 transition text-[11px]"
            >
              Switch to {r.shortLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Approved & Issued': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Delivered / Received': 'bg-teal-50 text-teal-700 border-teal-200',
    'Budget Verified': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Funds Certified': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Converted to PO': 'bg-blue-50 text-blue-700 border-blue-200',
    Submitted: 'bg-amber-50 text-amber-700 border-amber-200',
    'Needs Purchase (PR)': 'bg-orange-50 text-orange-700 border-orange-200',
    Draft: 'bg-slate-100 text-slate-600 border-slate-200',
    Returned: 'bg-rose-50 text-rose-700 border-rose-200',
    Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    'In Stock': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Low Stock': 'bg-amber-50 text-amber-700 border-amber-200',
    'Out of Stock': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
        styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      {status}
    </span>
  );
};

export const RolePill: React.FC = () => {
  const { activeRoleDef } = useDemo();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${activeRoleDef.badgeColor}`}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      {activeRoleDef.name}
    </span>
  );
};
