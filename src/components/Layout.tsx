import React, { useState } from 'react';
import {
  BarChart3,
  ClipboardCheck,
  DollarSign,
  FileSpreadsheet,
  FileText,
  FileUp,
  Layers,
  Menu,
  Package,
  Printer,
  RefreshCcw,
  Shield,
  ShoppingBag,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { ROLES } from '../data/rbac';
import { CurrencyCode, ModuleKey, RoleId } from '../types/procurement';
import { PrintableModal } from './PrintableDocumentSheet';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.FC<{ className?: string }>;
  group: 'Overview' | 'Planning & Fiscal' | 'Supply & Procurement' | 'Utilities & RBAC';
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Executive Dashboard', icon: BarChart3, group: 'Overview' },
  { key: 'fiscal', label: 'Fiscal & Budget Plan', icon: DollarSign, group: 'Planning & Fiscal' },
  { key: 'ppmp', label: 'PPMP Planning', icon: FileSpreadsheet, group: 'Planning & Fiscal' },
  { key: 'app_cse', label: 'APP-CSE Master', icon: Layers, group: 'Planning & Fiscal' },
  { key: 'inventory', label: 'Inventory & Ledger', icon: Package, group: 'Supply & Procurement' },
  { key: 'sr', label: 'Stock Requisition (SR)', icon: ClipboardCheck, group: 'Supply & Procurement' },
  { key: 'pr', label: 'Purchase Request (PR)', icon: FileText, group: 'Supply & Procurement' },
  { key: 'po', label: 'Purchase Order (PO)', icon: ShoppingBag, group: 'Supply & Procurement' },
  { key: 'upload', label: 'File Upload & Extract', icon: FileUp, group: 'Utilities & RBAC' },
  { key: 'print', label: 'Form & Print Studio', icon: Printer, group: 'Utilities & RBAC' },
  { key: 'rbac', label: 'RBAC & Audit Logs', icon: Shield, group: 'Utilities & RBAC' },
];

const GROUPS: NavItem['group'][] = [
  'Overview',
  'Planning & Fiscal',
  'Supply & Procurement',
  'Utilities & RBAC',
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    activePage,
    setActivePage,
    activeRoleDef,
    can,
    switchRole,
    setDeptUserScope,
    setFiscalYear,
    setCurrency,
    resetDemoData,
    toasts,
    dismissToast,
  } = useDemo();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (key: ModuleKey) => {
    setActivePage(key);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand-Free Neutral Logo Header */}
      <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-white tracking-tight">OpenProcure</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">
              APP-CSE Public Demo
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {GROUPS.map((group) => (
          <div key={group}>
            <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {group}
            </div>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((it) => it.group === group).map((item) => {
                const Icon = item.icon;
                const active = activePage === item.key;
                const allowed = can(item.key, 'view');
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    } ${!allowed ? 'opacity-50' : ''}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Active Persona Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2 text-xs">
        <div className="text-[10px] uppercase font-bold text-slate-500">Signed In (Demo Persona)</div>
        <div className="font-semibold text-white">{activeRoleDef.personaName}</div>
        <div className="text-[11px] text-blue-300">{activeRoleDef.name}</div>
        <button
          onClick={resetDemoData}
          className="w-full mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition"
        >
          <RefreshCcw className="w-3 h-3" /> Reset Sandbox Data
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Global Printable Modal */}
      <PrintableModal />

      {/* Public Demo Notice Strip (hidden on print) */}
      <div className="no-print bg-slate-950 text-slate-200 text-[11px] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase text-[10px] border border-emerald-500/30">
            Public Mock Sandbox
          </span>
          <span>
            Interactive browser-only demo (LocalStorage). Zero branding · Does not connect to or affect any legacy deployment.
          </span>
        </div>
        <button
          onClick={resetDemoData}
          className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 font-semibold"
        >
          <RefreshCcw className="w-3 h-3" /> Reset Demo State
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-slate-200">
          <div className="sticky top-0 h-screen">{sidebarContent}</div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="no-print fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
            <div className="relative w-64 max-w-[80vw] h-full z-10">{sidebarContent}</div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 rounded-lg border border-slate-300 text-slate-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  {NAV_ITEMS.find((n) => n.key === activePage)?.label}
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {state.entityName} · FY {state.activeFiscalYear}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Fiscal Year Picker */}
              <select
                value={state.activeFiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                title="Active Fiscal Year"
              >
                {state.fiscalYears.map((fy) => (
                  <option key={fy.year} value={fy.year}>
                    FY {fy.year}
                  </option>
                ))}
              </select>

              {/* Currency Switcher */}
              <select
                value={state.currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-semibold text-slate-700"
                title="Display Currency"
              >
                <option value="PHP">₱ PHP</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>

              {/* Live RBAC Role Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                  RBAC Role:
                </span>
                <select
                  value={state.activeRole}
                  onChange={(e) => switchRole(e.target.value as RoleId)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.personaName})
                    </option>
                  ))}
                </select>
              </div>

              {state.activeRole === 'DEPT_USER' && (
                <select
                  value={state.activeDeptUserScope}
                  onChange={(e) => setDeptUserScope(e.target.value)}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 font-semibold text-amber-900"
                  title="Department Scope"
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

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
        </div>
      </div>

      {/* Toast Notifications */}
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
