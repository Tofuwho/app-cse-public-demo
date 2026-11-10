import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  FileUp,
  PackagePlus,
  Printer,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { ExtractedRow, PrintableFormType } from '../types/procurement';
import {
  ALLOWED_EXTENSIONS,
  ColumnMapping,
  MappingField,
  RawTableParseResult,
  SAMPLE_EXTRACTION_CSV,
  buildExtractedRows,
  downloadSampleTemplate,
  parseStructuredText,
  parseUploadedFile,
} from '../utils/fileExtractor';
import { formatCurrency, formatNumber, todayIso, uid } from '../utils/formatters';
import { RbacNoticeBanner } from './RbacBadge';

const MAPPING_FIELDS: Array<{ key: MappingField; label: string }> = [
  { key: 'stockCode', label: 'Stock Code' },
  { key: 'description', label: 'Description' },
  { key: 'unit', label: 'Unit' },
  { key: 'unitCost', label: 'Unit Cost' },
  { key: 'quantity', label: 'Total Qty' },
  { key: 'q1Qty', label: 'Q1 Qty' },
  { key: 'q2Qty', label: 'Q2 Qty' },
  { key: 'q3Qty', label: 'Q3 Qty' },
  { key: 'q4Qty', label: 'Q4 Qty' },
  { key: 'category', label: 'Category' },
  { key: 'mode', label: 'Mode' },
];

export const FileUploadExtractPage: React.FC = () => {
  const {
    state,
    can,
    setActivePage,
    createPpmp,
    importExtractedToInventory,
    createSr,
    createPr,
    createPoDirect,
    openPrintModal,
    activeRoleDef,
    currentFiscalConfig,
    notify,
  } = useDemo();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState(SAMPLE_EXTRACTION_CSV);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [parseResult, setParseResult] = useState<RawTableParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [editableRows, setEditableRows] = useState<ExtractedRow[]>([]);

  const [targetDept, setTargetDept] = useState<string>(
    state.activeRole === 'DEPT_USER' ? state.activeDeptUserScope : state.departments[0]?.id || 'IT'
  );
  const [targetTitle, setTargetTitle] = useState<string>('Extracted Procurement Items Batch');

  const canUpload = can('upload', 'upload');

  const applyParseResult = (res: RawTableParseResult) => {
    setParseResult(res);
    setMapping(res.suggestedMapping);
    setEditableRows(buildExtractedRows(res.rows, res.suggestedMapping));
    setShowMapper(false);
    setErrorMsg(null);
    notify('success', `Extracted ${res.rows.length} rows from ${res.fileName}.`);
  };

  const handleFileSelected = async (file: File) => {
    if (!canUpload) {
      notify('error', 'RBAC Denied: Active role cannot upload & extract files.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await parseUploadedFile(file);
      applyParseResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to parse uploaded file.';
      setErrorMsg(msg);
      notify('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleParseText = (text: string, label = 'pasted-table.csv') => {
    if (!canUpload) {
      notify('error', 'RBAC Denied: Active role cannot extract data.');
      return;
    }
    try {
      const res = parseStructuredText(text, label, text.length);
      applyParseResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to parse pasted data.';
      setErrorMsg(msg);
      notify('error', msg);
    }
  };

  const handleMappingChange = (field: MappingField, headerName: string) => {
    if (!mapping || !parseResult) return;
    const nextMap = { ...mapping, [field]: headerName };
    setMapping(nextMap);
    setEditableRows(buildExtractedRows(parseResult.rows, nextMap));
  };

  const includedRows = useMemo(() => editableRows.filter((r) => r.include), [editableRows]);
  const extractedGrandTotal = useMemo(
    () => includedRows.reduce((s, r) => s + r.quantity * r.unitCost, 0),
    [includedRows]
  );

  const handleInjectPpmp = () => {
    if (includedRows.length === 0) return;
    const doc = createPpmp({
      departmentId: targetDept,
      title: targetTitle,
      fundCluster: '01 - Regular Agency Fund',
      remarks: `Imported from ${parseResult?.fileName || 'uploaded file'}`,
      items: includedRows.map((r) => ({
        id: uid('pi'),
        stockCode: r.stockCode,
        description: r.description,
        category: r.category,
        isCse: r.isCse,
        unit: r.unit,
        unitCost: r.unitCost,
        q1Qty: r.q1Qty,
        q2Qty: r.q2Qty,
        q3Qty: r.q3Qty,
        q4Qty: r.q4Qty,
        mode: r.mode,
      })),
      submitImmediately: false,
    });
    if (doc) setActivePage('ppmp');
  };

  const handleInjectInventory = () => {
    if (includedRows.length === 0) return;
    const count = importExtractedToInventory(includedRows);
    if (count > 0) setActivePage('inventory');
  };

  const handleInjectSr = () => {
    if (includedRows.length === 0) return;
    const sr = createSr({
      departmentId: targetDept,
      purpose: `${targetTitle} (Extracted from ${parseResult?.fileName || 'file'})`,
      items: includedRows.map((r) => ({
        id: uid('sri'),
        stockCode: r.stockCode,
        description: r.description,
        unit: r.unit,
        requestedQty: r.quantity,
        issuedQty: 0,
        unitCost: r.unitCost,
      })),
    });
    if (sr) setActivePage('sr');
  };

  const handleInjectPr = () => {
    if (includedRows.length === 0) return;
    const pr = createPr({
      departmentId: targetDept,
      purpose: `${targetTitle} (Extracted from ${parseResult?.fileName || 'file'})`,
      fundCluster: '01 - Regular Agency Fund',
      sourceRef: parseResult?.fileName,
      items: includedRows.map((r) => ({
        id: uid('pri'),
        stockCode: r.stockCode,
        description: r.description,
        category: r.category,
        unit: r.unit,
        quantity: r.quantity,
        unitCost: r.unitCost,
      })),
    });
    if (pr) setActivePage('pr');
  };

  const handleInjectPo = () => {
    if (includedRows.length === 0) return;
    const po = createPoDirect({
      departmentId: targetDept,
      prNo: `EXT-${todayIso()}`,
      supplierId: state.suppliers[0]?.id || '',
      modeOfProcurement: includedRows[0]?.mode || 'Shopping (Sec. 52.1)',
      deliveryTerm: '15 Calendar Days upon receipt',
      paymentTerm: '30 Days Net upon Inspection',
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: currentFiscalConfig.defaultWithholdingRate,
      taxInclusive: true,
      items: includedRows.map((r) => ({
        stockCode: r.stockCode,
        description: r.description,
        unit: r.unit,
        quantity: r.quantity,
        unitCost: r.unitCost,
      })),
    });
    if (po) setActivePage('po');
  };

  const handlePrintExtractedForm = (formType: PrintableFormType) => {
    if (includedRows.length === 0) return;
    const dept = state.departments.find((d) => d.id === targetDept);
    openPrintModal({
      formType,
      entityName: state.entityName,
      fundCluster: '01 - Regular Agency Fund',
      fiscalYear: state.activeFiscalYear,
      docNo: `${formType}-EXT-${todayIso()}`,
      date: todayIso(),
      departmentName: dept?.name || targetDept,
      costCenter: dept?.costCenter || 'CC-1000',
      purposeOrTitle: targetTitle,
      supplierName: state.suppliers[0]?.name || 'Authorized Supplier',
      supplierAddress: state.suppliers[0]?.address || '',
      supplierTin: state.suppliers[0]?.tin || '',
      deliveryTerm: '15 Calendar Days',
      paymentTerm: '30 Days Net',
      modeOfProcurement: includedRows[0]?.mode || 'PS-DBM / Agency-to-Agency',
      preparedBy: activeRoleDef.personaName,
      certifiedBy: 'Morgan Reyes (Budget Officer)',
      approvedBy: 'Riley Cruz (HOPE)',
      receivedBy: 'Jordan Navarro (Supply Custodian)',
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: currentFiscalConfig.defaultWithholdingRate,
      items: includedRows.map((r) => ({
        stockCode: r.stockCode,
        description: r.description,
        unit: r.unit,
        q1Qty: r.q1Qty,
        q2Qty: r.q2Qty,
        q3Qty: r.q3Qty,
        q4Qty: r.q4Qty,
        quantity: r.quantity,
        unitCost: r.unitCost,
        mode: r.mode,
        isCse: r.isCse,
      })),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Import & Extract File</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            3 simple steps: Upload your Excel, CSV, or PDF table → Check the extracted items → Send to a procurement document or print.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadSampleTemplate('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Template (.xlsx)
          </button>
          <button
            onClick={() => downloadSampleTemplate('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Template (.csv)
          </button>
          {parseResult && (
            <button
              onClick={() => {
                setParseResult(null);
                setMapping(null);
                setEditableRows([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Upload Another File
            </button>
          )}
        </div>
      </div>

      {/* 3-Step Visual Indicator */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          { num: '1', label: 'Choose or Drop File', active: !parseResult, done: Boolean(parseResult) },
          { num: '2', label: 'Review Extracted Items', active: Boolean(parseResult), done: false },
          { num: '3', label: 'Create Doc or Print', active: Boolean(parseResult), done: false },
        ].map((step) => (
          <div
            key={step.num}
            className={`rounded-xl border px-3.5 py-2.5 flex items-center gap-2.5 ${
              step.done
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : step.active
                ? 'bg-blue-50/70 border-blue-200 text-blue-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold inline-flex items-center justify-center shrink-0 ${
                step.done
                  ? 'bg-emerald-600 text-white'
                  : step.active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step.done ? '✓' : step.num}
            </span>
            <span className="truncate">{step.label}</span>
          </div>
        ))}
      </div>

      <RbacNoticeBanner
        module="upload"
        action="upload"
        actionLabel="Upload & Extract Procurement Files"
      />

      {/* Step 1: Upload / Paste (Shown cleanly before extraction) */}
      {!parseResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                onClick={() => setInputMode('file')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  inputMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" /> Upload File
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  inputMode === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> Paste Table / CSV
              </button>
            </div>

            <button
              onClick={() => handleParseText(SAMPLE_EXTRACTION_CSV, 'Sample_APP_CSE_Upload.csv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" /> Try With Sample Data
            </button>
          </div>

          {inputMode === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.join(',')}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                  e.target.value = '';
                }}
              />
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {loading
                  ? 'Reading file & extracting items...'
                  : 'Drop your spreadsheet or PDF here, or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Allowed: {ALLOWED_EXTENSIONS.join(', ')} (Max 10 MB) — stays 100% in your browser.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste CSV, Tab-delimited spreadsheet rows, or JSON array..."
                className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => handleParseText(pasteText, 'Pasted_Procurement_Table.txt')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Extract Pasted Data
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Steps 2 & 3: Review & Act (Shown cleanly once file is extracted) */}
      {parseResult && mapping && (
        <div className="space-y-5">
          {/* Calm File Summary + Collapsible Mapper */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Loaded: {parseResult.fileName} ({includedRows.length} items selected)
                  </h2>
                  <p className="text-xs text-slate-500">
                    {parseResult.fileType} · {(parseResult.fileSizeBytes / 1024).toFixed(1)} KB · Total Value:{' '}
                    <strong className="text-blue-700">
                      {formatCurrency(extractedGrandTotal, state.currency)}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMapper((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Column Mapping (Advanced)
                {showMapper ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {showMapper && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                {MAPPING_FIELDS.map((mf) => (
                  <div key={mf.key}>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {mf.label}
                    </label>
                    <select
                      value={mapping[mf.key]}
                      onChange={(e) => handleMappingChange(mf.key, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-slate-50"
                    >
                      <option value="">-- Unmapped --</option>
                      {parseResult.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Clean Editable Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800">Step 2 · Review & Edit Extracted Rows</span>
              <span className="text-slate-500">Uncheck rows you want to skip</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-10">Use</th>
                    <th className="px-3 py-2.5 w-28">Code</th>
                    <th className="px-3 py-2.5">Description</th>
                    <th className="px-2 py-2.5 w-20">Unit</th>
                    <th className="px-2 py-2.5 text-right w-16">Q1</th>
                    <th className="px-2 py-2.5 text-right w-16">Q2</th>
                    <th className="px-2 py-2.5 text-right w-16">Q3</th>
                    <th className="px-2 py-2.5 text-right w-16">Q4</th>
                    <th className="px-2 py-2.5 text-right w-20">Qty</th>
                    <th className="px-3 py-2.5 text-right w-28">Unit Cost</th>
                    <th className="px-4 py-2.5 text-right w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {editableRows.map((row, idx) => (
                    <tr key={row.id} className={!row.include ? 'opacity-45 bg-slate-50' : ''}>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) =>
                            setEditableRows((p) =>
                              p.map((r, i) => (i === idx ? { ...r, include: e.target.checked } : r))
                            )
                          }
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.stockCode}
                          onChange={(e) =>
                            setEditableRows((p) =>
                              p.map((r, i) => (i === idx ? { ...r, stockCode: e.target.value } : r))
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-[11px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            setEditableRows((p) =>
                              p.map((r, i) =>
                                i === idx ? { ...r, description: e.target.value } : r
                              )
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) =>
                            setEditableRows((p) =>
                              p.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r))
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-center"
                        />
                      </td>
                      {(['q1Qty', 'q2Qty', 'q3Qty', 'q4Qty'] as const).map((qk) => (
                        <td key={qk} className="p-1">
                          <input
                            type="number"
                            min={0}
                            value={row[qk]}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setEditableRows((p) =>
                                p.map((r, i) => {
                                  if (i !== idx) return r;
                                  const next = { ...r, [qk]: val };
                                  next.quantity =
                                    next.q1Qty + next.q2Qty + next.q3Qty + next.q4Qty;
                                  return next;
                                })
                              );
                            }}
                            className="w-full rounded-lg border border-slate-200 px-1.5 py-1 text-right"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right font-bold">
                        {formatNumber(row.quantity)}
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          min={0}
                          value={row.unitCost}
                          onChange={(e) =>
                            setEditableRows((p) =>
                              p.map((r, i) =>
                                i === idx
                                  ? { ...r, unitCost: Math.max(0, Number(e.target.value) || 0) }
                                  : r
                              )
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">
                        {formatCurrency(row.quantity * row.unitCost, state.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 3: Choose What To Do With Extracted Items */}
          <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Step 3 · Where Should These {includedRows.length} Items Go?
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Department
                </label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
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
                  Plan Title / Purpose
                </label>
                <input
                  type="text"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleInjectPpmp}
                disabled={!can('ppmp', 'create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Create PPMP
              </button>
              <button
                onClick={handleInjectInventory}
                disabled={!can('inventory', 'upload')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold"
              >
                <PackagePlus className="w-3.5 h-3.5" /> Add to Inventory
              </button>
              <button
                onClick={handleInjectSr}
                disabled={!can('sr', 'create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold"
              >
                Create Stock Request
              </button>
              <button
                onClick={handleInjectPr}
                disabled={!can('pr', 'create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold"
              >
                Create Purchase Request
              </button>
              <button
                onClick={handleInjectPo}
                disabled={!can('po', 'create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Create PO
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-medium mr-1">Or Print Form:</span>
                {(['PPMP', 'SR', 'PR', 'PO'] as PrintableFormType[]).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => handlePrintExtractedForm(ft)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
                  >
                    <Printer className="w-3 h-3" /> {ft}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
