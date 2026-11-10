import React, { useState } from 'react';
import {
  CheckCircle2,
  FileUp,
  Plus,
  Printer,
  RotateCcw,
  Send,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { calcPrTotal, useDemo } from '../context/DemoContext';
import { PRLineItem, ProcurementMode } from '../types/procurement';
import { formatCurrency, formatNumber, uid } from '../utils/formatters';
import { RbacNoticeBanner, StatusBadge } from './RbacBadge';

const MODES: ProcurementMode[] = [
  'PS-DBM / Agency-to-Agency',
  'Shopping (Sec. 52.1)',
  'Small Value Procurement (Sec. 53.9)',
  'Competitive Public Bidding',
  'Direct Contracting',
];

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

  const [showCreate, setShowCreate] = useState(false);
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

  // Convert PR to PO modal state
  const [convertingPrId, setConvertingPrId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || '');
  const [poMode, setPoMode] = useState<ProcurementMode>('Small Value Procurement (Sec. 53.9)');
  const [deliveryTerm, setDeliveryTerm] = useState('15 Calendar Days upon receipt of PO');
  const [paymentTerm, setPaymentTerm] = useState('30 Days Net upon Inspection & Acceptance');

  const fy = state.activeFiscalYear;
  const prs = state.prs.filter((p) => p.fiscalYear === fy);

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
    if (created) setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Purchase Requests (PR — FY {fy})
          </h2>
          <p className="text-xs text-slate-500">
            Create purchase requests validated against departmental budget balances, certify funds availability, approve, and convert directly into Purchase Orders (PO).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('pr', 'create') && (
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Purchase Request
            </button>
          )}
          <button
            onClick={() => setActivePage('upload')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <FileUp className="w-4 h-4" /> Import File
          </button>
        </div>
      </div>

      <RbacNoticeBanner
        module="pr"
        action="certify_budget"
        actionLabel="Certify Funds Availability on Purchase Requests"
      />

      {showCreate && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Create Purchase Request (PR)</h3>
            {selectedDeptSummary && (
              <div className="tabular-nums">
                <span className="text-slate-500">Dept Free Balance: </span>
                <strong className={exceedsBudget ? 'text-rose-600' : 'text-emerald-700'}>
                  {formatCurrency(selectedDeptSummary.remaining, state.currency)}
                </strong>
                {exceedsBudget && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                    Exceeds Ceiling!
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Fund Cluster</label>
              <input
                type="text"
                value={fundCluster}
                onChange={(e) => setFundCluster(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Catalog Quick-Pick / Description</th>
                  <th className="px-2 py-2 w-24">Unit</th>
                  <th className="px-2 py-2 w-24 text-right">Qty</th>
                  <th className="px-2 py-2 w-28 text-right">Unit Cost (ABC)</th>
                  <th className="px-3 py-2 w-32 text-right">Total Cost</th>
                  <th className="px-2 py-2 w-10"></th>
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
                        <option value="">-- Select from Catalog or enter custom --</option>
                        {state.inventory.map((i) => (
                          <option key={i.id} value={i.stockCode}>
                            [{i.stockCode}] {i.name} ({formatCurrency(i.unitCost, state.currency)})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={row.stockCode}
                          onChange={(e) =>
                            setItems((p) =>
                              p.map((r, i) => (i === idx ? { ...r, stockCode: e.target.value } : r))
                            )
                          }
                          className="w-28 rounded border border-slate-300 px-2 py-1 font-mono text-[11px]"
                        />
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            setItems((p) =>
                              p.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r))
                            )
                          }
                          className="flex-1 rounded border border-slate-300 px-2 py-1"
                        />
                      </div>
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
                              i === idx ? { ...r, unitCost: Math.max(0, Number(e.target.value) || 0) } : r
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

          <div className="flex flex-wrap items-center justify-between gap-2">
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tabular-nums mr-2">
                Total ABC: {formatCurrency(draftTotal, state.currency)}
              </span>
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreate(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleCreate(true)}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Send className="w-3.5 h-3.5" /> Submit PR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PR Cards */}
      <div className="space-y-4">
        {prs.map((pr) => {
          const dept = state.departments.find((d) => d.id === pr.departmentId);
          const total = calcPrTotal(pr);
          const isConverting = convertingPrId === pr.id;
          return (
            <div
              key={pr.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {pr.prNo}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{pr.purpose}</h3>
                    <StatusBadge status={pr.status} />
                    {pr.sourceRef && (
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Ref: {pr.sourceRef}
                      </span>
                    )}
                    {pr.linkedPoNo && (
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                        PO: {pr.linkedPoNo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {dept?.name} ({pr.responsibilityCenter}) · Requested by {pr.requestedBy} on{' '}
                    {pr.dateRequested}
                    {pr.budgetCertifiedBy ? ` · Budget Certified: ${pr.budgetCertifiedBy}` : ''}
                    {pr.approvedBy ? ` · Approved: ${pr.approvedBy}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 tabular-nums mr-2">
                    {formatCurrency(total, state.currency)}
                  </span>

                  {(pr.status === 'Draft' || pr.status === 'Returned') && can('pr', 'create') && (
                    <button
                      onClick={() => updatePrStatus(pr.id, 'Submitted')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit
                    </button>
                  )}

                  {pr.status === 'Submitted' && can('pr', 'certify_budget') && (
                    <button
                      onClick={() => updatePrStatus(pr.id, 'Funds Certified')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Certify Funds
                    </button>
                  )}

                  {pr.status === 'Funds Certified' && can('pr', 'approve') && (
                    <button
                      onClick={() => updatePrStatus(pr.id, 'Approved')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve PR
                    </button>
                  )}

                  {['Submitted', 'Funds Certified'].includes(pr.status) &&
                    (can('pr', 'certify_budget') || can('pr', 'approve')) && (
                      <button
                        onClick={() => updatePrStatus(pr.id, 'Returned')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Return
                      </button>
                    )}

                  {pr.status === 'Approved' && can('po', 'create') && (
                    <button
                      onClick={() => setConvertingPrId(isConverting ? null : pr.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Generate PO
                    </button>
                  )}

                  <button
                    onClick={() => openPrintModal(buildPrPrintDraft(pr))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print PR Form
                  </button>
                </div>
              </div>

              {isConverting && (
                <div className="p-4 bg-blue-50/70 border-b border-blue-200 text-xs space-y-3">
                  <p className="font-bold text-blue-900">
                    Generate Purchase Order from {pr.prNo}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-medium text-slate-600 mb-1">Select Supplier</label>
                      <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
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
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
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
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => {
                          convertPrToPo(pr.id, supplierId, poMode, deliveryTerm, paymentTerm);
                          setConvertingPrId(null);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Create PO
                      </button>
                      <button
                        onClick={() => setConvertingPrId(null)}
                        className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white border-b border-slate-100 text-[11px] text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Stock Code</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Cost</th>
                      <th className="px-4 py-2 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {pr.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-600">
                          {it.stockCode}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-900">{it.description}</td>
                        <td className="px-3 py-2 text-center">{it.unit}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatNumber(it.quantity)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(it.unitCost, state.currency)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {formatCurrency(it.quantity * it.unitCost, state.currency)}
                        </td>
                      </tr>
                    ))}
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
