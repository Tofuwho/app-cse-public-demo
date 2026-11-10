import React, { useState } from 'react';
import { Calculator, Pencil, Plus, Save, Settings, Wallet } from 'lucide-react';
import { DepartmentBudgetSummary, useDemo } from '../context/DemoContext';
import { formatCurrency } from '../utils/formatters';
import { Modal } from './Modal';
import { RbacNoticeBanner } from './RbacBadge';

export const FiscalBudgetPage: React.FC = () => {
  const {
    state,
    can,
    currentFiscalConfig,
    departmentSummaries,
    agencyBudgetTotals,
    updateFiscalConfig,
    updateDepartmentAllocation,
    addFiscalYear,
  } = useDemo();

  const [tab, setTab] = useState<'allocations' | 'settings' | 'calculator'>('allocations');

  // Ceilings settings drafts
  const [mooeDraft, setMooeDraft] = useState<string>(String(currentFiscalConfig.agencyMooeCeiling));
  const [coDraft, setCoDraft] = useState<string>(String(currentFiscalConfig.agencyCoCeiling));
  const [contingencyDraft, setContingencyDraft] = useState<string>(
    String(currentFiscalConfig.contingencyPercent)
  );
  const [vatDraft, setVatDraft] = useState<string>(String(currentFiscalConfig.defaultTaxRate));
  const [whtDraft, setWhtDraft] = useState<string>(
    String(currentFiscalConfig.defaultWithholdingRate)
  );

  // Edit Department Modal
  const [editingDept, setEditingDept] = useState<DepartmentBudgetSummary | null>(null);
  const [editMooe, setEditMooe] = useState<string>('0');
  const [editCo, setEditCo] = useState<string>('0');

  // New Fiscal Year Modal
  const [showNewFyModal, setShowNewFyModal] = useState(false);
  const [newYearNum, setNewYearNum] = useState(String(state.activeFiscalYear + 1));
  const [newYearMooe, setNewYearMooe] = useState('5000000');
  const [newYearCo, setNewYearCo] = useState('2500000');

  // Calculator state
  const [simDeptId, setSimDeptId] = useState<string>(state.departments[0]?.id || 'ADMIN');
  const [simAmount, setSimAmount] = useState<string>('125000');
  const [simTaxInclusive, setSimTaxInclusive] = useState<boolean>(true);
  const [simVatRate, setSimVatRate] = useState<string>(String(currentFiscalConfig.defaultTaxRate));
  const [simWhtRate, setSimWhtRate] = useState<string>(
    String(currentFiscalConfig.defaultWithholdingRate)
  );

  React.useEffect(() => {
    setMooeDraft(String(currentFiscalConfig.agencyMooeCeiling));
    setCoDraft(String(currentFiscalConfig.agencyCoCeiling));
    setContingencyDraft(String(currentFiscalConfig.contingencyPercent));
    setVatDraft(String(currentFiscalConfig.defaultTaxRate));
    setWhtDraft(String(currentFiscalConfig.defaultWithholdingRate));
  }, [currentFiscalConfig]);

  const canEditFiscal = can('fiscal', 'edit');
  const canAllocate = can('fiscal', 'allocate');
  const unallocatedPool = agencyBudgetTotals.netDistributable - agencyBudgetTotals.totalAllocated;

  // Tax Calculator math
  const rawSimAmount = Math.max(0, parseFloat(simAmount) || 0);
  const vatPct = Math.max(0, parseFloat(simVatRate) || 0);
  const whtPct = Math.max(0, parseFloat(simWhtRate) || 0);
  const simGross = simTaxInclusive ? rawSimAmount : rawSimAmount * (1 + vatPct / 100);
  const simBase = vatPct > 0 ? simGross / (1 + vatPct / 100) : simGross;
  const simVat = simGross - simBase;
  const simWht = simBase * (whtPct / 100);
  const simNetPayable = simGross - simWht;
  const simDept = departmentSummaries.find((d) => d.department.id === simDeptId);
  const projectedRemaining = (simDept?.remaining || 0) - simGross;

  const openEditDept = (summary: DepartmentBudgetSummary) => {
    setEditingDept(summary);
    setEditMooe(String(summary.mooeCeiling));
    setEditCo(String(summary.capitalOutlayCeiling));
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    updateDepartmentAllocation(
      editingDept.department.id,
      currentFiscalConfig.year,
      Math.max(0, Number(editMooe) || 0),
      Math.max(0, Number(editCo) || 0)
    );
    setEditingDept(null);
  };

  const handleSaveCeiling = (e: React.FormEvent) => {
    e.preventDefault();
    updateFiscalConfig(currentFiscalConfig.year, {
      agencyMooeCeiling: Math.max(0, Number(mooeDraft) || 0),
      agencyCoCeiling: Math.max(0, Number(coDraft) || 0),
      contingencyPercent: Math.min(50, Math.max(0, Number(contingencyDraft) || 0)),
      defaultTaxRate: Math.min(30, Math.max(0, Number(vatDraft) || 0)),
      defaultWithholdingRate: Math.min(30, Math.max(0, Number(whtDraft) || 0)),
    });
  };

  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Budget Allocations & Calculator (FY {currentFiscalConfig.year})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track department budgets, set annual agency spending ceilings, or simulate tax deductions before buying.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">
          <button
            onClick={() => setTab('allocations')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              tab === 'allocations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" /> Department Budgets
          </button>
          <button
            onClick={() => setTab('calculator')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              tab === 'calculator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> Tax & Impact Calculator
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              tab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Agency Ceiling Setup
          </button>
        </div>
      </div>

      <RbacNoticeBanner
        module="fiscal"
        action="allocate"
        actionLabel="Modify Fiscal Ceilings & Department Allocations"
      />

      {/* Tab 1: Clean Department Budgets */}
      {tab === 'allocations' && (
        <div className="space-y-5">
          {/* 3 Calm Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Net Distributable Ceiling</div>
              <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(agencyBudgetTotals.netDistributable, state.currency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                After {currentFiscalConfig.contingencyPercent}% contingency buffer
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Assigned to Departments</div>
              <div className="mt-1 text-xl font-bold text-blue-700 tabular-nums">
                {formatCurrency(agencyBudgetTotals.totalAllocated, state.currency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Across {departmentSummaries.length} units
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Unallocated Reserve Pool</div>
              <div
                className={`mt-1 text-xl font-bold tabular-nums ${
                  unallocatedPool < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(unallocatedPool, state.currency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {unallocatedPool < 0 ? 'Over-allocated above ceiling' : 'Available to assign'}
              </div>
            </div>
          </div>

          {/* Clean Department Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Department</th>
                    <th className="px-4 py-3.5 font-semibold text-right">MOOE + Cap. Outlay</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Planned (PPMP)</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Spent / Obligated</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Remaining Free</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {departmentSummaries.map((d) => {
                    const committed = d.obligated + d.utilized;
                    return (
                      <tr key={d.department.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{d.department.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {d.department.code} · {d.department.costCenter}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="font-semibold text-slate-900">
                            {formatCurrency(d.totalAllocated, state.currency)}
                          </div>
                          <div className="text-[10.5px] text-slate-400">
                            MOOE {formatCurrency(d.mooeCeiling, state.currency)} · CO{' '}
                            {formatCurrency(d.capitalOutlayCeiling, state.currency)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-600">
                          {formatCurrency(d.ppmpPlanned, state.currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-600">
                          {formatCurrency(committed, state.currency)}
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right font-bold ${
                            d.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(d.remaining, state.currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            disabled={!canAllocate}
                            onClick={() => openEditDept(d)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700 transition"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Clean Focused Calculator */}
      {tab === 'calculator' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Purchase Tax & Budget Check</h2>
              <p className="text-slate-500 mt-0.5">
                Check VAT, withholding tax deduction, and whether a department has enough remaining budget before creating a PR or PO.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Department</label>
              <select
                value={simDeptId}
                onChange={(e) => setSimDeptId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {departmentSummaries.map((d) => (
                  <option key={d.department.id} value={d.department.id}>
                    {d.department.name} (Free: {formatCurrency(d.remaining, state.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estimated Purchase Amount
              </label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">VAT %</label>
                <input
                  type="number"
                  value={simVatRate}
                  onChange={(e) => setSimVatRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Withholding (EWT) %</label>
                <input
                  type="number"
                  value={simWhtRate}
                  onChange={(e) => setSimWhtRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center gap-5 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  checked={simTaxInclusive}
                  onChange={() => setSimTaxInclusive(true)}
                />
                Quote already includes VAT
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  checked={!simTaxInclusive}
                  onChange={() => setSimTaxInclusive(false)}
                />
                Add VAT on top
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3 text-xs tabular-nums">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Calculated Breakdown
            </h3>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Total Purchase Cost (Gross ABC)</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(simGross, state.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Net of VAT (Vatable Base)</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(simBase, state.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">VAT ({vatPct}%)</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(simVat, state.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Less Withholding Tax ({whtPct}%)</span>
              <span className="font-medium text-rose-600">
                -{formatCurrency(simWht, state.currency)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
              <span className="font-bold text-slate-900">Net Check Payable to Supplier</span>
              <span className="font-bold text-blue-700">
                {formatCurrency(simNetPayable, state.currency)}
              </span>
            </div>
            <div
              className={`mt-2 p-3 rounded-xl border flex items-center justify-between ${
                projectedRemaining < 0
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <span className="font-semibold">
                {simDept?.department.code} Remaining After Purchase
              </span>
              <span className="font-bold">
                {formatCurrency(projectedRemaining, state.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Agency Ceiling Settings */}
      {tab === 'settings' && (
        <form
          onSubmit={handleSaveCeiling}
          className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl space-y-5 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                FY {currentFiscalConfig.year} Agency Ceilings & Defaults
              </h2>
              <p className="text-slate-500 mt-0.5">
                Configure total Maintenance/Operations (MOOE), Equipment (CO), contingency reserve, and default tax rates.
              </p>
            </div>
            {can('fiscal', 'create') && (
              <button
                type="button"
                onClick={() => setShowNewFyModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700"
              >
                <Plus className="w-3.5 h-3.5" /> New Fiscal Year
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                MOOE Ceiling (Supplies & Ops)
              </label>
              <input
                type="number"
                disabled={!canEditFiscal}
                value={mooeDraft}
                onChange={(e) => setMooeDraft(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Capital Outlay Ceiling (Equipment)
              </label>
              <input
                type="number"
                disabled={!canEditFiscal}
                value={coDraft}
                onChange={(e) => setCoDraft(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contingency Reserve Buffer (%)
              </label>
              <input
                type="number"
                step="0.5"
                disabled={!canEditFiscal}
                value={contingencyDraft}
                onChange={(e) => setContingencyDraft(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default VAT %</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!canEditFiscal}
                  value={vatDraft}
                  onChange={(e) => setVatDraft(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Withholding %</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!canEditFiscal}
                  value={whtDraft}
                  onChange={(e) => setWhtDraft(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!canEditFiscal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold"
            >
              <Save className="w-3.5 h-3.5" /> Save Ceiling Settings
            </button>
          </div>
        </form>
      )}

      {/* Adjust Department Allocation Modal */}
      <Modal
        open={Boolean(editingDept)}
        onClose={() => setEditingDept(null)}
        title={`Edit Budget — ${editingDept?.department.name || ''}`}
        subtitle={`Adjust FY ${currentFiscalConfig.year} MOOE and Capital Outlay ceilings`}
        maxWidthClass="max-w-md"
      >
        {editingDept && (
          <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                MOOE Ceiling (Supplies & Operations)
              </label>
              <input
                type="number"
                value={editMooe}
                onChange={(e) => setEditMooe(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Capital Outlay Ceiling (Equipment)
              </label>
              <input
                type="number"
                value={editCo}
                onChange={(e) => setEditCo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
              />
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex justify-between tabular-nums">
              <span className="text-slate-600">New Total Allocation:</span>
              <strong className="text-slate-900">
                {formatCurrency(
                  (Number(editMooe) || 0) + (Number(editCo) || 0),
                  state.currency
                )}
              </strong>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Save Allocation
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* New Fiscal Year Modal */}
      <Modal
        open={showNewFyModal}
        onClose={() => setShowNewFyModal(false)}
        title="Initialize New Fiscal Year"
        subtitle="Creates a fresh planning year with default department ceilings"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fiscal Year</label>
            <input
              type="number"
              value={newYearNum}
              onChange={(e) => setNewYearNum(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Agency MOOE Ceiling</label>
            <input
              type="number"
              value={newYearMooe}
              onChange={(e) => setNewYearMooe(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Capital Outlay Ceiling</label>
            <input
              type="number"
              value={newYearCo}
              onChange={(e) => setNewYearCo(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowNewFyModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                addFiscalYear(
                  Number(newYearNum) || 2028,
                  Number(newYearMooe) || 0,
                  Number(newYearCo) || 0
                );
                setShowNewFyModal(false);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Create Fiscal Year
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
