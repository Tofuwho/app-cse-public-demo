import React, { useMemo, useState } from 'react';
import {
  ArrowRightCircle,
  CheckCircle2,
  Eye,
  FileUp,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { SRLineItem } from '../types/procurement';
import { formatCurrency, formatNumber, uid } from '../utils/formatters';
import { Modal } from './Modal';
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSrId, setSelectedSrId] = useState<string | null>(null);

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
  const selectedSr = useMemo(
    () => state.srs.find((s) => s.id === selectedSrId),
    [state.srs, selectedSrId]
  );

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
    if (created) setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Step 2 · Stock Requests (SR / RIS)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Request supplies from warehouse stock. If an item is out of stock, convert the shortfall directly into a Purchase Request (PR).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can('sr', 'create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Stock Request
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

      <RbacNoticeBanner
        module="sr"
        action="issue"
        actionLabel="Approve & Issue Warehouse Stock"
      />

      {/* Clean Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3.5 font-semibold">SR No.</th>
                <th className="px-4 py-3.5 font-semibold">Department</th>
                <th className="px-4 py-3.5 font-semibold">Purpose</th>
                <th className="px-3 py-3.5 font-semibold text-right">Items / Value</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {srs.map((sr) => {
                const dept = state.departments.find((d) => d.id === sr.departmentId);
                const totalVal = sr.items.reduce((s, it) => s + it.requestedQty * it.unitCost, 0);
                return (
                  <tr
                    key={sr.id}
                    onClick={() => setSelectedSrId(sr.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700">
                      <div>{sr.srNo}</div>
                      {sr.linkedPrNo && (
                        <div className="text-[10px] text-indigo-600 font-normal">
                          → {sr.linkedPrNo}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{dept?.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {sr.requestedBy} · {sr.dateRequested}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 max-w-xs truncate">{sr.purpose}</td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(totalVal, state.currency)}
                      </div>
                      <div className="text-[10.5px] text-slate-400">{sr.items.length} item(s)</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={sr.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSrId(sr.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => openPrintModal(buildSrPrintDraft(sr))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="Print SR Form"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {srs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No stock requests recorded for FY {fy}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View SR Detail Modal */}
      <Modal
        open={Boolean(selectedSr)}
        onClose={() => setSelectedSrId(null)}
        title={selectedSr ? `${selectedSr.srNo} — ${selectedSr.purpose}` : ''}
        subtitle={
          selectedSr
            ? `${
                state.departments.find((d) => d.id === selectedSr.departmentId)?.name ||
                selectedSr.departmentId
              } · Requested by ${selectedSr.requestedBy} on ${selectedSr.dateRequested}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {selectedSr && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedSr.status} />
                {selectedSr.issuedBy && (
                  <span className="text-slate-500">Issued by {selectedSr.issuedBy}</span>
                )}
                {selectedSr.linkedPrNo && (
                  <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    Linked PR: {selectedSr.linkedPrNo}
                  </span>
                )}
              </div>
              <div className="font-bold text-sm text-slate-900 tabular-nums">
                Est. Value:{' '}
                {formatCurrency(
                  selectedSr.items.reduce((s, it) => s + it.requestedQty * it.unitCost, 0),
                  state.currency
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-3 py-2.5 text-center">Unit</th>
                    <th className="px-3 py-2.5 text-right">In Stock</th>
                    <th className="px-3 py-2.5 text-right">Requested</th>
                    <th className="px-3 py-2.5 text-right">Issued</th>
                    <th className="px-4 py-2.5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {selectedSr.items.map((it) => {
                    const inv = state.inventory.find((i) => i.stockCode === it.stockCode);
                    const avail = inv?.stockOnHand ?? 0;
                    const isShort = avail < it.requestedQty && selectedSr.status !== 'Approved & Issued';
                    return (
                      <tr key={it.id}>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                          {it.stockCode}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{it.description}</td>
                        <td className="px-3 py-2.5 text-center">{it.unit}</td>
                        <td
                          className={`px-3 py-2.5 text-right font-semibold ${
                            isShort ? 'text-rose-600' : 'text-slate-600'
                          }`}
                        >
                          {formatNumber(avail)} {isShort ? '(Short)' : ''}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold">
                          {formatNumber(it.requestedQty)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                          {formatNumber(it.issuedQty)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {formatCurrency(it.requestedQty * it.unitCost, state.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => openPrintModal(buildSrPrintDraft(selectedSr))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
              >
                <Printer className="w-3.5 h-3.5" /> Print Physical SR Form
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {(selectedSr.status === 'Submitted' || selectedSr.status === 'Draft') &&
                  can('sr', 'issue') && (
                    <button
                      onClick={() => issueSr(selectedSr.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Issue Stock
                    </button>
                  )}

                {selectedSr.status === 'Needs Purchase (PR)' &&
                  !selectedSr.linkedPrNo &&
                  can('pr', 'create') && (
                    <button
                      onClick={() => {
                        const pr = convertSrToPr(selectedSr.id);
                        if (pr) setSelectedSrId(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" /> Convert Shortfall to PR
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create SR Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Stock Request (SR)"
        subtitle="Select items to withdraw from central supplies."
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Requesting Department
              </label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
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
              <label className="block font-semibold text-slate-700 mb-1">
                Purpose / Justification
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Catalog Item</th>
                  <th className="px-3 py-2 text-right">Available</th>
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
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
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
                        {short && ' (Short)'}
                      </td>
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
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-right"
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

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
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
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Submit Stock Request
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
