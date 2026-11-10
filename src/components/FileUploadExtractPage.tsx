import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  FileUp,
  PackagePlus,
  Printer,
  ShoppingBag,
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
  { key: 'stockCode', label: 'Stock Code / SKU' },
  { key: 'description', label: 'Item Description' },
  { key: 'unit', label: 'Unit (UOM)' },
  { key: 'unitCost', label: 'Unit Cost / Price' },
  { key: 'quantity', label: 'Total Quantity' },
  { key: 'q1Qty', label: 'Q1 Qty' },
  { key: 'q2Qty', label: 'Q2 Qty' },
  { key: 'q3Qty', label: 'Q3 Qty' },
  { key: 'q4Qty', label: 'Q4 Qty' },
  { key: 'category', label: 'Category' },
  { key: 'mode', label: 'Procurement Mode' },
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Allowed File Upload & Client-Side Extraction Studio
          </h2>
          <p className="text-xs text-slate-500">
            Upload spreadsheets, CSV/TSV tables, JSON, structured text, or tabular PDFs locally in your browser. Extract columns, verify totals, inject into PPMP/Inventory/SR/PR/PO, or print physical forms.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadSampleTemplate('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Sample .xlsx
          </button>
          <button
            onClick={() => downloadSampleTemplate('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Sample .csv
          </button>
          <button
            onClick={() => handleParseText(SAMPLE_EXTRACTION_CSV, 'Sample_APP_CSE_Upload.csv')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Load Sample Extraction
          </button>
        </div>
      </div>

      <RbacNoticeBanner
        module="upload"
        action="upload"
        actionLabel="Upload & Extract Procurement Files"
      />

      {/* Upload / Paste Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setInputMode('file')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                inputMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" /> File Upload
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                inputMode === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste Table / CSV / JSON
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-slate-500 mr-1">Allowed Extensions:</span>
            {ALLOWED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold"
              >
                {ext}
              </span>
            ))}
            <span className="text-slate-400 ml-1">(Max 10 MB)</span>
          </div>
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
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/30'
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
                ? 'Extracting rows & detecting columns...'
                : 'Drop your APP-CSE / PPMP / Quote file here, or click to browse'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              100% client-side extraction — files never leave your browser. Disallowed formats (e.g. executables, scripts) are automatically blocked.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste CSV, Tab-delimited Excel cells, or JSON array..."
              className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs"
            />
            <div className="flex justify-end">
              <button
                onClick={() => handleParseText(pasteText, 'Pasted_Procurement_Table.txt')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
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

      {/* Extraction Result + Column Mapper + Preview */}
      {parseResult && mapping && (
        <div className="space-y-5">
          {/* File Metadata & Column Mapping */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Extracted: {parseResult.fileName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format: {parseResult.fileType} · {(parseResult.fileSizeBytes / 1024).toFixed(1)} KB ·{' '}
                    {parseResult.notes.join(' ')}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs tabular-nums">
                <span className="text-slate-500">Selected Total Value: </span>
                <strong className="text-sm text-blue-700">
                  {formatCurrency(extractedGrandTotal, state.currency)}
                </strong>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 mb-2">
                Detected Column Mapping (Adjust any field if needed)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
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
            </div>
          </div>

          {/* Editable Extracted Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800">
                Extracted Line Items ({includedRows.length} of {editableRows.length} selected)
              </span>
              <span className="text-slate-500">
                Values below are editable before pushing into a document or printing.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white border-b border-slate-200 text-[11px] text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-center w-10">Use</th>
                    <th className="px-3 py-2 w-28">Stock Code</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-2 py-2 w-20">Unit</th>
                    <th className="px-2 py-2 text-right w-16">Q1</th>
                    <th className="px-2 py-2 text-right w-16">Q2</th>
                    <th className="px-2 py-2 text-right w-16">Q3</th>
                    <th className="px-2 py-2 text-right w-16">Q4</th>
                    <th className="px-2 py-2 text-right w-20">Total Qty</th>
                    <th className="px-3 py-2 text-right w-28">Unit Cost</th>
                    <th className="px-4 py-2 text-right w-32">Subtotal</th>
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
                          className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-[11px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            setEditableRows((p) =>
                              p.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r))
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1"
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
                          className="w-full rounded border border-slate-200 px-2 py-1 text-center"
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
                            className="w-full rounded border border-slate-200 px-1.5 py-1 text-right"
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
                          className="w-full rounded border border-slate-200 px-2 py-1 text-right"
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

          {/* Target Action Bar */}
          <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Target Department / Office
                </label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
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
                <label className="block font-semibold text-slate-600 mb-1">
                  Document Purpose / Plan Title
                </label>
                <input
                  type="text"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-700 mr-1">Create Record From Extracted:</span>
              <button
                onClick={handleInjectPpmp}
                disabled={!can('ppmp', 'create')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Save as PPMP
              </button>
              <button
                onClick={handleInjectInventory}
                disabled={!can('inventory', 'upload')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold"
              >
                <PackagePlus className="w-3.5 h-3.5" /> Stock In to Inventory
              </button>
              <button
                onClick={handleInjectSr}
                disabled={!can('sr', 'create')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold"
              >
                Create SR
              </button>
              <button
                onClick={handleInjectPr}
                disabled={!can('pr', 'create')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold"
              >
                Create PR
              </button>
              <button
                onClick={handleInjectPo}
                disabled={!can('po', 'create')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Create PO
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-semibold mr-1">Or Print Immediately:</span>
                {(['PPMP', 'SR', 'PR', 'PO'] as PrintableFormType[]).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => handlePrintExtractedForm(ft)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700"
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
