import React, { useMemo, useState } from 'react';
import {
  Eye,
  FileUp,
  PackageCheck,
  Plus,
  Printer,
  Send,
  Trash2,
} from 'lucide-react';
import { calcPoSubtotal, useDemo } from '../context/DemoContext';
import { ProcurementMode } from '../types/procurement';
import { amountToWords, formatCurrency, formatNumber } from '../utils/formatters';
import { Modal } from './Modal';
import { RbacNoticeBanner, StatusBadge } from './RbacBadge';

const MODES: ProcurementMode[] = [
  'PS-DBM / Agency-to-Agency',
  'Shopping (Sec. 52.1)',
  'Small Value Procurement (Sec. 53.9)',
  'Competitive Public Bidding',
  'Direct Contracting',
];

export const PurchaseOrderPage: React.FC = () => {
  const {
    state,
    can,
    setActivePage,
    currentFiscalConfig,
    createPoDirect,
    issuePo,
    receivePoDelivery,
    openPrintModal,
    buildPoPrintDraft,
    notify,
  } = useDemo();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const [deptId, setDeptId] = useState(state.departments[0]?.id || 'ADMIN');
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || '');
  const [prRef, setPrRef] = useState('PR-DIRECT-001');
  const [mode, setMode] = useState<ProcurementMode>('Shopping (Sec. 52.1)');
  const [deliveryTerm, setDeliveryTerm] = useState('15 Calendar Days upon receipt');
  const [paymentTerm, setPaymentTerm] = useState('30 Days Net upon Inspection');
  const [items, setItems] = useState([
    {
      stockCode: state.inventory[0]?.stockCode || 'CSE-PPR-001',
      description: state.inventory[0]?.name || 'Bond Paper A4 (80gsm, 500 sheets)',
      unit: state.inventory[0]?.unit || 'ream',
      quantity: 25,
      unitCost: state.inventory[0]?.unitCost || 235,
    },
  ]);

  const fy = state.activeFiscalYear;
  const pos = state.pos.filter((p) => p.fiscalYear === fy);
  const selectedPo = useMemo(
    () => state.pos.find((p) => p.id === selectedPoId),
    [state.pos, selectedPoId]
  );

  const handlePickCatalog = (idx: number, code: string) => {
    const inv = state.inventory.find((i) => i.stockCode === code);
    if (!inv) return;
    setItems((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              stockCode: inv.stockCode,
              description: inv.name,
              unit: inv.unit,
              quantity: r.quantity,
              unitCost: inv.unitCost,
            }
          : r
      )
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      notify('warning', 'Add at least one PO line item.');
      return;
    }
    const created = createPoDirect({
      departmentId: deptId,
      prNo: prRef,
      supplierId,
      modeOfProcurement: mode,
      deliveryTerm,
      paymentTerm,
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: currentFiscalConfig.defaultWithholdingRate,
      taxInclusive: true,
      items,
    });
    if (created) setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Step 4 · Purchase Orders (PO — FY {fy})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Send approved orders to suppliers. When items arrive at the warehouse, click "Receive Delivery" to add them into Inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can('po', 'create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Purchase Order
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
        module="po"
        action="receive"
        actionLabel="Receive PO Deliveries into Warehouse Inventory"
      />

      {/* Clean Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3.5 font-semibold">PO No.</th>
                <th className="px-4 py-3.5 font-semibold">Supplier</th>
                <th className="px-4 py-3.5 font-semibold">Department</th>
                <th className="px-3 py-3.5 font-semibold text-right">PO Gross Amount</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {pos.map((po) => {
                const dept = state.departments.find((d) => d.id === po.departmentId);
                const gross = calcPoSubtotal(po);
                return (
                  <tr
                    key={po.id}
                    onClick={() => setSelectedPoId(po.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700">
                      <div>{po.poNo}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Ref: {po.prNo}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{po.supplierName}</div>
                      <div className="text-[11px] text-slate-400">{po.modeOfProcurement}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{dept?.name}</div>
                      <div className="text-[11px] text-slate-400">Issued {po.dateIssued}</div>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(gross, state.currency)}
                      </div>
                      <div className="text-[10.5px] text-slate-400">{po.items.length} item(s)</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedPoId(po.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => openPrintModal(buildPoPrintDraft(po))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="Print Official PO"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No purchase orders for FY {fy}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View PO Detail Modal */}
      <Modal
        open={Boolean(selectedPo)}
        onClose={() => setSelectedPoId(null)}
        title={selectedPo ? `${selectedPo.poNo} — ${selectedPo.supplierName}` : ''}
        subtitle={
          selectedPo
            ? `${selectedPo.modeOfProcurement} · Ref ${selectedPo.prNo} · Delivery: ${selectedPo.deliveryTerm}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {selectedPo &&
          (() => {
            const gross = calcPoSubtotal(selectedPo);
            const vatable =
              selectedPo.taxRate > 0 ? gross / (1 + selectedPo.taxRate / 100) : gross;
            const wht = vatable * (selectedPo.withholdingRate / 100);
            const netPayable = gross - wht;

            return (
              <div className="space-y-5 text-xs">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedPo.status} />
                      {selectedPo.receivedDate && (
                        <span className="text-slate-500">
                          Received {selectedPo.receivedDate} by {selectedPo.receivedBy}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 italic">
                      {amountToWords(gross, state.currency)}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-sm font-bold text-slate-900">
                      Gross: {formatCurrency(gross, state.currency)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Net Check (after {selectedPo.withholdingRate}% EWT):{' '}
                      <strong className="text-blue-700">
                        {formatCurrency(netPayable, state.currency)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Code</th>
                        <th className="px-4 py-2.5">Item Description</th>
                        <th className="px-3 py-2.5 text-center">Unit</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3 py-2.5 text-right">Unit Cost</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {selectedPo.items.map((it) => (
                        <tr key={it.id}>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                            {it.stockCode}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {it.description}
                          </td>
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

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openPrintModal(buildPoPrintDraft(selectedPo))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Official PO
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedPo.status === 'Draft' && can('po', 'issue') && (
                      <button
                        onClick={() => issuePo(selectedPo.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        <Send className="w-3.5 h-3.5" /> Issue PO to Supplier
                      </button>
                    )}

                    {selectedPo.status === 'Approved & Issued' && can('po', 'receive') && (
                      <button
                        onClick={() => receivePoDelivery(selectedPo.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Receive Delivery (Stock In)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* Create Direct PO Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Direct Purchase Order"
        subtitle="Create a PO directly for a supplier or reference an existing PR."
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {state.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
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
              <label className="block font-semibold text-slate-700 mb-1">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ProcurementMode)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reference PR No.</label>
              <input
                type="text"
                value={prRef}
                onChange={(e) => setPrRef(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivery Term</label>
              <input
                type="text"
                value={deliveryTerm}
                onChange={(e) => setDeliveryTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Term</label>
              <input
                type="text"
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value)}
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
                  <tr key={idx}>
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
                            [{i.stockCode}] {i.name}
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

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => {
                const pick = state.inventory[items.length % Math.max(1, state.inventory.length)];
                setItems((p) => [
                  ...p,
                  {
                    stockCode: pick?.stockCode || 'CSE-NEW-01',
                    description: pick?.name || 'Supply Line Item',
                    unit: pick?.unit || 'pc',
                    quantity: 5,
                    unitCost: pick?.unitCost || 300,
                  },
                ]);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            <div className="flex gap-2">
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
                Create Draft PO
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
