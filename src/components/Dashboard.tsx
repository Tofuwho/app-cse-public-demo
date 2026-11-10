import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileSpreadsheet,
  FileUp,
  Package,
  Printer,
  Shield,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { calcPoSubtotal, calcPpmpTotal, calcPrTotal, useDemo } from '../context/DemoContext';
import { formatCompactCurrency, formatCurrency, formatNumber } from '../utils/formatters';
import { StatusBadge } from './RbacBadge';

export const Dashboard: React.FC = () => {
  const {
    state,
    activeRoleDef,
    setActivePage,
    agencyBudgetTotals,
    departmentSummaries,
    quarterlyPpmpTotals,
  } = useDemo();

  const fy = state.activeFiscalYear;
  const lowStockItems = state.inventory.filter((i) => i.stockOnHand <= i.reorderLevel);
  const outOfStockItems = state.inventory.filter((i) => i.stockOnHand === 0);

  const pendingPpmpCount = state.ppmps.filter(
    (p) => p.fiscalYear === fy && ['Submitted', 'Budget Verified'].includes(p.status)
  ).length;
  const pendingSrCount = state.srs.filter(
    (s) => s.fiscalYear === fy && ['Submitted', 'Needs Purchase (PR)'].includes(s.status)
  ).length;
  const pendingPrCount = state.prs.filter(
    (p) => p.fiscalYear === fy && ['Submitted', 'Funds Certified', 'Approved'].includes(p.status)
  ).length;
  const inTransitPoCount = state.pos.filter(
    (p) => p.fiscalYear === fy && p.status === 'Approved & Issued'
  ).length;

  const qMax = Math.max(
    quarterlyPpmpTotals.q1,
    quarterlyPpmpTotals.q2,
    quarterlyPpmpTotals.q3,
    quarterlyPpmpTotals.q4,
    1
  );

  const cseTotal = state.ppmps
    .filter((p) => p.fiscalYear === fy && p.status !== 'Returned')
    .flatMap((p) => p.items)
    .filter((i) => i.isCse)
    .reduce((s, i) => s + (i.q1Qty + i.q2Qty + i.q3Qty + i.q4Qty) * i.unitCost, 0);

  const nonCseTotal = Math.max(0, agencyBudgetTotals.totalPpmpPlanned - cseTotal);

  return (
    <div className="space-y-6">
      {/* Role Focus Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <Shield className="w-3.5 h-3.5" />
              Active RBAC Persona · {activeRoleDef.name}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome, {activeRoleDef.personaName}
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">{activeRoleDef.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActivePage('upload')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition"
            >
              <FileUp className="w-4 h-4" />
              Upload & Extract File
            </button>
            <button
              onClick={() => setActivePage('print')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition"
            >
              <Printer className="w-4 h-4" />
              Form & Print Studio
            </button>
            <button
              onClick={() => setActivePage('rbac')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition"
            >
              <Shield className="w-4 h-4" />
              RBAC Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>FY {fy} Agency Ceiling</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {formatCompactCurrency(agencyBudgetTotals.agencyCeiling, state.currency)}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Allocated: {formatCurrency(agencyBudgetTotals.totalAllocated, state.currency)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Remaining Free Budget</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
            {formatCompactCurrency(agencyBudgetTotals.totalRemaining, state.currency)}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Obligated + Utilized:{' '}
            {formatCompactCurrency(
              agencyBudgetTotals.totalObligated + agencyBudgetTotals.totalUtilized,
              state.currency
            )}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Active Procurement Queue</span>
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {pendingPpmpCount + pendingSrCount + pendingPrCount + inTransitPoCount} Open
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {pendingPpmpCount} PPMP · {pendingSrCount} SR · {pendingPrCount} PR · {inTransitPoCount} PO
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Inventory Health</span>
            <Package
              className={`w-4 h-4 ${
                outOfStockItems.length > 0 ? 'text-rose-600' : 'text-amber-600'
              }`}
            />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {lowStockItems.length} Alerts
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {outOfStockItems.length} out of stock · {state.inventory.length} active SKUs
          </p>
        </div>
      </div>

      {/* Main Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departmental Budget Utilization */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Department Budget Allocation & Utilization (FY {fy})
              </h3>
              <p className="text-xs text-slate-500">
                Live calculation of Allocated Ceiling vs. PPMP Plans, Obligated PRs/POs, and Delivered Spend.
              </p>
            </div>
            <button
              onClick={() => setActivePage('fiscal')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Manage Allocations <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {departmentSummaries.map((d) => {
              const committed = d.obligated + d.utilized;
              const pct = d.totalAllocated > 0 ? Math.min(100, Math.round((committed / d.totalAllocated) * 100)) : 0;
              const overBudget = d.remaining < 0;
              return (
                <div key={d.department.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">{d.department.name}</span>{' '}
                      <span className="font-mono text-[11px] text-slate-400">({d.department.code})</span>
                    </div>
                    <div className="tabular-nums text-right">
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(committed, state.currency)}
                      </span>{' '}
                      <span className="text-slate-400">/</span>{' '}
                      <span className="text-slate-600">
                        {formatCurrency(d.totalAllocated, state.currency)}
                      </span>{' '}
                      <span
                        className={`ml-1.5 font-semibold ${
                          overBudget ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-600"
                      style={{
                        width: `${
                          d.totalAllocated > 0
                            ? Math.min(100, (d.utilized / d.totalAllocated) * 100)
                            : 0
                        }%`,
                      }}
                      title={`Utilized: ${formatCurrency(d.utilized, state.currency)}`}
                    />
                    <div
                      className={`h-full ${overBudget ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{
                        width: `${
                          d.totalAllocated > 0
                            ? Math.min(100, (d.obligated / d.totalAllocated) * 100)
                            : 0
                        }%`,
                      }}
                      title={`Obligated: ${formatCurrency(d.obligated, state.currency)}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                    <span>PPMP Planned: {formatCurrency(d.ppmpPlanned, state.currency)}</span>
                    <span>
                      Remaining:{' '}
                      <strong className={overBudget ? 'text-rose-600' : 'text-slate-700'}>
                        {formatCurrency(d.remaining, state.currency)}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Delivered / Utilized
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Obligated (Active PR & PO)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" /> Free Balance
            </span>
          </div>
        </div>

        {/* Quarterly APP-CSE Cash Schedule + CSE Split */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quarterly PPMP Cash Plan</h3>
                <p className="text-xs text-slate-500">Aggregated Q1–Q4 requirements</p>
              </div>
              <button
                onClick={() => setActivePage('app_cse')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                APP-CSE →
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 items-end h-44 pt-4 pb-2 px-2 bg-slate-50 rounded-xl border border-slate-100">
              {[
                { label: 'Q1', val: quarterlyPpmpTotals.q1, color: 'bg-blue-600' },
                { label: 'Q2', val: quarterlyPpmpTotals.q2, color: 'bg-indigo-600' },
                { label: 'Q3', val: quarterlyPpmpTotals.q3, color: 'bg-sky-600' },
                { label: 'Q4', val: quarterlyPpmpTotals.q4, color: 'bg-teal-600' },
              ].map((q) => {
                const heightPct = Math.max(8, Math.round((q.val / qMax) * 100));
                return (
                  <div key={q.label} className="flex flex-col items-center h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-700 tabular-nums mb-1">
                      {formatCompactCurrency(q.val, state.currency)}
                    </span>
                    <div className="w-full max-w-[38px] bg-slate-200/70 rounded-t-md flex items-end h-28 overflow-hidden">
                      <div
                        className={`w-full ${q.color} rounded-t-md transition-all duration-300`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 mt-1.5">{q.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Common-Use Supplies (PS-DBM CSE)</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatCurrency(cseTotal, state.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Non-CSE Equipment & Goods</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatCurrency(nonCseTotal, state.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Queues & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Workflow Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              Active Pipeline & Action Items
            </h3>
            <span className="text-[11px] text-slate-500">Click any row to open module</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {state.ppmps
              .filter((p) => p.fiscalYear === fy && p.status !== 'Approved')
              .slice(0, 2)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePage('ppmp')}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {p.ppmpNo} · <span className="text-slate-600 font-normal">{p.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      PPMP Value: {formatCurrency(calcPpmpTotal(p.items), state.currency)}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </button>
              ))}

            {state.srs
              .filter((s) => s.fiscalYear === fy && s.status !== 'Approved & Issued')
              .slice(0, 2)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActivePage('sr')}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {s.srNo} · <span className="text-slate-600 font-normal">{s.purpose}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {s.items.length} requested item(s) · Dept: {s.departmentId}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </button>
              ))}

            {state.prs
              .filter((pr) => pr.fiscalYear === fy && pr.status !== 'Converted to PO')
              .slice(0, 3)
              .map((pr) => (
                <button
                  key={pr.id}
                  onClick={() => setActivePage('pr')}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {pr.prNo} · <span className="text-slate-600 font-normal">{pr.purpose}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      ABC: {formatCurrency(calcPrTotal(pr), state.currency)}
                    </div>
                  </div>
                  <StatusBadge status={pr.status} />
                </button>
              ))}

            {state.pos
              .filter((po) => po.fiscalYear === fy && po.status === 'Approved & Issued')
              .slice(0, 2)
              .map((po) => (
                <button
                  key={po.id}
                  onClick={() => setActivePage('po')}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {po.poNo} · <span className="text-slate-600 font-normal">{po.supplierName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      PO Amount: {formatCurrency(calcPoSubtotal(po), state.currency)} · Awaiting Receiving
                    </div>
                  </div>
                  <StatusBadge status={po.status} />
                </button>
              ))}
          </div>
        </div>

        {/* Low Stock & Recent Audit Activity */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Inventory Reorder Alerts ({lowStockItems.length})
              </h3>
              <button
                onClick={() => setActivePage('inventory')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Open Inventory →
              </button>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4" /> All stock items are above reorder thresholds.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-slate-500 mr-2">
                        {item.stockCode}
                      </span>
                      <span className="font-medium text-slate-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums font-bold text-slate-800">
                        {formatNumber(item.stockOnHand)} / {item.reorderLevel} {item.unit}
                      </span>
                      <StatusBadge
                        status={item.stockOnHand === 0 ? 'Out of Stock' : 'Low Stock'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                Recent Audit Trail
              </h3>
              <button
                onClick={() => setActivePage('rbac')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Full Log →
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {state.auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    {log.documentNo && (
                      <span className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {log.documentNo}
                      </span>
                    )}
                    <p className="text-[11px] text-slate-500">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-slate-400">
                    <div className="font-medium text-slate-600">{log.actor}</div>
                    <div>{log.timestamp.slice(5, 16)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
