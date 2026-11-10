import React, { useState } from 'react';
import {
  ArrowRightCircle,
  CheckCircle2,
  FileUp,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { SRLineItem } from '../types/procurement';
import { formatCurrency, formatNumber, uid } from '../utils/formatters';
import { RbacNoticeBanner, StatusBadge } from './RbacBadge';

export const StockRequisitionPage: React.FC = () => {
  const {
    state,
    can,
    setActivePage,
    createSr,
    issueSr,
    convertSrToPr,
    openPrintModal,
    buildSrPrintDraft,
    notify,
  } = useDemo();

  const [showCreate, setShowCreate] = useState(false);
  const defaultDept =
    state.activeRole === 'DEPT_USER' ? state.activeDeptUserScope : state.departments[0]?.id || 'IT';
  const [deptId, setDeptId] = useState(defaultDept);
  const [purpose, setPurpose] = useState('Monthly Department Office Supplies Replenishment');
  const [lines, setLines] = useState<SRLineItem[]>(() => {
    const first = state.inventory[0];
    return first
      ? [
          {
            id: uid('sri'),
            stockCode: first.stockCode,
            description: first.name,
            unit: first.unit,
            requestedQty: 5,
            issuedQty: 0,
            unitCost: first.unitCost,
          },
        ]
      : [];
  });

  const fy = state.activeFiscalYear;
  const srs = state.srs.filter((s) => s.fiscalYear === fy);

  const handlePickCatalog = (idx: number, stockCode: string) => {
    const inv = state.inventory.find((i) => i.stockCode === stockCode);
    if (!inv) return;
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              stockCode: inv.stockCode,
              description: inv.name,
              unit: inv.unit,
              unitCost: inv.unitCost,
            }
          : l
      )
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim() || lines.length === 0) {
      notify('warning', 'Purpose and at least one item are required.');
      return;
    }
    const created = createSr({
      departmentId: deptId,
      purpose: purpose.trim(),
      items: lines,
      submitImmediately: true,
    });
    if (created) setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Stock Requisition & Issue Slip (SR / RIS)
          </h2>
          <p className="text-xs text-slate-500">
            Request supplies directly from central warehouse inventory, issue stock with auto-deduction, or escalate out-of-stock requests into Purchase Requests (PR).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('sr', 'create') && (
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Stock Requisition
            </button>
          )}
          <button
            onClick={() => setActivePage('upload')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <FileUp className="w-4 h-4" /> Extract from File
          </button>
        </div>
      </div>

      <RbacNoticeBanner
        module="sr"
        action="issue"
        actionLabel="Approve & Issue Warehouse Stock"
      />

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4 text-xs"
        >
          <h3 className="text-sm font-bold text-slate-900">Create Stock Requisition (SR)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Requesting Department</label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {state.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Purpose / Justification</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Catalog Item</th>
                  <th className="px-3 py-2 text-right">Stock Available</th>
                  <th className="px-3 py-2 text-center">Unit</th>
                  <th className="px-3 py-2 text-right w-28">Req Qty</th>
                  <th className="px-3 py-2 text-right">Est. Value</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {lines.map((line, idx) => {
                  const inv = state.inventory.find((i) => i.stockCode === line.stockCode);
                  const available = inv?.stockOnHand ?? 0;
                  const short = line.requestedQty > available;
                  return (
                    <tr key={line.id}>
                      <td className="p-2">
                        <select
                          value={line.stockCode}
                          onChange={(e) => handlePickCatalog(idx, e.target.value)}
                          className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                        >
                          {state.inventory.map((i) => (
                            <option key={i.id} value={i.stockCode}>
                              [{i.stockCode}] {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          short ? 'text-amber-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatNumber(available)} {line.unit}
                        {short && ' (Shortfall)'}
                      </td>
                      <td className="px-3 py-2 text-center">{line.unit}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={1}
                          value={line.requestedQty}
                          onChange={(e) =>
                            setLines((p) =>
                              p.map((l, i) =>
                                i === idx
                                  ? { ...l, requestedQty: Math.max(1, Number(e.target.value) || 1) }
                                  : l
                              )
                            )
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCurrency(line.requestedQty * line.unitCost, state.currency)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const pick = state.inventory[lines.length % Math.max(1, state.inventory.length)];
                if (!pick) return;
                setLines((p) => [
                  ...p,
                  {
                    id: uid('sri'),
                    stockCode: pick.stockCode,
                    description: pick.name,
                    unit: pick.unit,
                    requestedQty: 5,
                    issuedQty: 0,
                    unitCost: pick.unitCost,
                  },
                ]);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Catalog Item
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Submit Requisition
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SR List */}
      <div className="space-y-4">
        {srs.map((sr) => {
          const dept = state.departments.find((d) => d.id === sr.departmentId);
          const totalVal = sr.items.reduce((s, it) => s + it.requestedQty * it.unitCost, 0);
          return (
            <div
              key={sr.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {sr.srNo}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{sr.purpose}</h3>
                    <StatusBadge status={sr.status} />
                    {sr.linkedPrNo && (
                      <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                        Linked PR: {sr.linkedPrNo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {dept?.name} · Requested by {sr.requestedBy} on {sr.dateRequested}
                    {sr.issuedBy ? ` · Issued by ${sr.issuedBy}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 tabular-nums mr-2">
                    Value: {formatCurrency(totalVal, state.currency)}
                  </span>

                  {(sr.status === 'Submitted' || sr.status === 'Draft') && can('sr', 'issue') && (
                    <button
                      onClick={() => issueSr(sr.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Issue Stock
                    </button>
                  )}

                  {sr.status === 'Needs Purchase (PR)' && !sr.linkedPrNo && can('pr', 'create') && (
                    <button
                      onClick={() => convertSrToPr(sr.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" /> Convert Shortfall to PR
                    </button>
                  )}

                  <button
                    onClick={() => openPrintModal(buildSrPrintDraft(sr))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print SR Form
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white border-b border-slate-100 text-[11px] text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Stock Code</th>
                      <th className="px-4 py-2">Item Description</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-right">Current Stock</th>
                      <th className="px-3 py-2 text-right">Requested Qty</th>
                      <th className="px-3 py-2 text-right">Issued Qty</th>
                      <th className="px-4 py-2 text-right">Est. Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {sr.items.map((it) => {
                      const inv = state.inventory.find((i) => i.stockCode === it.stockCode);
                      const avail = inv?.stockOnHand ?? 0;
                      return (
                        <tr key={it.id}>
                          <td className="px-4 py-2 font-mono text-[11px] text-slate-600">
                            {it.stockCode}
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-900">{it.description}</td>
                          <td className="px-3 py-2 text-center">{it.unit}</td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              avail < it.requestedQty && sr.status !== 'Approved & Issued'
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {formatNumber(avail)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {formatNumber(it.requestedQty)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700">
                            {formatNumber(it.issuedQty)}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {formatCurrency(it.requestedQty * it.unitCost, state.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
