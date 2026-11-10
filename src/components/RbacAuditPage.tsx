import React, { useState } from 'react';
import { Check, History, RotateCcw, Search, Shield, ShieldAlert, UserCheck } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { ACTION_LABELS, MODULE_METADATA, ROLES } from '../data/rbac';
import { ActionKey, ModuleKey } from '../types/procurement';
import { RbacNoticeBanner } from './RbacBadge';

const MODULE_POSSIBLE_ACTIONS: Record<ModuleKey, ActionKey[]> = {
  dashboard: ['view'],
  fiscal: ['view', 'create', 'edit', 'allocate', 'print'],
  ppmp: ['view', 'create', 'edit', 'certify_budget', 'approve', 'upload', 'print'],
  app_cse: ['view', 'create', 'approve', 'print'],
  inventory: ['view', 'create', 'edit', 'receive', 'issue', 'upload', 'print'],
  sr: ['view', 'create', 'edit', 'approve', 'issue', 'print'],
  pr: ['view', 'create', 'edit', 'certify_budget', 'approve', 'print'],
  po: ['view', 'create', 'edit', 'approve', 'issue', 'receive', 'print'],
  upload: ['view', 'upload', 'create'],
  print: ['view', 'print', 'create'],
  rbac: ['view', 'edit', 'admin'],
};

export const RbacAuditPage: React.FC = () => {
  const {
    state,
    can,
    switchRole,
    setDeptUserScope,
    togglePermission,
    resetPermissionsToDefault,
  } = useDemo();

  const [auditSearch, setAuditSearch] = useState('');
  const canAdminRbac = can('rbac', 'admin');

  const filteredLogs = state.auditLogs.filter((log) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.documentNo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Role-Based Access Control (RBAC) & Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Switch between 6 institutional roles, inspect or test permission boundaries live, and review immutable demo audit logs.
          </p>
        </div>

        {canAdminRbac && (
          <button
            onClick={resetPermissionsToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore Default RBAC Matrix
          </button>
        )}
      </div>

      <RbacNoticeBanner
        module="rbac"
        action="admin"
        actionLabel="Modify Live RBAC Permission Rules"
      />

      {/* Persona Switcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const isActive = state.activeRole === role.id;
          return (
            <div
              key={role.id}
              className={`rounded-xl border p-4 transition ${
                isActive
                  ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${role.badgeColor}`}
                  >
                    {role.name}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{role.personaName}</h3>
                  <p className="text-[11px] font-medium text-slate-500">{role.personaTitle}</p>
                </div>
                <button
                  onClick={() => switchRole(role.id)}
                  disabled={isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isActive ? 'Active Role' : 'Switch Role'}
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">{role.description}</p>

              {role.id === 'DEPT_USER' && isActive && (
                <div className="mt-3 pt-2 border-t border-blue-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900">Scoped Department:</span>
                  <select
                    value={state.activeDeptUserScope}
                    onChange={(e) => setDeptUserScope(e.target.value)}
                    className="rounded border border-blue-300 bg-white px-2 py-1 text-xs"
                  >
                    {state.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Permission Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Live Role × Module Permission Matrix
            </h3>
            <p className="text-xs text-slate-500">
              {canAdminRbac
                ? 'System Admin mode active: Click any permission chip below to toggle it live and test enforcement across modules.'
                : 'Viewing read-only RBAC permission rules. Switch to System Administrator to live-edit rules.'}
            </p>
          </div>
          {!canAdminRbac && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <ShieldAlert className="w-3.5 h-3.5" /> Read-Only Matrix
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3 w-52">Module</th>
                {ROLES.map((r) => (
                  <th
                    key={r.id}
                    className={`px-3 py-3 text-center min-w-[140px] ${
                      state.activeRole === r.id ? 'bg-blue-50/80 text-blue-800' : ''
                    }`}
                  >
                    {r.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULE_METADATA.map((mod) => {
                const possibleActions = MODULE_POSSIBLE_ACTIONS[mod.key];
                return (
                  <tr key={mod.key} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-900">{mod.label}</div>
                      <div className="text-[10.5px] text-slate-400">{mod.description}</div>
                    </td>
                    {ROLES.map((role) => {
                      const granted = state.permissionMatrix[role.id]?.[mod.key] || [];
                      return (
                        <td
                          key={role.id}
                          className={`px-2.5 py-2.5 align-top ${
                            state.activeRole === role.id ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className="flex flex-wrap gap-1 justify-center">
                            {possibleActions.map((act) => {
                              const has = granted.includes(act);
                              return (
                                <button
                                  key={act}
                                  type="button"
                                  disabled={!canAdminRbac}
                                  onClick={() => togglePermission(role.id, mod.key, act)}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                                    has
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 opacity-70'
                                  } ${canAdminRbac ? 'hover:ring-1 hover:ring-blue-400 cursor-pointer' : 'cursor-default'}`}
                                  title={`${role.name} · ${mod.label} · ${ACTION_LABELS[act]}`}
                                >
                                  {has && <Check className="w-2.5 h-2.5" />}
                                  {ACTION_LABELS[act]}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            Sandbox Activity & Security Audit Trail ({filteredLogs.length})
          </h3>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actor, doc no, action..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase sticky top-0">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Actor & Role</th>
                <th className="px-3 py-2.5">Module</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-900 inline-flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      {log.actor}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{log.roleId}</div>
                  </td>
                  <td className="px-3 py-2.5 uppercase font-mono text-[10px] text-slate-600">
                    {log.module}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">
                    {log.action}
                    {log.documentNo && (
                      <span className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                        {log.documentNo}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
