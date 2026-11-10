import React, { useState } from 'react';
import {
  FileUp,
  Home,
  Layers,
  Menu,
  Package,
  RefreshCcw,
  Shield,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { ROLES } from '../data/rbac';
import { CurrencyCode, ModuleKey, RoleId } from '../types/procurement';
import { PrintableModal } from './PrintableDocumentSheet';

type WorkspaceGroup = 'home' | 'planning' | 'procurement' | 'tools' | 'rbac';

const WORKSPACE_NAV: Array<{
  id: WorkspaceGroup;
  label: string;
  helper: string;
  defaultPage: ModuleKey;
  pages: ModuleKey[];
  icon: React.FC<{ className?: string }>;
}> = [
  {
    id: 'home',
    label: 'Home & My Tasks',
    helper: 'Overview & guided next steps',
    defaultPage: 'dashboard',
    pages: ['dashboard'],
    icon: Home,
  },
  {
    id: 'planning',
    label: 'Planning & Budgets',
    helper: 'Allocations, PPMP, APP-CSE',
    defaultPage: 'fiscal',
    pages: ['fiscal', 'ppmp', 'app_cse'],
    icon: Layers,
  },
  {
    id: 'procurement',
    label: 'Supply & Procurement',
    helper: 'Inventory → SR → PR → PO',
    defaultPage: 'inventory',
    pages: ['inventory', 'sr', 'pr', 'po'],
    icon: Package,
  },
  {
    id: 'tools',
    label: 'Import & Print',
    helper: 'File extraction & physical forms',
    defaultPage: 'upload',
    pages: ['upload', 'print'],
    icon: FileUp,
  },
  {
    id: 'rbac',
    label: 'Roles & Audit',
    helper: 'Switch roles, RBAC & logs',
    defaultPage: 'rbac',
    pages: ['rbac'],
    icon: Shield,
  },
];

const PLANNING_TABS: Array<{ key: ModuleKey; label: string }> = [
  { key: 'fiscal', label: 'Budget Allocations & Calculator' },
  { key: 'ppmp', label: 'Department PPMPs' },
  { key: 'app_cse', label: 'Consolidated APP-CSE' },
];

const PROCUREMENT_TABS: Array<{ key: ModuleKey; step: string; label: string }> = [
  { key: 'inventory', step: '1', label: 'Inventory Stock' },
  { key: 'sr', step: '2', label: 'Stock Request (SR)' },
  { key: 'pr', step: '3', label: 'Purchase Request (PR)' },
  { key: 'po', step: '4', label: 'Purchase Order (PO)' },
];

const TOOL_TABS: Array<{ key: ModuleKey; label: string }> = [
  { key: 'upload', label: 'Upload & Extract File' },
  { key: 'print', label: 'Form & Print Studio' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    activePage,
    setActivePage,
    activeRoleDef,
    switchRole,
    setDeptUserScope,
    setFiscalYear,
    setCurrency,
    resetDemoData,
    toasts,
    dismissToast,
  } = useDemo();

  const [mobileOpen, setMobileOpen] = useState(false);

  const currentGroup =
    WORKSPACE_NAV.find((w) => w.pages.includes(activePage))?.id || 'home';

  const handleNav = (page: ModuleKey) => {
    setActivePage(page);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 text-slate-700">
      {/* Clean Neutral Header */}
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">OpenProcure</div>
            <div className="text-[11px] text-slate-500">APP-CSE Public Sandbox</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 5 Calm Workspace Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {WORKSPACE_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = currentGroup === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.defaultPage)}
              className={`w-full text-left px-3.5 py-3 rounded-xl transition flex items-start gap-3 ${
                isActive
                  ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200/80'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              <div>
                <div className={`text-xs font-semibold ${isActive ? 'text-blue-950' : 'text-slate-800'}`}>
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{item.helper}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Quiet Sandbox Persona Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Persona
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
            Local Demo
          </span>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{activeRoleDef.personaName}</div>
          <div className="text-[11px] text-slate-500">{activeRoleDef.name}</div>
        </div>
        <button
          onClick={resetDemoData}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-semibold transition"
        >
          <RefreshCcw className="w-3 h-3" /> Reset Demo Data
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 text-slate-900">
      <PrintableModal />

      <div className="flex-1 flex min-h-0">
        <aside className="no-print hidden lg:block w-64 shrink-0">
          <div className="sticky top-0 h-screen">{sidebarContent}</div>
        </aside>

        {mobileOpen && (
          <div className="no-print fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
            <div className="relative w-64 max-w-[82vw] h-full z-10">{sidebarContent}</div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Calm Top Bar */}
          <header className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-800">{state.entityName}</span>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="hidden sm:inline text-slate-400">
                  Browser Sandbox (No Legacy Connection)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={state.activeFiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-700"
                title="Fiscal Year"
              >
                {state.fiscalYears.map((fy) => (
                  <option key={fy.year} value={fy.year}>
                    FY {fy.year}
                  </option>
                ))}
              </select>

              <select
                value={state.currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-semibold text-slate-700"
                title="Currency"
              >
                <option value="PHP">₱ PHP</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>

              <div className="flex items-center gap-1.5 bg-blue-50/70 rounded-lg px-2.5 py-1 border border-blue-200/70">
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <select
                  value={state.activeRole}
                  onChange={(e) => switchRole(e.target.value as RoleId)}
                  className="bg-transparent font-semibold text-blue-950 focus:outline-none cursor-pointer"
                  title="Switch RBAC Demo Role"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      Role: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {state.activeRole === 'DEPT_USER' && (
                <select
                  value={state.activeDeptUserScope}
                  onChange={(e) => setDeptUserScope(e.target.value)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 font-semibold text-amber-900"
                >
                  {state.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      Unit: {d.code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </header>

          {/* Clean Contextual Sub-Navigation Tabs */}
          {currentGroup === 'planning' && (
            <div className="no-print bg-white border-b border-slate-200/80 px-4 sm:px-8 pt-2">
              <div className="max-w-6xl mx-auto flex flex-wrap gap-1">
                {PLANNING_TABS.map((t) => {
                  const active = activePage === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActivePage(t.key)}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                        active
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentGroup === 'procurement' && (
            <div className="no-print bg-white border-b border-slate-200/80 px-4 sm:px-8 pt-2">
              <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-1.5">
                {PROCUREMENT_TABS.map((t, idx) => {
                  const active = activePage === t.key;
                  return (
                    <React.Fragment key={t.key}>
                      <button
                        onClick={() => setActivePage(t.key)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition ${
                          active
                            ? 'border-blue-600 text-blue-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full text-[10px] font-bold inline-flex items-center justify-center ${
                            active
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.step}
                        </span>
                        {t.label}
                      </button>
                      {idx < PROCUREMENT_TABS.length - 1 && (
                        <span className="text-slate-300 text-xs hidden sm:inline">→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {currentGroup === 'tools' && (
            <div className="no-print bg-white border-b border-slate-200/80 px-4 sm:px-8 pt-2">
              <div className="max-w-6xl mx-auto flex flex-wrap gap-1">
                {TOOL_TABS.map((t) => {
                  const active = activePage === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActivePage(t.key)}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                        active
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Airy Page Container */}
          <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
        </div>
      </div>

      {/* Subtle Toast Notifications */}
      <div className="no-print fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => {
          const colors =
            t.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : t.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-700'
              : t.type === 'info'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-emerald-900 text-white border-emerald-700';
          return (
            <div
              key={t.id}
              className={`rounded-xl border px-4 py-3 text-xs font-medium shadow-lg flex items-start justify-between gap-3 ${colors}`}
            >
              <span>{t.text}</span>
              <button onClick={() => dismissToast(t.id)} className="opacity-70 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
