import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileUp,
  Plus,
  Printer,
  RotateCcw,
  Send,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { calcPrTotal, useDemo } from '../context/DemoContext';
import { PRLineItem, PRStatus, ProcurementMode } from '../types/procurement';
import { formatCurrency, formatNumber, uid } from '../utils/formatters';
import { Modal } from './Modal';
import { RbacNoticeBanner, StatusBadge } from './RbacBadge';

const MODES: ProcurementMode[] = [
  'PS-DBM / Agency-to-Agency',
  'Shopping (Sec. 52.1)',
  'Small Value Procurement (Sec. 53.9)',
  'Competitive Public Bidding',
  'Direct Contracting',
];

const PR_STAGE_INDEX: Record<PRStatus, number> = {
  Draft: 0,
  Returned: 0,
  Submitted: 1,
  'Funds Certified': 2,
  Approved: 3,
  'Converted to PO': 4,
};

export const PurchaseRequestPage: React.FC = () => {
  const {
    state,
    can,
    setActivePage,
    departmentSummaries,
    createPr,
    updatePrStatus,
    convertPrToPo,
    openPrintModal,
    buildPrPrintDraft,
    notify,
  } = useDemo();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [showConvertPoForm, setShowConvertPoForm] = useState(false);

  const defaultDept =
    state.activeRole === 'DEPT_USER' ? state.activeDeptUserScope : state.departments[0]?.id || 'IT';
  const [deptId, setDeptId] = useState(defaultDept);
  const [purpose, setPurpose] = useState('Q4 Critical Supplies & Peripheral Procurement');
  const [fundCluster, setFundCluster] = useState('01 - Regular Agency Fund');
  const [items, setItems] = useState<PRLineItem[]>(() => {
    const pick = state.inventory[3] || state.inventory[0];
    return pick
      ? [
          {
            id: uid('pri'),
            stockCode: pick.stockCode,
            description: pick.name,
            category: pick.category,
            unit: pick.unit,
            quantity: 10,
            unitCost: pick.unitCost,
          },
        ]
      : [];
  });

  // Convert PR to PO fields
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || '');
  const [poMode, setPoMode] = useState<ProcurementMode>('Small Value Procurement (Sec. 53.9)');
  const [deliveryTerm, setDeliveryTerm] = useState('15 Calendar Days upon receipt of PO');
  const [paymentTerm, setPaymentTerm] = useState('30 Days Net upon Inspection & Acceptance');

  const fy = state.activeFiscalYear;
  const prs = state.prs.filter((p) => p.fiscalYear === fy);
  const selectedPr = useMemo(
    () => state.prs.find((p) => p.id === selectedPrId),
    [state.prs, selectedPrId]
  );

  const selectedDeptSummary = departmentSummaries.find((d) => d.department.id === deptId);
  const draftTotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const exceedsBudget = selectedDeptSummary ? draftTotal > selectedDeptSummary.remaining : false;

  const handlePickCatalog = (idx: number, stockCode: string) => {
    const inv = state.inventory.find((i) => i.stockCode === stockCode);
    if (!inv) return;
    setItems((prev) =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              stockCode: inv.stockCode,
              description: inv.name,
              category: inv.category,
              unit: inv.unit,
              unitCost: inv.unitCost,
            }
          : row
      )
    );
  };

  const handleCreate = (submitNow: boolean) => {
    if (!purpose.trim() || items.length === 0) {
      notify('warning', 'Purpose and at least one item are required.');
      return;
    }
    const created = createPr({
      departmentId: deptId,
      purpose: purpose.trim(),
      fundCluster,
      items,
      submitImmediately: submitNow,
    });
    if (created) setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Step 3 · Purchase Requests (PR — FY {fy})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Each Purchase Request goes through: Submit → Certify Budget → Final Approve (HOPE) → Generate PO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can('pr', 'create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Purchase Request
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
        module="pr"
        action="certify_budget"
        actionLabel="Certify Funds Availability on Purchase Requests"
      />

      {/* Clean Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3.5 font-semibold">PR No.</th>
                <th className="px-4 py-3.5 font-semibold">Department</th>
                <th className="px-4 py-3.5 font-semibold">Purpose</th>
                <th className="px-3 py-3.5 font-semibold text-right">Items / ABC Total</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {prs.map((pr) => {
                const dept = state.departments.find((d) => d.id === pr.departmentId);
                const total = calcPrTotal(pr);
                return (
                  <tr
                    key={pr.id}
                    onClick={() => {
                      setSelectedPrId(pr.id);
                      setShowConvertPoForm(false);
                    }}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700">
                      <div>{pr.prNo}</div>
                      {pr.linkedPoNo && (
                        <div className="text-[10px] text-emerald-700 font-normal">
                          → {pr.linkedPoNo}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{dept?.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {pr.requestedBy} · {pr.dateRequested}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 max-w-xs truncate">{pr.purpose}</td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(total, state.currency)}
                      </div>
                      <div className="text-[10.5px] text-slate-400">{pr.items.length} item(s)</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={pr.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPrId(pr.id);
                            setShowConvertPoForm(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => openPrintModal(buildPrPrintDraft(pr))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="Print PR Form"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {prs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No purchase requests for FY {fy}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View PR Detail & Workflow Stepper Modal */}
      <Modal
        open={Boolean(selectedPr)}
        onClose={() => {
          setSelectedPrId(null);
          setShowConvertPoForm(false);
        }}
        title={selectedPr ? `${selectedPr.prNo} — ${selectedPr.purpose}` : ''}
        subtitle={
          selectedPr
            ? `${
                state.departments.find((d) => d.id === selectedPr.departmentId)?.name ||
                selectedPr.departmentId
              } · ${selectedPr.responsibilityCenter} · Requested by ${selectedPr.requestedBy}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {selectedPr && (
          <div className="space-y-5 text-xs">
            {/* Clean 4-Step Approval Progress */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedPr.status} />
                  {selectedPr.sourceRef && (
                    <span className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                      Source: {selectedPr.sourceRef}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  Total ABC: {formatCurrency(calcPrTotal(selectedPr), state.currency)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                {['1. Submitted', '2. Funds Certified', '3. Approved', '4. PO Created'].map(
                  (label, idx) => {
                    const currentStage = PR_STAGE_INDEX[selectedPr.status];
                    const reached = currentStage >= idx + 1;
                    return (
                      <div
                        key={label}
                        className={`rounded-lg px-2.5 py-2 text-center font-semibold border ${
                          reached
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        {label}
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-3 py-2.5 text-center">Unit</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5 text-right">Unit Cost</th>
                    <th className="px-4 py-2.5 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {selectedPr.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                        {it.stockCode}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{it.description}</td>
                      <td className="px-3 py-2.5 text-center">{it.unit}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {formatNumber(it.quantity)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatCurrency(it.unitCost, state.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {formatCurrency(it.quantity * it.unitCost, state.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inline Generate PO Panel inside Modal */}
            {showConvertPoForm && selectedPr.status === 'Approved' && (
              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 space-y-3">
                <h4 className="font-bold text-blue-950">Create Purchase Order from {selectedPr.prNo}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Supplier</label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                    >
                      {state.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Procurement Mode</label>
                    <select
                      value={poMode}
                      onChange={(e) => setPoMode(e.target.value as ProcurementMode)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                    >
                      {MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Delivery Term</label>
                    <input
                      type="text"
                      value={deliveryTerm}
                      onChange={(e) => setDeliveryTerm(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowConvertPoForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const po = convertPrToPo(
                        selectedPr.id,
                        supplierId,
                        poMode,
                        deliveryTerm,
                        paymentTerm
                      );
                      if (po) {
                        setShowConvertPoForm(false);
                        setSelectedPrId(null);
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Confirm & Create PO
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => openPrintModal(buildPrPrintDraft(selectedPr))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
              >
                <Printer className="w-3.5 h-3.5" /> Print Physical PR Form
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {(selectedPr.status === 'Draft' || selectedPr.status === 'Returned') &&
                  can('pr', 'create') && (
                    <button
                      onClick={() => updatePrStatus(selectedPr.id, 'Submitted')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit PR
                    </button>
                  )}

                {selectedPr.status === 'Submitted' && can('pr', 'certify_budget') && (
                  <button
                    onClick={() => updatePrStatus(selectedPr.id, 'Funds Certified')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certify Funds Available
                  </button>
                )}

                {selectedPr.status === 'Funds Certified' && can('pr', 'approve') && (
                  <button
                    onClick={() => updatePrStatus(selectedPr.id, 'Approved')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Final Approve PR
                  </button>
                )}

                {['Submitted', 'Funds Certified'].includes(selectedPr.status) &&
                  (can('pr', 'certify_budget') || can('pr', 'approve')) && (
                    <button
                      onClick={() => updatePrStatus(selectedPr.id, 'Returned')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Return
                    </button>
                  )}

                {selectedPr.status === 'Approved' && can('po', 'create') && !showConvertPoForm && (
                  <button
                    onClick={() => setShowConvertPoForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Generate Purchase Order (PO)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create PR Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Purchase Request (PR)"
        subtitle="Specify items to purchase against your department’s free budget."
        maxWidthClass="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          {selectedDeptSummary && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 flex justify-between tabular-nums">
              <span className="text-slate-600">
                Available Balance ({selectedDeptSummary.department.code}):
              </span>
              <strong className={exceedsBudget ? 'text-rose-600' : 'text-emerald-700'}>
                {formatCurrency(selectedDeptSummary.remaining, state.currency)}
                {exceedsBudget && ' — Exceeds Ceiling'}
              </strong>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Purpose</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fund Cluster</label>
              <input
                type="text"
                value={fundCluster}
                onChange={(e) => setFundCluster(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Catalog Item / Description</th>
                  <th className="px-2 py-2 w-20">Unit</th>
                  <th className="px-2 py-2 w-20 text-right">Qty</th>
                  <th className="px-2 py-2 w-24 text-right">Unit Cost</th>
                  <th className="px-3 py-2 w-28 text-right">Subtotal</th>
                  <th className="px-2 py-2 w-9"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {items.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="p-2 space-y-1">
                      <select
                        value={
                          state.inventory.some((i) => i.stockCode === row.stockCode)
                            ? row.stockCode
                            : ''
                        }
                        onChange={(e) => handlePickCatalog(idx, e.target.value)}
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
                      >
                        <option value="">-- Pick Catalog Item --</option>
                        {state.inventory.map((i) => (
                          <option key={i.id} value={i.stockCode}>
                            [{i.stockCode}] {i.name} ({formatCurrency(i.unitCost, state.currency)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) =>
                          setItems((p) =>
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
                          setItems((p) =>
                            p.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r))
                          )
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) =>
                          setItems((p) =>
                            p.map((r, i) =>
                              i === idx
                                ? { ...r, quantity: Math.max(1, Number(e.target.value) || 1) }
                                : r
                            )
                          )
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1 text-right"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        value={row.unitCost}
                        onChange={(e) =>
                          setItems((p) =>
                            p.map((r, i) =>
                              i === idx
                                ? { ...r, unitCost: Math.max(0, Number(e.target.value) || 0) }
                                : r
                            )
                          )
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatCurrency(row.quantity * row.unitCost, state.currency)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                const next = state.inventory[items.length % Math.max(1, state.inventory.length)];
                setItems((p) => [
                  ...p,
                  {
                    id: uid('pri'),
                    stockCode: next?.stockCode || 'CUSTOM-01',
                    description: next?.name || 'Custom Procurement Line Item',
                    category: next?.category || 'CSE - Paper & Office Supplies',
                    unit: next?.unit || 'pc',
                    quantity: 5,
                    unitCost: next?.unitCost || 500,
                  },
                ]);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tabular-nums mr-2">
                Total: {formatCurrency(draftTotal, state.currency)}
              </span>
              <button
                onClick={() => handleCreate(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleCreate(true)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Send className="w-3.5 h-3.5" /> Submit PR
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
