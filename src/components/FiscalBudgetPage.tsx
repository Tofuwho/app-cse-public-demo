import React, { useState } from 'react';
import { Calculator, Check, Plus, Save, TrendingUp } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { formatCurrency } from '../utils/formatters';
import { RbacNoticeBanner } from './RbacBadge';

export const FiscalBudgetPage: React.FC = () => {
  const {
    state,
    can,
    currentFiscalConfig,
    departmentSummaries,
    agencyBudgetTotals,
    quarterlyPpmpTotals,
    updateFiscalConfig,
    updateDepartmentAllocation,
    addFiscalYear,
  } = useDemo();

  const [mooeDraft, setMooeDraft] = useState<string>(String(currentFiscalConfig.agencyMooeCeiling));
  const [coDraft, setCoDraft] = useState<string>(String(currentFiscalConfig.agencyCoCeiling));
  const [contingencyDraft, setContingencyDraft] = useState<string>(
    String(currentFiscalConfig.contingencyPercent)
  );
  const [vatDraft, setVatDraft] = useState<string>(String(currentFiscalConfig.defaultTaxRate));
  const [whtDraft, setWhtDraft] = useState<string>(
    String(currentFiscalConfig.defaultWithholdingRate)
  );

  // Department inline edits
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editMooe, setEditMooe] = useState<string>('0');
  const [editCo, setEditCo] = useState<string>('0');

  // Add Fiscal Year form
  const [showNewFy, setShowNewFy] = useState(false);
  const [newYearNum, setNewYearNum] = useState(String(state.activeFiscalYear + 1));
  const [newYearMooe, setNewYearMooe] = useState('5000000');
  const [newYearCo, setNewYearCo] = useState('2500000');

  // Budget & Tax Impact Calculator
  const [simDeptId, setSimDeptId] = useState<string>(state.departments[0]?.id || 'ADMIN');
  const [simAmount, setSimAmount] = useState<string>('125000');
  const [simTaxInclusive, setSimTaxInclusive] = useState<boolean>(true);
  const [simVatRate, setSimVatRate] = useState<string>(String(currentFiscalConfig.defaultTaxRate));
  const [simWhtRate, setSimWhtRate] = useState<string>(
    String(currentFiscalConfig.defaultWithholdingRate)
  );

  // Sync draft boxes when fiscal year changes
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

  const startEditDept = (deptId: string, mooe: number, co: number) => {
    setEditingDeptId(deptId);
    setEditMooe(String(mooe));
    setEditCo(String(co));
  };

  const saveEditDept = (deptId: string) => {
    updateDepartmentAllocation(
      deptId,
      currentFiscalConfig.year,
      Math.max(0, Number(editMooe) || 0),
      Math.max(0, Number(editCo) || 0)
    );
    setEditingDeptId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Fiscal Planning, Budget Calculations & Allocations
          </h2>
          <p className="text-xs text-slate-500">
            Configure FY {currentFiscalConfig.year} ceilings, contingency buffers, departmental MOOE / Capital Outlay allocations, and tax calculations.
          </p>
        </div>
        {can('fiscal', 'create') && (
          <button
            onClick={() => setShowNewFy((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Fiscal Year
          </button>
        )}
      </div>

      <RbacNoticeBanner
        module="fiscal"
        action="allocate"
        actionLabel="Modify Fiscal Ceilings & Department Allocations"
      />

      {showNewFy && (
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Initialize New Fiscal Year Cycle</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Fiscal Year</label>
              <input
                type="number"
                value={newYearNum}
                onChange={(e) => setNewYearNum(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Agency MOOE Ceiling</label>
              <input
                type="number"
                value={newYearMooe}
                onChange={(e) => setNewYearMooe(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Capital Outlay Ceiling</label>
              <input
                type="number"
                value={newYearCo}
                onChange={(e) => setNewYearCo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  addFiscalYear(
                    Number(newYearNum) || 2028,
                    Number(newYearMooe) || 0,
                    Number(newYearCo) || 0
                  );
                  setShowNewFy(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Create FY
              </button>
              <button
                onClick={() => setShowNewFy(false)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fiscal Totals Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Gross Agency Ceiling</span>
          <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {formatCurrency(agencyBudgetTotals.agencyCeiling, state.currency)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">
            Contingency Reserve ({currentFiscalConfig.contingencyPercent}%)
          </span>
          <div className="mt-1 text-lg font-bold text-amber-700 tabular-nums">
            {formatCurrency(agencyBudgetTotals.contingencyAmount, state.currency)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Net Distributable</span>
          <div className="mt-1 text-lg font-bold text-blue-700 tabular-nums">
            {formatCurrency(agencyBudgetTotals.netDistributable, state.currency)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Allocated to Depts</span>
          <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {formatCurrency(agencyBudgetTotals.totalAllocated, state.currency)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Unallocated Pool</span>
          <div
            className={`mt-1 text-lg font-bold tabular-nums ${
              unallocatedPool < 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {formatCurrency(unallocatedPool, state.currency)}
          </div>
        </div>
      </div>

      {/* Fiscal Year Ceilings Editor + Tax & Budget Impact Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveCeiling}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                FY {currentFiscalConfig.year} Agency Budget Parameters
              </h3>
              <p className="text-xs text-slate-500">
                Set fund ceilings, contingency buffer, and default procurement tax rates.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
              {currentFiscalConfig.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">
                MOOE Ceiling (Supplies & Ops)
              </label>
              <input
                type="number"
                disabled={!canEditFiscal}
                value={mooeDraft}
                onChange={(e) => setMooeDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Capital Outlay Ceiling (Equipment)
              </label>
              <input
                type="number"
                disabled={!canEditFiscal}
                value={coDraft}
                onChange={(e) => setCoDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Contingency Buffer (%)</label>
              <input
                type="number"
                step="0.5"
                disabled={!canEditFiscal}
                value={contingencyDraft}
                onChange={(e) => setContingencyDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Default VAT %</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!canEditFiscal}
                  value={vatDraft}
                  onChange={(e) => setVatDraft(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Withholding %</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!canEditFiscal}
                  value={whtDraft}
                  onChange={(e) => setWhtDraft(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              Quarterly PPMP Sum: Q1 {formatCurrency(quarterlyPpmpTotals.q1, state.currency)} · Q2{' '}
              {formatCurrency(quarterlyPpmpTotals.q2, state.currency)}
            </span>
            <button
              type="submit"
              disabled={!canEditFiscal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              Save Fiscal Parameters
            </button>
          </div>
        </form>

        {/* Budget & Tax Calculation Simulator */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              Budget Impact & Tax Calculator
            </h3>
            <p className="text-xs text-slate-500">
              Simulate a PR/PO purchase against a department’s remaining balance with VAT & EWT breakdown.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Target Department</label>
              <select
                value={simDeptId}
                onChange={(e) => setSimDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {departmentSummaries.map((d) => (
                  <option key={d.department.id} value={d.department.id}>
                    {d.department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Estimated Purchase Amount</label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={simTaxInclusive}
                  onChange={() => setSimTaxInclusive(true)}
                />
                <span>VAT-Inclusive</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={!simTaxInclusive}
                  onChange={() => setSimTaxInclusive(false)}
                />
                <span>VAT-Exclusive</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-600 mb-1">VAT %</label>
                <input
                  type="number"
                  value={simVatRate}
                  onChange={(e) => setSimVatRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">EWT %</label>
                <input
                  type="number"
                  value={simWhtRate}
                  onChange={(e) => setSimWhtRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 grid grid-cols-2 gap-y-1.5 text-xs tabular-nums">
            <span className="text-slate-500">Gross Obligation (ABC):</span>
            <span className="text-right font-bold text-slate-900">
              {formatCurrency(simGross, state.currency)}
            </span>
            <span className="text-slate-500">Vatable Base / Net of VAT:</span>
            <span className="text-right font-medium text-slate-700">
              {formatCurrency(simBase, state.currency)}
            </span>
            <span className="text-slate-500">VAT Component ({vatPct}%):</span>
            <span className="text-right font-medium text-slate-700">
              {formatCurrency(simVat, state.currency)}
            </span>
            <span className="text-slate-500">Less Withholding Tax ({whtPct}%):</span>
            <span className="text-right font-medium text-rose-600">
              -{formatCurrency(simWht, state.currency)}
            </span>
            <span className="font-bold text-slate-800 border-t border-slate-200 pt-1.5">
              Net Check Payable to Supplier:
            </span>
            <span className="text-right font-bold text-blue-700 border-t border-slate-200 pt-1.5">
              {formatCurrency(simNetPayable, state.currency)}
            </span>
            <span className="font-semibold text-slate-600 pt-1">
              Dept Remaining After Purchase:
            </span>
            <span
              className={`text-right font-bold pt-1 ${
                projectedRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {formatCurrency(projectedRemaining, state.currency)}{' '}
              {projectedRemaining < 0 ? '(OVER CEILING)' : '(WITHIN BUDGET)'}
            </span>
          </div>
        </div>
      </div>

      {/* Departmental Allocation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Department Budget Allocation Matrix (FY {currentFiscalConfig.year})
            </h3>
            <p className="text-xs text-slate-500">
              Click "Adjust" on any row (Budget Officer / System Admin) to modify departmental MOOE and Capital Outlay ceilings.
            </p>
          </div>
          {unallocatedPool < 0 && (
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
              Warning: Allocations exceed Net Distributable Ceiling by{' '}
              {formatCurrency(Math.abs(unallocatedPool), state.currency)}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3 font-semibold">Department / Cost Center</th>
                <th className="px-4 py-3 font-semibold text-right">MOOE Ceiling</th>
                <th className="px-4 py-3 font-semibold text-right">Capital Outlay</th>
                <th className="px-4 py-3 font-semibold text-right">Total Allocated</th>
                <th className="px-4 py-3 font-semibold text-right">PPMP Planned</th>
                <th className="px-4 py-3 font-semibold text-right">Obligated</th>
                <th className="px-4 py-3 font-semibold text-right">Utilized</th>
                <th className="px-4 py-3 font-semibold text-right">Remaining Balance</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {departmentSummaries.map((d) => {
                const isEditing = editingDeptId === d.department.id;
                return (
                  <tr key={d.department.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{d.department.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {d.department.code} · {d.department.costCenter}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editMooe}
                          onChange={(e) => setEditMooe(e.target.value)}
                          className="w-28 text-right rounded border border-blue-400 px-2 py-1"
                        />
                      ) : (
                        formatCurrency(d.mooeCeiling, state.currency)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editCo}
                          onChange={(e) => setEditCo(e.target.value)}
                          className="w-28 text-right rounded border border-blue-400 px-2 py-1"
                        />
                      ) : (
                        formatCurrency(d.capitalOutlayCeiling, state.currency)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(d.totalAllocated, state.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-700 font-medium">
                      {formatCurrency(d.ppmpPlanned, state.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      {formatCurrency(d.obligated, state.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {formatCurrency(d.utilized, state.currency)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        d.remaining < 0 ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(d.remaining, state.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => saveEditDept(d.department.id)}
                            className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingDeptId(null)}
                            className="px-2 py-1 rounded border border-slate-300 text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={!canAllocate}
                          onClick={() =>
                            startEditDept(d.department.id, d.mooeCeiling, d.capitalOutlayCeiling)
                          }
                          className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-semibold"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
