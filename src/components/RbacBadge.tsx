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
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-900">
            Read-Only / Restricted for {activeRoleDef.name}:
          </span>{' '}
          <span className="text-amber-800">
            Action <strong>"{actionLabel}"</strong> requires one of:{' '}
            {allowed.map((r) => r.shortLabel).join(', ') || 'No roles assigned'}.
          </span>
        </div>
      </div>
      {allowed.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-amber-700 mr-1">Quick Switch:</span>
          {allowed.slice(0, 3).map((r) => (
            <button
              key={r.id}
              onClick={() => switchRole(r.id)}
              className="px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition"
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
    Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Approved & Issued': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Delivered / Received': 'bg-teal-100 text-teal-800 border-teal-200',
    'Budget Verified': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Funds Certified': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Converted to PO': 'bg-blue-100 text-blue-800 border-blue-200',
    Submitted: 'bg-amber-100 text-amber-800 border-amber-200',
    'Needs Purchase (PR)': 'bg-orange-100 text-orange-800 border-orange-200',
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Returned: 'bg-rose-100 text-rose-800 border-rose-200',
    Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    'In Stock': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Low Stock': 'bg-amber-100 text-amber-800 border-amber-200',
    'Out of Stock': 'bg-rose-100 text-rose-800 border-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
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
