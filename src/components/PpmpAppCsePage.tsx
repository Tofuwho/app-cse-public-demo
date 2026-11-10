import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileUp,
  Layers,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { calcPpmpTotal, useDemo } from '../context/DemoContext';
import { ItemCategory, PPMPDocument, PPMPItem, ProcurementMode } from '../types/procurement';
import { formatCurrency, formatNumber, uid } from '../utils/formatters';
import { exportRowsToExcel } from '../utils/fileExtractor';
import { Modal } from './Modal';
import { RbacNoticeBanner, StatusBadge } from './RbacBadge';

export const PpmpAppCsePage: React.FC<{ initialTab?: 'ppmp' | 'app_cse' }> = ({
  initialTab = 'ppmp',
}) => {
  const {
    state,
    can,
    setActivePage,
    departmentSummaries,
    createPpmp,
    updatePpmpStatus,
    openPrintModal,
    buildPpmpPrintDraft,
    buildAppCsePrintDraft,
    notify,
  } = useDemo();

  const [tab, setTab] = useState<'ppmp' | 'app_cse'>(initialTab);
  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cseFilter, setCseFilter] = useState<'ALL' | 'CSE' | 'NON_CSE'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedPpmpId, setSelectedPpmpId] = useState<string | null>(null);

  // Create PPMP Form State
  const defaultDept =
    state.activeRole === 'DEPT_USER' ? state.activeDeptUserScope : state.departments[0]?.id || 'IT';
  const [formDept, setFormDept] = useState<string>(defaultDept);
  const [formTitle, setFormTitle] = useState<string>('Annual Department Supplies & Equipment Plan');
  const [formFund, setFormFund] = useState<string>('01 - Regular Agency Fund');
  const [formRemarks, setFormRemarks] = useState<string>('Prepared within departmental ceiling.');
  const [formItems, setFormItems] = useState<PPMPItem[]>([
    {
      id: uid('pi'),
      stockCode: 'CSE-PPR-001',
      description: 'Bond Paper A4 (80gsm, 500 sheets)',
      category: 'CSE - Paper & Office Supplies',
      isCse: true,
      unit: 'ream',
      unitCost: 235,
      q1Qty: 40,
      q2Qty: 40,
      q3Qty: 40,
      q4Qty: 40,
      mode: 'PS-DBM / Agency-to-Agency',
    },
  ]);

  const fy = state.activeFiscalYear;

  const filteredPpmps = useMemo(() => {
    return state.ppmps.filter((p) => {
      if (p.fiscalYear !== fy) return false;
      if (deptFilter !== 'ALL' && p.departmentId !== deptFilter) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      return true;
    });
  }, [state.ppmps, fy, deptFilter, statusFilter]);

  const selectedPpmp: PPMPDocument | undefined = useMemo(
    () => state.ppmps.find((p) => p.id === selectedPpmpId),
    [state.ppmps, selectedPpmpId]
  );

  const consolidatedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        stockCode: string;
        description: string;
        category: ItemCategory;
        isCse: boolean;
        unit: string;
        unitCost: number;
        q1Qty: number;
        q2Qty: number;
        q3Qty: number;
        q4Qty: number;
        mode: ProcurementMode;
        departments: Set<string>;
      }
    >();

    for (const p of state.ppmps) {
      if (p.fiscalYear !== fy || !['Approved', 'Budget Verified'].includes(p.status)) continue;
      for (const it of p.items) {
        const key = `${it.stockCode}::${it.description}`;
        const existing = map.get(key);
        if (existing) {
          existing.q1Qty += it.q1Qty;
          existing.q2Qty += it.q2Qty;
          existing.q3Qty += it.q3Qty;
          existing.q4Qty += it.q4Qty;
          existing.departments.add(p.departmentId);
        } else {
          map.set(key, {
            stockCode: it.stockCode,
            description: it.description,
            category: it.category,
            isCse: it.isCse,
            unit: it.unit,
            unitCost: it.unitCost,
            q1Qty: it.q1Qty,
            q2Qty: it.q2Qty,
            q3Qty: it.q3Qty,
            q4Qty: it.q4Qty,
            mode: it.mode,
            departments: new Set([p.departmentId]),
          });
        }
      }
    }

    return Array.from(map.values()).filter((it) => {
      if (cseFilter === 'CSE') return it.isCse;
      if (cseFilter === 'NON_CSE') return !it.isCse;
      return true;
    });
  }, [state.ppmps, fy, cseFilter]);

  const consolidatedGrandTotal = consolidatedItems.reduce(
    (sum, it) => sum + (it.q1Qty + it.q2Qty + it.q3Qty + it.q4Qty) * it.unitCost,
    0
  );

  const handleCatalogPick = (rowIdx: number, stockCode: string) => {
    const inv = state.inventory.find((i) => i.stockCode === stockCode);
    if (!inv) return;
    setFormItems((prev) =>
      prev.map((row, idx) =>
        idx === rowIdx
          ? {
              ...row,
              stockCode: inv.stockCode,
              description: inv.name,
              category: inv.category,
              isCse: inv.isCse,
              unit: inv.unit,
              unitCost: inv.unitCost,
              mode: inv.isCse ? 'PS-DBM / Agency-to-Agency' : 'Small Value Procurement (Sec. 53.9)',
            }
          : row
      )
    );
  };

  const handleSavePpmp = (submitNow: boolean) => {
    if (!formTitle.trim() || formItems.length === 0) {
      notify('warning', 'Please enter a PPMP title and at least one line item.');
      return;
    }
    const created = createPpmp({
      departmentId: formDept,
      title: formTitle.trim(),
      fundCluster: formFund,
      remarks: formRemarks,
      items: formItems,
      submitImmediately: submitNow,
    });
    if (created) {
      setShowCreateModal(false);
    }
  };

  const newPpmpTotal = calcPpmpTotal(formItems);
  const selectedDeptSummary = departmentSummaries.find((d) => d.department.id === formDept);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {tab === 'ppmp'
              ? `Department Supply Plans (PPMP — FY ${fy})`
              : `Consolidated APP-CSE Master Plan (FY ${fy})`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {tab === 'ppmp'
              ? 'Each unit lists what it plans to buy per quarter. Once verified and approved, items roll into the agency APP-CSE.'
              : 'Combined annual schedule rolled up from all Verified and Approved departmental PPMPs.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tab === 'ppmp' && can('ppmp', 'create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> New PPMP
            </button>
          )}
          <button
            onClick={() => setActivePage('upload')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <FileUp className="w-4 h-4 text-slate-500" /> Import File
          </button>
        </div>
      </div>

      {tab === 'ppmp' ? (
        <>
          <RbacNoticeBanner
            module="ppmp"
            action="create"
            actionLabel="Create or Submit PPMP Plans"
          />

          {/* Calm Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'Submitted', 'Budget Verified', 'Approved', 'Draft'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold border transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st === 'ALL' ? 'All Plans' : st}
                </button>
              ))}
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {state.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clean Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">PPMP No.</th>
                    <th className="px-4 py-3.5 font-semibold">Department</th>
                    <th className="px-4 py-3.5 font-semibold">Plan Title</th>
                    <th className="px-3 py-3.5 font-semibold text-right">Items</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Plan Amount</th>
                    <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {filteredPpmps.map((ppmp) => {
                    const dept = state.departments.find((d) => d.id === ppmp.departmentId);
                    const total = calcPpmpTotal(ppmp.items);
                    return (
                      <tr
                        key={ppmp.id}
                        onClick={() => setSelectedPpmpId(ppmp.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition"
                      >
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-700">
                          {ppmp.ppmpNo}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{dept?.name}</div>
                          <div className="text-[11px] text-slate-400">By {ppmp.preparedBy}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-800 max-w-xs truncate">{ppmp.title}</td>
                        <td className="px-3 py-3.5 text-right text-slate-600">
                          {ppmp.items.length}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          {formatCurrency(total, state.currency)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={ppmp.status} />
                        </td>
                        <td
                          className="px-5 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedPpmpId(ppmp.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={() => openPrintModal(buildPpmpPrintDraft(ppmp))}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                              title="Print Physical Copy"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPpmps.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                        No PPMP plans match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Consolidated APP-CSE Master Schedule */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="inline-flex items-center gap-2 font-semibold text-slate-700">
                <Layers className="w-4 h-4 text-blue-600" />
                {consolidatedItems.length} Unique Items
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                {(['ALL', 'CSE', 'NON_CSE'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setCseFilter(k)}
                    className={`px-3 py-1 rounded-lg font-semibold ${
                      cseFilter === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {k === 'ALL' ? 'All Items' : k === 'CSE' ? 'PS-DBM CSE' : 'Non-CSE'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  exportRowsToExcel(
                    `APP-CSE-FY${fy}.xlsx`,
                    'APP-CSE',
                    consolidatedItems.map((it) => ({
                      Stock_Code: it.stockCode,
                      Description: it.description,
                      Type: it.isCse ? 'CSE' : 'Non-CSE',
                      Unit: it.unit,
                      Q1: it.q1Qty,
                      Q2: it.q2Qty,
                      Q3: it.q3Qty,
                      Q4: it.q4Qty,
                      Total_Qty: it.q1Qty + it.q2Qty + it.q3Qty + it.q4Qty,
                      Unit_Cost: it.unitCost,
                      Total_Amount: (it.q1Qty + it.q2Qty + it.q3Qty + it.q4Qty) * it.unitCost,
                      Procurement_Mode: it.mode,
                    }))
                  );
                  notify('success', `Downloaded APP-CSE-FY${fy}.xlsx.`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>
              <button
                onClick={() => openPrintModal(buildAppCsePrintDraft())}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print APP-CSE Form
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Stock Code</th>
                    <th className="px-4 py-3">Item Description</th>
                    <th className="px-3 py-3 text-center">Class</th>
                    <th className="px-3 py-3 text-center">Unit</th>
                    <th className="px-2 py-3 text-right">Q1</th>
                    <th className="px-2 py-3 text-right">Q2</th>
                    <th className="px-2 py-3 text-right">Q3</th>
                    <th className="px-2 py-3 text-right">Q4</th>
                    <th className="px-3 py-3 text-right">Total Qty</th>
                    <th className="px-3 py-3 text-right">Unit Cost</th>
                    <th className="px-4 py-3 text-right">Total ABC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {consolidatedItems.map((it) => {
                    const tq = it.q1Qty + it.q2Qty + it.q3Qty + it.q4Qty;
                    return (
                      <tr key={`${it.stockCode}-${it.description}`} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600">
                          {it.stockCode}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{it.description}</div>
                          <div className="text-[10.5px] text-slate-400">
                            Depts: {Array.from(it.departments).join(', ')} · {it.mode}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              it.isCse
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {it.isCse ? 'CSE' : 'Non-CSE'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">{it.unit}</td>
                        <td className="px-2 py-3 text-right">{it.q1Qty}</td>
                        <td className="px-2 py-3 text-right">{it.q2Qty}</td>
                        <td className="px-2 py-3 text-right">{it.q3Qty}</td>
                        <td className="px-2 py-3 text-right">{it.q4Qty}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">
                          {formatNumber(tq)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {formatCurrency(it.unitCost, state.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(tq * it.unitCost, state.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold tabular-nums">
                  <tr>
                    <td colSpan={10} className="px-4 py-3 text-right uppercase text-[11px]">
                      Grand Consolidated APP-CSE Total ({consolidatedItems.length} items)
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(consolidatedGrandTotal, state.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View PPMP Detail & Workflow Action Modal */}
      <Modal
        open={Boolean(selectedPpmp)}
        onClose={() => setSelectedPpmpId(null)}
        title={selectedPpmp ? `${selectedPpmp.ppmpNo} — ${selectedPpmp.title}` : ''}
        subtitle={
          selectedPpmp
            ? `${
                state.departments.find((d) => d.id === selectedPpmp.departmentId)?.name ||
                selectedPpmp.departmentId
              } · Prepared by ${selectedPpmp.preparedBy} (${selectedPpmp.updatedAt})`
            : ''
        }
        maxWidthClass="max-w-4xl"
      >
        {selectedPpmp && (
          <div className="space-y-5 text-xs">
            {/* Visual Step Progress */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedPpmp.status} />
                <span className="text-slate-500">
                  {selectedPpmp.verifiedBy && `Budget Verified: ${selectedPpmp.verifiedBy}`}
                  {selectedPpmp.approvedBy && ` · Approved: ${selectedPpmp.approvedBy}`}
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900 tabular-nums">
                Total: {formatCurrency(calcPpmpTotal(selectedPpmp.items), state.currency)}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Description & Mode</th>
                    <th className="px-2 py-2.5 text-center">Unit</th>
                    <th className="px-2 py-2.5 text-right">Q1</th>
                    <th className="px-2 py-2.5 text-right">Q2</th>
                    <th className="px-2 py-2.5 text-right">Q3</th>
                    <th className="px-2 py-2.5 text-right">Q4</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5 text-right">Unit Cost</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {selectedPpmp.items.map((it) => {
                    const tq = it.q1Qty + it.q2Qty + it.q3Qty + it.q4Qty;
                    return (
                      <tr key={it.id}>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                          {it.stockCode}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">{it.description}</div>
                          <div className="text-[10.5px] text-slate-400">
                            {it.isCse ? 'PS-DBM CSE' : 'Non-CSE'} · {it.mode}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">{it.unit}</td>
                        <td className="px-2 py-2 text-right">{it.q1Qty}</td>
                        <td className="px-2 py-2 text-right">{it.q2Qty}</td>
                        <td className="px-2 py-2 text-right">{it.q3Qty}</td>
                        <td className="px-2 py-2 text-right">{it.q4Qty}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatNumber(tq)}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(it.unitCost, state.currency)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {formatCurrency(tq * it.unitCost, state.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => openPrintModal(buildPpmpPrintDraft(selectedPpmp))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
              >
                <Printer className="w-3.5 h-3.5" /> Print Physical PPMP
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {(selectedPpmp.status === 'Draft' || selectedPpmp.status === 'Returned') &&
                  can('ppmp', 'create') && (
                    <button
                      onClick={() => updatePpmpStatus(selectedPpmp.id, 'Submitted')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit for Verification
                    </button>
                  )}

                {selectedPpmp.status === 'Submitted' && can('ppmp', 'certify_budget') && (
                  <button
                    onClick={() => updatePpmpStatus(selectedPpmp.id, 'Budget Verified')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verify Budget
                  </button>
                )}

                {selectedPpmp.status === 'Budget Verified' && can('ppmp', 'approve') && (
                  <button
                    onClick={() => updatePpmpStatus(selectedPpmp.id, 'Approved')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Final Approve
                  </button>
                )}

                {['Submitted', 'Budget Verified'].includes(selectedPpmp.status) &&
                  (can('ppmp', 'certify_budget') || can('ppmp', 'approve')) && (
                    <button
                      onClick={() =>
                        updatePpmpStatus(selectedPpmp.id, 'Returned', 'Returned for item revision.')
                      }
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Return
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create PPMP Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Department PPMP Plan"
        subtitle="Pick items from the catalog or add custom lines with quarterly quantities."
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          {selectedDeptSummary && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 flex flex-wrap justify-between gap-2 tabular-nums">
              <span className="text-slate-600">
                {selectedDeptSummary.department.name} Ceiling:{' '}
                <strong className="text-slate-900">
                  {formatCurrency(selectedDeptSummary.totalAllocated, state.currency)}
                </strong>
              </span>
              <span className="text-slate-600">
                Existing PPMPs:{' '}
                <strong className="text-indigo-700">
                  {formatCurrency(selectedDeptSummary.ppmpPlanned, state.currency)}
                </strong>
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {state.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fund Cluster</label>
              <input
                type="text"
                value={formFund}
                onChange={(e) => setFormFund(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase">
                <tr>
                  <th className="px-2.5 py-2">Catalog Quick-Pick / Description</th>
                  <th className="px-2 py-2 w-20">Unit</th>
                  <th className="px-2 py-2 w-24 text-right">Unit Cost</th>
                  <th className="px-1.5 py-2 w-14 text-right">Q1</th>
                  <th className="px-1.5 py-2 w-14 text-right">Q2</th>
                  <th className="px-1.5 py-2 w-14 text-right">Q3</th>
                  <th className="px-1.5 py-2 w-14 text-right">Q4</th>
                  <th className="px-2 py-2 w-24 text-right">Subtotal</th>
                  <th className="px-2 py-2 w-9"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formItems.map((row, idx) => {
                  const totalQty = row.q1Qty + row.q2Qty + row.q3Qty + row.q4Qty;
                  return (
                    <tr key={row.id}>
                      <td className="p-2 space-y-1">
                        <select
                          value={
                            state.inventory.some((i) => i.stockCode === row.stockCode)
                              ? row.stockCode
                              : ''
                          }
                          onChange={(e) => handleCatalogPick(idx, e.target.value)}
                          className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
                        >
                          <option value="">-- Pick from Catalog --</option>
                          {state.inventory.map((inv) => (
                            <option key={inv.id} value={inv.stockCode}>
                              [{inv.stockCode}] {inv.name} ({formatCurrency(inv.unitCost, state.currency)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            setFormItems((p) =>
                              p.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r))
                            )
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) =>
                            setFormItems((p) =>
                              p.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r))
                            )
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.unitCost}
                          onChange={(e) =>
                            setFormItems((p) =>
                              p.map((r, i) =>
                                i === idx ? { ...r, unitCost: Math.max(0, Number(e.target.value)) } : r
                              )
                            )
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1 text-right tabular-nums"
                        />
                      </td>
                      {(['q1Qty', 'q2Qty', 'q3Qty', 'q4Qty'] as const).map((qKey) => (
                        <td key={qKey} className="p-1.5">
                          <input
                            type="number"
                            min={0}
                            value={row[qKey]}
                            onChange={(e) =>
                              setFormItems((p) =>
                                p.map((r, i) =>
                                  i === idx
                                    ? { ...r, [qKey]: Math.max(0, Number(e.target.value) || 0) }
                                    : r
                                )
                              )
                            }
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right tabular-nums"
                          />
                        </td>
                      ))}
                      <td className="p-2 text-right font-semibold tabular-nums">
                        {formatCurrency(totalQty * row.unitCost, state.currency)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => setFormItems((p) => p.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                setFormItems((p) => [
                  ...p,
                  {
                    id: uid('pi'),
                    stockCode: `CSE-NEW-${p.length + 1}`,
                    description: 'Additional Office Supply Item',
                    category: 'CSE - Paper & Office Supplies',
                    isCse: true,
                    unit: 'pc',
                    unitCost: 150,
                    q1Qty: 10,
                    q2Qty: 10,
                    q3Qty: 10,
                    q4Qty: 10,
                    mode: 'PS-DBM / Agency-to-Agency',
                  },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 tabular-nums mr-2">
                Total: {formatCurrency(newPpmpTotal, state.currency)}
              </span>
              <button
                onClick={() => handleSavePpmp(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSavePpmp(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Send className="w-3.5 h-3.5" /> Save & Submit
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
