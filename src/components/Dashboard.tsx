import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileUp,
  Package,
  Printer,
  Shield,
  Wallet,
} from 'lucide-react';
import { calcPoSubtotal, calcPpmpTotal, calcPrTotal, useDemo } from '../context/DemoContext';
import { ModuleKey } from '../types/procurement';
import { formatCompactCurrency, formatCurrency } from '../utils/formatters';
import { StatusBadge } from './RbacBadge';

export const Dashboard: React.FC = () => {
  const {
    state,
    activeRoleDef,
    setActivePage,
    agencyBudgetTotals,
    departmentSummaries,
  } = useDemo();

  const fy = state.activeFiscalYear;
  const lowStockItems = state.inventory.filter((i) => i.stockOnHand <= i.reorderLevel);

  const openPpmps = state.ppmps.filter((p) => p.fiscalYear === fy && p.status !== 'Approved');
  const openSrs = state.srs.filter(
    (s) => s.fiscalYear === fy && !['Approved & Issued', 'Cancelled'].includes(s.status)
  );
  const openPrs = state.prs.filter(
    (p) => p.fiscalYear === fy && !['Converted to PO', 'Returned'].includes(p.status)
  );
  const openPos = state.pos.filter(
    (p) => p.fiscalYear === fy && ['Draft', 'Approved & Issued'].includes(p.status)
  );

  const totalOpenTasks = openPpmps.length + openSrs.length + openPrs.length + openPos.length;

  const procurementSteps: Array<{
    step: string;
    title: string;
    caption: string;
    page: ModuleKey;
    badge?: string;
  }> = [
    {
      step: '1',
      title: 'Plan (PPMP)',
      caption: 'Quarterly needs',
      page: 'ppmp',
      badge: openPpmps.length > 0 ? `${openPpmps.length} open` : undefined,
    },
    {
      step: '2',
      title: 'Check Stock',
      caption: 'Warehouse levels',
      page: 'inventory',
      badge: lowStockItems.length > 0 ? `${lowStockItems.length} low` : undefined,
    },
    {
      step: '3',
      title: 'Stock Request',
      caption: 'Issue or escalate',
      page: 'sr',
      badge: openSrs.length > 0 ? `${openSrs.length} open` : undefined,
    },
    {
      step: '4',
      title: 'Purchase Request',
      caption: 'Certify & approve',
      page: 'pr',
      badge: openPrs.length > 0 ? `${openPrs.length} open` : undefined,
    },
    {
      step: '5',
      title: 'Order & Receive',
      caption: 'PO & stock-in',
      page: 'po',
      badge: openPos.length > 0 ? `${openPos.length} open` : undefined,
    },
  ];

  // Unified concise "Needs Attention" feed (capped at 5 clean rows)
  const attentionItems: Array<{
    id: string;
    docNo: string;
    title: string;
    subtitle: string;
    status: string;
    page: ModuleKey;
  }> = [
    ...openSrs.slice(0, 2).map((s) => ({
      id: s.id,
      docNo: s.srNo,
      title: s.purpose,
      subtitle: `Stock Request · ${s.departmentId} · ${s.items.length} item(s)`,
      status: s.status,
      page: 'sr' as ModuleKey,
    })),
    ...openPrs.slice(0, 2).map((pr) => ({
      id: pr.id,
      docNo: pr.prNo,
      title: pr.purpose,
      subtitle: `Purchase Request · ${formatCurrency(calcPrTotal(pr), state.currency)}`,
      status: pr.status,
      page: 'pr' as ModuleKey,
    })),
    ...openPos.slice(0, 2).map((po) => ({
      id: po.id,
      docNo: po.poNo,
      title: po.supplierName,
      subtitle: `Purchase Order · ${formatCurrency(calcPoSubtotal(po), state.currency)}`,
      status: po.status,
      page: 'po' as ModuleKey,
    })),
    ...openPpmps.slice(0, 2).map((p) => ({
      id: p.id,
      docNo: p.ppmpNo,
      title: p.title,
      subtitle: `PPMP Plan · ${formatCurrency(calcPpmpTotal(p.items), state.currency)}`,
      status: p.status,
      page: 'ppmp' as ModuleKey,
    })),
  ].slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Calm Welcome Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
            <Shield className="w-3 h-3" />
            Signed in as {activeRoleDef.name}
          </div>
          <h1 className="text-xl font-bold text-slate-900 pt-1">
            Hello, {activeRoleDef.personaName}
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {activeRoleDef.description} Follow the 5 steps below or pick up an open task.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setActivePage('upload')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <FileUp className="w-4 h-4 text-slate-500" /> Import Spreadsheet
          </button>
          <button
            onClick={() => setActivePage('print')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition"
          >
            <Printer className="w-4 h-4" /> Print Forms
          </button>
        </div>
      </div>

      {/* Guided 5-Step Flow Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            How Procurement Flows Here (Click Any Step)
          </h2>
          <button
            onClick={() => setActivePage('app_cse')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            View Consolidated APP-CSE <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {procurementSteps.map((s) => (
            <button
              key={s.step}
              onClick={() => setActivePage(s.page)}
              className="group text-left p-3.5 rounded-xl border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/40 transition flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 text-xs font-bold inline-flex items-center justify-center transition">
                  {s.step}
                </span>
                {s.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {s.badge}
                  </span>
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{s.title}</div>
                <div className="text-[11px] text-slate-500">{s.caption}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3 Calm Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActivePage('fiscal')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Remaining Free Budget (FY {fy})</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {formatCompactCurrency(agencyBudgetTotals.totalRemaining, state.currency)}
          </div>
          <div className="mt-1 text-xs text-slate-400 tabular-nums">
            Out of {formatCompactCurrency(agencyBudgetTotals.agencyCeiling, state.currency)} ceiling
          </div>
        </button>

        <button
          onClick={() => setActivePage('pr')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Open Documents Waiting</span>
            <ClipboardList className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {totalOpenTasks} Items
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {openPpmps.length} PPMP · {openSrs.length} SR · {openPrs.length} PR · {openPos.length} PO
          </div>
        </button>

        <button
          onClick={() => setActivePage('inventory')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Low Stock Warnings</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {lowStockItems.length} SKUs
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {lowStockItems.length === 0
              ? 'All warehouse items healthy'
              : 'Click to inspect & reorder'}
          </div>
        </button>
      </div>

      {/* 2-Column Clean Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Needs Attention Now</h2>
            <span className="text-[11px] text-slate-400">Click an item to act</span>
          </div>

          {attentionItems.length === 0 ? (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              All caught up! No pending requests or orders right now.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attentionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.page)}
                  className="w-full py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition flex items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-blue-700">
                        {item.docNo}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</div>
                  </div>
                  <StatusBadge status={item.status} />
                </button>
              ))}
            </div>
          )}

          {lowStockItems.length > 0 && (
            <button
              onClick={() => setActivePage('inventory')}
              className="mt-4 w-full px-3.5 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-50 flex items-center justify-between text-xs text-amber-900 transition"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {lowStockItems.length} item(s) below reorder threshold ({lowStockItems[0]?.name}...)
              </span>
              <span className="font-semibold">View Stock →</span>
            </button>
          )}
        </div>

        {/* Clean Department Budgets */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Department Budgets (FY {fy})</h2>
            <button
              onClick={() => setActivePage('fiscal')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Budget Details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {departmentSummaries.map((d) => {
              const spent = d.obligated + d.utilized;
              const pct =
                d.totalAllocated > 0
                  ? Math.min(100, Math.round((spent / d.totalAllocated) * 100))
                  : 0;
              const over = d.remaining < 0;
              return (
                <div key={d.department.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{d.department.name}</span>
                    <span className="tabular-nums text-slate-600">
                      <strong className={over ? 'text-rose-600' : 'text-slate-900'}>
                        {formatCurrency(d.remaining, state.currency)}
                      </strong>{' '}
                      <span className="text-slate-400">left ({pct}% used)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
