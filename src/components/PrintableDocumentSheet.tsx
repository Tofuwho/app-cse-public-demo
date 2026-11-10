import React, { useState } from 'react';
import { Download, Edit3, Eye, Printer, X } from 'lucide-react';
import { CurrencyCode, CustomPrintFormDraft, PrintableFormType } from '../types/procurement';
import { amountToWords, formatCurrency, formatNumber } from '../utils/formatters';
import { exportRowsToExcel } from '../utils/fileExtractor';
import { useDemo } from '../context/DemoContext';

const FORM_TITLES: Record<PrintableFormType, { title: string; subtitle: string; code: string }> = {
  PPMP: {
    title: 'PROJECT PROCUREMENT MANAGEMENT PLAN (PPMP)',
    subtitle: 'Departmental Annual Supplies & Equipment Schedule',
    code: 'FORM-PPMP-01',
  },
  APP_CSE: {
    title: 'ANNUAL PROCUREMENT PLAN — COMMON-USE SUPPLIES & EQUIPMENT (APP-CSE)',
    subtitle: 'Consolidated Agency-Wide Procurement Master Schedule',
    code: 'FORM-APP-CSE-02',
  },
  SR: {
    title: 'STOCK REQUISITION & ISSUE SLIP (SR / RIS)',
    subtitle: 'Internal Warehouse Supply Request & Issuance Record',
    code: 'FORM-SR-RIS-03',
  },
  PR: {
    title: 'PURCHASE REQUEST (PR)',
    subtitle: 'Formal Request for Procurement & Fund Certification',
    code: 'FORM-PR-04',
  },
  PO: {
    title: 'PURCHASE ORDER (PO)',
    subtitle: 'Official Supplier Order & Delivery Authorization',
    code: 'FORM-PO-05',
  },
};

export const PrintableDocumentSheet: React.FC<{
  draft: CustomPrintFormDraft;
  currency: CurrencyCode;
}> = ({ draft, currency }) => {
  const meta = FORM_TITLES[draft.formType];
  const isQuarterly = draft.formType === 'PPMP' || draft.formType === 'APP_CSE';
  const grossTotal = draft.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);

  const vatRate = draft.taxRate || 0;
  const whtRate = draft.withholdingRate || 0;
  const vatableBase = vatRate > 0 ? grossTotal / (1 + vatRate / 100) : grossTotal;
  const vatAmount = grossTotal - vatableBase;
  const withholdingAmount = vatableBase * (whtRate / 100);
  const netPayable = grossTotal - withholdingAmount;

  return (
    <div className="print-sheet bg-white text-slate-900 border border-slate-300 shadow-lg mx-auto max-w-[900px] p-8 text-[12px] leading-snug">
      {/* Top Institutional Header (Brand-Free / Generic) */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Institutional Procurement & Supply Sandbox
          </p>
          <h1 className="text-lg font-extrabold text-slate-900 mt-0.5 uppercase tracking-tight">
            {draft.entityName || 'OpenProcure Public Demo Entity'}
          </h1>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {meta.subtitle} · Fiscal Year {draft.fiscalYear}
          </p>
        </div>
        <div className="text-right border border-slate-400 px-3 py-2 bg-slate-50">
          <div className="text-[10px] font-bold uppercase text-slate-500">{meta.code}</div>
          <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">{draft.docNo}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">Date: {draft.date}</div>
        </div>
      </div>

      {/* Form Title Banner */}
      <div className="bg-slate-900 text-white text-center py-2 px-4 font-bold tracking-wider text-xs uppercase mb-4">
        {meta.title}
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-slate-400 p-3 mb-4 bg-slate-50/50">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
            Department / Office
          </span>
          <span className="font-semibold text-slate-900">{draft.departmentName}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
            Fund Cluster / Cost Center
          </span>
          <span className="font-semibold text-slate-900">
            {draft.fundCluster} ({draft.costCenter})
          </span>
        </div>
        <div className="col-span-2 border-t border-slate-200 pt-2">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
            {draft.formType === 'PO' ? 'Procurement Reference' : 'Purpose / Plan Title'}
          </span>
          <span className="font-medium text-slate-900">{draft.purposeOrTitle}</span>
        </div>

        {draft.formType === 'PO' && (
          <>
            <div className="border-t border-slate-200 pt-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Supplier / Awardee
              </span>
              <span className="font-bold text-slate-900">{draft.supplierName || 'N/A'}</span>
              {draft.supplierAddress && (
                <span className="block text-[11px] text-slate-600">{draft.supplierAddress}</span>
              )}
              {draft.supplierTin && (
                <span className="block text-[10px] font-mono text-slate-600">
                  TIN: {draft.supplierTin}
                </span>
              )}
            </div>
            <div className="border-t border-slate-200 pt-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Mode / Delivery & Payment Terms
              </span>
              <span className="font-medium text-slate-900 block">{draft.modeOfProcurement}</span>
              <span className="text-[11px] text-slate-600 block">
                Delivery: {draft.deliveryTerm}
              </span>
              <span className="text-[11px] text-slate-600 block">Payment: {draft.paymentTerm}</span>
            </div>
          </>
        )}
      </div>

      {/* Line Items Table */}
      <table className="w-full border-collapse border border-slate-400 mb-4 text-[11px]">
        <thead>
          <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-[10px]">
            <th className="border border-slate-400 px-2 py-1.5 text-center w-8">#</th>
            <th className="border border-slate-400 px-2 py-1.5 text-left w-24">Stock Code</th>
            <th className="border border-slate-400 px-2 py-1.5 text-left">Item Description / Specs</th>
            <th className="border border-slate-400 px-2 py-1.5 text-center w-14">Unit</th>
            {isQuarterly ? (
              <>
                <th className="border border-slate-400 px-1.5 py-1.5 text-right w-10">Q1</th>
                <th className="border border-slate-400 px-1.5 py-1.5 text-right w-10">Q2</th>
                <th className="border border-slate-400 px-1.5 py-1.5 text-right w-10">Q3</th>
                <th className="border border-slate-400 px-1.5 py-1.5 text-right w-10">Q4</th>
              </>
            ) : null}
            <th className="border border-slate-400 px-2 py-1.5 text-right w-16">Total Qty</th>
            <th className="border border-slate-400 px-2 py-1.5 text-right w-24">Unit Cost</th>
            <th className="border border-slate-400 px-2 py-1.5 text-right w-28">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {draft.items.length === 0 ? (
            <tr>
              <td
                colSpan={isQuarterly ? 11 : 7}
                className="border border-slate-400 px-4 py-6 text-center text-slate-500 italic"
              >
                No line items attached to this form.
              </td>
            </tr>
          ) : (
            draft.items.map((item, idx) => (
              <tr key={`${item.stockCode}-${idx}`} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                <td className="border border-slate-400 px-2 py-1.5 text-center tabular-nums">
                  {idx + 1}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 font-mono text-[10px]">
                  {item.stockCode}
                </td>
                <td className="border border-slate-400 px-2 py-1.5">
                  <div className="font-medium text-slate-900">{item.description}</div>
                  {item.mode && (
                    <div className="text-[9.5px] text-slate-500">Mode: {item.mode}</div>
                  )}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-center">{item.unit}</td>
                {isQuarterly ? (
                  <>
                    <td className="border border-slate-400 px-1.5 py-1.5 text-right tabular-nums">
                      {formatNumber(item.q1Qty ?? 0)}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-1.5 text-right tabular-nums">
                      {formatNumber(item.q2Qty ?? 0)}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-1.5 text-right tabular-nums">
                      {formatNumber(item.q3Qty ?? 0)}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-1.5 text-right tabular-nums">
                      {formatNumber(item.q4Qty ?? 0)}
                    </td>
                  </>
                ) : null}
                <td className="border border-slate-400 px-2 py-1.5 text-right font-semibold tabular-nums">
                  {formatNumber(item.quantity)}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right tabular-nums">
                  {formatCurrency(item.unitCost, currency)}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right font-semibold tabular-nums">
                  {formatCurrency(item.quantity * item.unitCost, currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold text-slate-900">
            <td
              colSpan={isQuarterly ? 10 : 6}
              className="border border-slate-400 px-2 py-2 text-right uppercase text-[10px]"
            >
              Total Gross Amount ({draft.items.length} line item{draft.items.length === 1 ? '' : 's'})
            </td>
            <td className="border border-slate-400 px-2 py-2 text-right text-sm tabular-nums">
              {formatCurrency(grossTotal, currency)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Tax / Amount in Words Section */}
      <div className="print-avoid-break border border-slate-400 p-3 mb-5 bg-slate-50/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[260px]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Total Amount in Words
            </span>
            <span className="font-bold text-slate-900 italic">
              {amountToWords(grossTotal, currency)}
            </span>
          </div>
          {draft.formType === 'PO' && (
            <div className="text-right text-[11px] space-y-0.5 tabular-nums border-l border-slate-300 pl-4">
              <div>
                Vatable Sales Base: <span className="font-semibold">{formatCurrency(vatableBase, currency)}</span>
              </div>
              <div>
                VAT ({vatRate}% incl.): <span className="font-semibold">{formatCurrency(vatAmount, currency)}</span>
              </div>
              <div>
                Less Withholding ({whtRate}%):{' '}
                <span className="font-semibold text-rose-700">
                  -{formatCurrency(withholdingAmount, currency)}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-0.5 font-bold text-slate-900">
                Net Check Payable: {formatCurrency(netPayable, currency)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signatory Grid */}
      <div className="print-avoid-break grid grid-cols-2 sm:grid-cols-4 gap-4 border border-slate-400 p-4">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-6">
            {draft.formType === 'SR' || draft.formType === 'PR' ? 'Requested By' : 'Prepared By'}
          </p>
          <div className="border-b border-slate-800 pb-0.5 font-bold text-slate-900 text-center">
            {draft.preparedBy || '________________'}
          </div>
          <p className="text-[9.5px] text-slate-500 text-center mt-1">Signature over Printed Name</p>
        </div>

        <div>
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-6">
            Funds / Budget Certified
          </p>
          <div className="border-b border-slate-800 pb-0.5 font-bold text-slate-900 text-center">
            {draft.certifiedBy || '________________'}
          </div>
          <p className="text-[9.5px] text-slate-500 text-center mt-1">Budget & Fiscal Office</p>
        </div>

        <div>
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-6">Approved By</p>
          <div className="border-b border-slate-800 pb-0.5 font-bold text-slate-900 text-center">
            {draft.approvedBy || '________________'}
          </div>
          <p className="text-[9.5px] text-slate-500 text-center mt-1">Approving Authority (HOPE)</p>
        </div>

        <div>
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-6">
            {draft.formType === 'PO' ? 'Supplier Conforme / Rcvd' : 'Issued / Received By'}
          </p>
          <div className="border-b border-slate-800 pb-0.5 font-bold text-slate-900 text-center">
            {draft.receivedBy || '________________'}
          </div>
          <p className="text-[9.5px] text-slate-500 text-center mt-1">Date & Signature</p>
        </div>
      </div>

      {/* Physical Copy Verification Footer */}
      <div className="mt-4 pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[9.5px] text-slate-500">
        <span>
          Generated for Physical Copy Printing · OpenProcure Public Sandbox Demo (No Official Agency Affiliation)
        </span>
        <span className="font-mono">CTRL: {draft.docNo}</span>
      </div>
    </div>
  );
};

export const PrintableModal: React.FC = () => {
  const { printModalDraft, closePrintModal, state, can, notify } = useDemo();
  const [editMode, setEditMode] = useState(false);
  const [editedDraft, setEditedDraft] = useState<CustomPrintFormDraft | null>(null);

  if (!printModalDraft) return null;

  const activeDraft = editedDraft || printModalDraft;

  const handlePrint = () => {
    if (!can('print', 'print')) {
      notify('error', 'RBAC Denied: Your current role does not have print permission.');
      return;
    }
    window.print();
  };

  const handleExportExcel = () => {
    exportRowsToExcel(
      `${activeDraft.docNo}.xlsx`,
      activeDraft.formType,
      activeDraft.items.map((it, i) => ({
        Line: i + 1,
        Stock_Code: it.stockCode,
        Description: it.description,
        Unit: it.unit,
        Quantity: it.quantity,
        Unit_Cost: it.unitCost,
        Total_Amount: it.quantity * it.unitCost,
      }))
    );
    notify('success', `Exported ${activeDraft.docNo}.xlsx.`);
  };

  const updateField = <K extends keyof CustomPrintFormDraft>(key: K, val: CustomPrintFormDraft[K]) => {
    setEditedDraft((prev) => ({ ...(prev || activeDraft), [key]: val }));
  };

  return (
    <div className="print-container fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col overflow-y-auto p-4 sm:p-6">
      {/* Sticky Toolbar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 max-w-[900px] w-full mx-auto mb-4 bg-white border border-slate-200 rounded-xl shadow-md px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Physical Copy Print Preview — {activeDraft.docNo}
            </h3>
            <p className="text-xs text-slate-500">
              Review or customize signatories & headers, then print or save as PDF.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {editMode ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            {editMode ? 'Preview Only' : 'Customize Fields'}
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export .xlsx
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Physical Copy
          </button>
          <button
            onClick={() => {
              setEditedDraft(null);
              setEditMode(false);
              closePrintModal();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Optional inline metadata editor before printing */}
      {editMode && (
        <div className="no-print max-w-[900px] w-full mx-auto mb-4 bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-blue-700 mb-3">
            Pre-Print Document Field Overrides (For Physical Copy)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Entity / Org Title</label>
              <input
                type="text"
                value={activeDraft.entityName}
                onChange={(e) => updateField('entityName', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Control / Doc No.</label>
              <input
                type="text"
                value={activeDraft.docNo}
                onChange={(e) => updateField('docNo', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Prepared / Requested By</label>
              <input
                type="text"
                value={activeDraft.preparedBy}
                onChange={(e) => updateField('preparedBy', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Budget Certified By</label>
              <input
                type="text"
                value={activeDraft.certifiedBy}
                onChange={(e) => updateField('certifiedBy', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Approved By (HOPE)</label>
              <input
                type="text"
                value={activeDraft.approvedBy}
                onChange={(e) => updateField('approvedBy', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Issued / Received By</label>
              <input
                type="text"
                value={activeDraft.receivedBy}
                onChange={(e) => updateField('receivedBy', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet */}
      <PrintableDocumentSheet draft={activeDraft} currency={state.currency} />
    </div>
  );
};
