import React, { useState } from 'react';
import { Download, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { CustomPrintFormDraft, PrintableFormType } from '../types/procurement';
import { exportRowsToExcel } from '../utils/fileExtractor';
import { todayIso } from '../utils/formatters';
import { PrintableDocumentSheet } from './PrintableDocumentSheet';

export const PrintFormStudio: React.FC = () => {
  const {
    state,
    can,
    activeRoleDef,
    currentFiscalConfig,
    buildPpmpPrintDraft,
    buildAppCsePrintDraft,
    buildSrPrintDraft,
    buildPrPrintDraft,
    buildPoPrintDraft,
    notify,
  } = useDemo();

  const [draft, setDraft] = useState<CustomPrintFormDraft>(() => {
    const firstPr = state.prs[0];
    if (firstPr) return buildPrPrintDraft(firstPr);
    return {
      formType: 'PR',
      entityName: state.entityName,
      fundCluster: '01 - Regular Agency Fund',
      fiscalYear: state.activeFiscalYear,
      docNo: `PR-${state.activeFiscalYear}-CUSTOM`,
      date: todayIso(),
      departmentName: state.departments[0]?.name || 'Administrative Services',
      costCenter: 'CC-1001',
      purposeOrTitle: 'Physical Copy Print Demonstration',
      supplierName: state.suppliers[0]?.name || 'CivicDepot Public Supply Hub',
      supplierAddress: state.suppliers[0]?.address || '',
      supplierTin: state.suppliers[0]?.tin || '',
      deliveryTerm: '15 Calendar Days',
      paymentTerm: '30 Days Net',
      modeOfProcurement: 'PS-DBM / Agency-to-Agency',
      preparedBy: activeRoleDef.personaName,
      certifiedBy: 'Morgan Reyes (Budget Officer)',
      approvedBy: 'Riley Cruz (HOPE)',
      receivedBy: 'Jordan Navarro (Supply Custodian)',
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: currentFiscalConfig.defaultWithholdingRate,
      items: [
        {
          stockCode: 'CSE-PPR-001',
          description: 'Bond Paper A4 (80gsm, 500 sheets)',
          unit: 'ream',
          q1Qty: 25,
          q2Qty: 25,
          q3Qty: 25,
          q4Qty: 25,
          quantity: 100,
          unitCost: 235,
        },
      ],
    };
  });

  const handleLoadBlankTemplate = (formType: PrintableFormType) => {
    if (formType === 'APP_CSE') {
      setDraft(buildAppCsePrintDraft());
      return;
    }
    setDraft((prev) => ({
      ...prev,
      formType,
      docNo: `${formType}-${state.activeFiscalYear}-DRAFT`,
      date: todayIso(),
      entityName: state.entityName,
      fiscalYear: state.activeFiscalYear,
    }));
  };

  const handleLoadRecord = (key: string) => {
    if (!key) return;
    const [kind, id] = key.split('::');
    if (kind === 'PPMP') {
      const rec = state.ppmps.find((p) => p.id === id);
      if (rec) setDraft(buildPpmpPrintDraft(rec));
    } else if (kind === 'APP_CSE') {
      setDraft(buildAppCsePrintDraft());
    } else if (kind === 'SR') {
      const rec = state.srs.find((s) => s.id === id);
      if (rec) setDraft(buildSrPrintDraft(rec));
    } else if (kind === 'PR') {
      const rec = state.prs.find((p) => p.id === id);
      if (rec) setDraft(buildPrPrintDraft(rec));
    } else if (kind === 'PO') {
      const rec = state.pos.find((p) => p.id === id);
      if (rec) setDraft(buildPoPrintDraft(rec));
    }
  };

  const handlePrint = () => {
    if (!can('print', 'print')) {
      notify('error', 'RBAC Denied: Your current role cannot print forms.');
      return;
    }
    window.print();
  };

  const isQuarterly = draft.formType === 'PPMP' || draft.formType === 'APP_CSE';

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Interactive Form Generator & Physical Copy Print Studio
          </h2>
          <p className="text-xs text-slate-500">
            Input data or load any PPMP, APP-CSE, SR, PR, or PO record below — watch the official physical form update live and print cleanly to paper or PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              exportRowsToExcel(
                `${draft.docNo}.xlsx`,
                draft.formType,
                draft.items.map((it, i) => ({
                  Line: i + 1,
                  Stock_Code: it.stockCode,
                  Description: it.description,
                  Unit: it.unit,
                  Quantity: it.quantity,
                  Unit_Cost: it.unitCost,
                  Total: it.quantity * it.unitCost,
                }))
              );
              notify('success', `Exported ${draft.docNo}.xlsx`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Physical Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Data Input Column (hidden on print) */}
        <div className="no-print xl:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">1. Form Type & Load Data</span>
            <select
              defaultValue=""
              onChange={(e) => {
                handleLoadRecord(e.target.value);
                e.target.value = '';
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-slate-50 max-w-[230px]"
            >
              <option value="">-- Load Existing Record --</option>
              <option value="APP_CSE::MASTER">APP-CSE Consolidated Master</option>
              {state.ppmps.map((p) => (
                <option key={p.id} value={`PPMP::${p.id}`}>
                  PPMP: {p.ppmpNo}
                </option>
              ))}
              {state.srs.map((s) => (
                <option key={s.id} value={`SR::${s.id}`}>
                  SR: {s.srNo}
                </option>
              ))}
              {state.prs.map((p) => (
                <option key={p.id} value={`PR::${p.id}`}>
                  PR: {p.prNo}
                </option>
              ))}
              {state.pos.map((p) => (
                <option key={p.id} value={`PO::${p.id}`}>
                  PO: {p.poNo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['PPMP', 'APP_CSE', 'SR', 'PR', 'PO'] as PrintableFormType[]).map((ft) => (
              <button
                key={ft}
                onClick={() => handleLoadBlankTemplate(ft)}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  draft.formType === ft
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {ft.replace('_', '-')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">
                Entity / Organization Header
              </label>
              <input
                type="text"
                value={draft.entityName}
                onChange={(e) => setDraft((d) => ({ ...d, entityName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Control / Doc No.</label>
              <input
                type="text"
                value={draft.docNo}
                onChange={(e) => setDraft((d) => ({ ...d, docNo: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Document Date</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Department / Office</label>
              <input
                type="text"
                value={draft.departmentName}
                onChange={(e) => setDraft((d) => ({ ...d, departmentName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Fund Cluster</label>
              <input
                type="text"
                value={draft.fundCluster}
                onChange={(e) => setDraft((d) => ({ ...d, fundCluster: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">Purpose / Title</label>
              <input
                type="text"
                value={draft.purposeOrTitle}
                onChange={(e) => setDraft((d) => ({ ...d, purposeOrTitle: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>

            {draft.formType === 'PO' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={draft.supplierName}
                    onChange={(e) => setDraft((d) => ({ ...d, supplierName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Supplier TIN</label>
                  <input
                    type="text"
                    value={draft.supplierTin}
                    onChange={(e) => setDraft((d) => ({ ...d, supplierTin: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Prepared / Requested By</label>
              <input
                type="text"
                value={draft.preparedBy}
                onChange={(e) => setDraft((d) => ({ ...d, preparedBy: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Budget Certified By</label>
              <input
                type="text"
                value={draft.certifiedBy}
                onChange={(e) => setDraft((d) => ({ ...d, certifiedBy: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Approved By (HOPE)</label>
              <input
                type="text"
                value={draft.approvedBy}
                onChange={(e) => setDraft((d) => ({ ...d, approvedBy: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Issued / Received By</label>
              <input
                type="text"
                value={draft.receivedBy}
                onChange={(e) => setDraft((d) => ({ ...d, receivedBy: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
              />
            </div>
          </div>

          {/* Line Items Input */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">2. Line Items ({draft.items.length})</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    items: [
                      ...d.items,
                      {
                        stockCode: `ITEM-${d.items.length + 1}`,
                        description: 'New Supply Item',
                        unit: 'pc',
                        q1Qty: 5,
                        q2Qty: 5,
                        q3Qty: 5,
                        q4Qty: 5,
                        quantity: 20,
                        unitCost: 150,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {draft.items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2"
                >
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={it.stockCode}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.map((r, i) =>
                            i === idx ? { ...r, stockCode: e.target.value } : r
                          ),
                        }))
                      }
                      className="w-24 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[11px]"
                      placeholder="Code"
                    />
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.map((r, i) =>
                            i === idx ? { ...r, description: e.target.value } : r
                          ),
                        }))
                      }
                      className="flex-1 rounded border border-slate-300 bg-white px-2 py-1"
                      placeholder="Item description"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          items: d.items.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Unit</span>
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            items: d.items.map((r, i) =>
                              i === idx ? { ...r, unit: e.target.value } : r
                            ),
                          }))
                        }
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">
                        {isQuarterly ? 'Total Qty (Q1-Q4)' : 'Quantity'}
                      </span>
                      <input
                        type="number"
                        value={it.quantity}
                        onChange={(e) => {
                          const qty = Math.max(0, Number(e.target.value) || 0);
                          setDraft((d) => ({
                            ...d,
                            items: d.items.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    quantity: qty,
                                    q1Qty: Math.ceil(qty / 4),
                                    q2Qty: Math.floor(qty / 4),
                                    q3Qty: Math.floor(qty / 4),
                                    q4Qty: Math.max(0, qty - Math.ceil(qty / 4) - 2 * Math.floor(qty / 4)),
                                  }
                                : r
                            ),
                          }));
                        }}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-right tabular-nums"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Unit Cost</span>
                      <input
                        type="number"
                        value={it.unitCost}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            items: d.items.map((r, i) =>
                              i === idx
                                ? { ...r, unitCost: Math.max(0, Number(e.target.value) || 0) }
                                : r
                            ),
                          }))
                        }
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-right tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleLoadBlankTemplate(draft.formType)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <RefreshCw className="w-3 h-3" /> Reset Doc Header
            </button>
          </div>
        </div>

        {/* Right Live Physical Sheet Preview (prints full page) */}
        <div className="print-container xl:col-span-7">
          <PrintableDocumentSheet draft={draft} currency={state.currency} />
        </div>
      </div>
    </div>
  );
};
