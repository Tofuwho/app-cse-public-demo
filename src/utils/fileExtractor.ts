import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ExtractedRow, ItemCategory, ProcurementMode } from '../types/procurement';
import { uid } from './formatters';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.tsv', '.json', '.txt', '.pdf'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type MappingField =
  | 'stockCode'
  | 'description'
  | 'category'
  | 'unit'
  | 'quantity'
  | 'q1Qty'
  | 'q2Qty'
  | 'q3Qty'
  | 'q4Qty'
  | 'unitCost'
  | 'mode';

export type ColumnMapping = Record<MappingField, string>;

export interface RawTableParseResult {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  headers: string[];
  rows: Array<Record<string, string | number>>;
  suggestedMapping: ColumnMapping;
  rawPreviewText?: string;
  notes: string[];
}

export function validateAllowedFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  const ext = dotIdx >= 0 ? lower.slice(dotIdx) : '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File type "${ext || 'unknown'}" is not allowed. Accepted formats: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds the 10 MB sandbox extraction limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
  }
  if (file.size === 0) {
    return 'The uploaded file is empty (0 bytes).';
  }
  return null;
}

function parseNumeric(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val == null) return 0;
  const cleaned = String(val).replace(/[₱$€,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeCategory(raw: string, code: string, desc: string): { category: ItemCategory; isCse: boolean } {
  const combined = `${raw} ${code} ${desc}`.toLowerCase();
  if (combined.includes('non-cse') || combined.includes('ncse') || combined.includes('chair') || combined.includes('desk')) {
    if (combined.includes('laptop') || combined.includes('monitor') || combined.includes('server') || combined.includes('computer')) {
      return { category: 'Non-CSE - IT Equipment', isCse: false };
    }
    if (combined.includes('service') || combined.includes('maintenance')) {
      return { category: 'Non-CSE - Services & Maintenance', isCse: false };
    }
    return { category: 'Non-CSE - Furniture & Fixtures', isCse: false };
  }
  if (combined.includes('laptop') || combined.includes('monitor') || combined.includes('desktop')) {
    return { category: 'Non-CSE - IT Equipment', isCse: false };
  }
  if (combined.includes('toner') || combined.includes('ink') || combined.includes('cartridge')) {
    return { category: 'CSE - Ink & Toner', isCse: true };
  }
  if (combined.includes('alcohol') || combined.includes('disinfectant') || combined.includes('soap') || combined.includes('clean')) {
    return { category: 'CSE - Cleaning & Janitorial', isCse: true };
  }
  if (combined.includes('usb') || combined.includes('flash') || combined.includes('surge') || combined.includes('cable') || combined.includes('mouse')) {
    return { category: 'CSE - IT Accessories', isCse: true };
  }
  return { category: 'CSE - Paper & Office Supplies', isCse: true };
}

function normalizeMode(raw: string, isCse: boolean): ProcurementMode {
  const low = raw.toLowerCase();
  if (low.includes('bidding')) return 'Competitive Public Bidding';
  if (low.includes('small value') || low.includes('53.9')) return 'Small Value Procurement (Sec. 53.9)';
  if (low.includes('shopping') || low.includes('52.1')) return 'Shopping (Sec. 52.1)';
  if (low.includes('direct')) return 'Direct Contracting';
  if (low.includes('ps-dbm') || low.includes('agency')) return 'PS-DBM / Agency-to-Agency';
  return isCse ? 'PS-DBM / Agency-to-Agency' : 'Small Value Procurement (Sec. 53.9)';
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const findHeader = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = headers.find((h) => pattern.test(h.trim().toLowerCase()));
      if (match) return match;
    }
    return '';
  };

  return {
    stockCode: findHeader([/stock\s*(no|code|#)?/, /item\s*code/, /^sku$/, /^code$/, /^id$/]),
    description: findHeader([/desc/, /item\s*name/, /particulars/, /specification/, /^item$/, /^name$/, /supply/]),
    category: findHeader([/category/, /class/, /group/, /^type$/]),
    unit: findHeader([/^uom$/, /^unit$/, /unit\s*of\s*measure/, /measure/]),
    quantity: findHeader([/^qty$/, /^quantity$/, /total\s*qty/, /req.*qty/]),
    q1Qty: findHeader([/^q1(\s*qty)?$/, /quarter\s*1/, /1st\s*q/]),
    q2Qty: findHeader([/^q2(\s*qty)?$/, /quarter\s*2/, /2nd\s*q/]),
    q3Qty: findHeader([/^q3(\s*qty)?$/, /quarter\s*3/, /3rd\s*q/]),
    q4Qty: findHeader([/^q4(\s*qty)?$/, /quarter\s*4/, /4th\s*q/]),
    unitCost: findHeader([/unit\s*(cost|price)/, /^price$/, /^cost$/, /rate/]),
    mode: findHeader([/mode/, /procurement\s*method/, /method/]),
  };
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  if (delimiter !== ',') {
    return line.split(delimiter).map((s) => s.trim().replace(/^"|"$/g, ''));
  }
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseStructuredText(
  text: string,
  fileName = 'pasted-data.txt',
  fileSizeBytes = text.length
): RawTableParseResult {
  const notes: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('No readable text content found.');
  }

  // Try JSON first if it looks like JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [parsed];
      if (arr.length > 0 && typeof arr[0] === 'object') {
        const headerSet = new Set<string>();
        for (const item of arr) {
          Object.keys(item || {}).forEach((k) => headerSet.add(k));
        }
        const headers = Array.from(headerSet);
        const rows = arr.map((item: Record<string, unknown>) => {
          const rec: Record<string, string | number> = {};
          for (const h of headers) {
            const v = item[h];
            rec[h] = typeof v === 'number' || typeof v === 'string' ? v : String(v ?? '');
          }
          return rec;
        });
        notes.push(`Parsed ${rows.length} structured JSON records.`);
        return {
          fileName,
          fileType: 'JSON',
          fileSizeBytes,
          headers,
          rows,
          suggestedMapping: detectColumnMapping(headers),
          rawPreviewText: trimmed.slice(0, 1500),
          notes,
        };
      }
    } catch {
      // Fall through to line-based parsing
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('Expected at least a header row and one data row.');
  }

  // Detect delimiter from first 3 lines
  const sample = lines.slice(0, 3).join('\n');
  let delimiter = ',';
  if (sample.includes('\t')) delimiter = '\t';
  else if (sample.includes('|')) delimiter = '|';
  else if (sample.includes(';')) delimiter = ';';
  else if (!sample.includes(',') && /\s{2,}/.test(lines[0])) {
    // Space-aligned text table
    const matrix = lines.map((line) => line.split(/\s{2,}/).map((c) => c.trim()));
    const headers = matrix[0].map((h, i) => h || `Column_${i + 1}`);
    const rows = matrix.slice(1).map((cols) => {
      const rec: Record<string, string | number> = {};
      headers.forEach((h, i) => {
        rec[h] = cols[i] ?? '';
      });
      return rec;
    });
    notes.push(`Detected whitespace-aligned table (${rows.length} rows).`);
    return {
      fileName,
      fileType: 'TEXT_TABLE',
      fileSizeBytes,
      headers,
      rows,
      suggestedMapping: detectColumnMapping(headers),
      rawPreviewText: trimmed.slice(0, 1500),
      notes,
    };
  }

  const rawHeaders = splitDelimitedLine(lines[0], delimiter);
  const headers = rawHeaders.map((h, i) => h || `Column_${i + 1}`);
  const rows: Array<Record<string, string | number>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitDelimitedLine(lines[i], delimiter);
    if (cols.every((c) => !c)) continue;
    const rec: Record<string, string | number> = {};
    headers.forEach((h, idx) => {
      rec[h] = cols[idx] ?? '';
    });
    rows.push(rec);
  }

  notes.push(`Extracted ${rows.length} rows using "${delimiter === '\t' ? 'TAB' : delimiter}" delimiter.`);
  return {
    fileName,
    fileType: delimiter === '\t' ? 'TSV' : 'CSV/TEXT',
    fileSizeBytes,
    headers,
    rows,
    suggestedMapping: detectColumnMapping(headers),
    rawPreviewText: trimmed.slice(0, 1500),
    notes,
  };
}

async function parsePdfFile(file: File): Promise<RawTableParseResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const extractedLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rowMap = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 4) * 4;
      const x = item.transform[4];
      const bucket = rowMap.get(y) || [];
      bucket.push({ x, text: item.str.trim() });
      rowMap.set(y, bucket);
    }

    const sortedYs = Array.from(rowMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const cells = (rowMap.get(y) || []).sort((a, b) => a.x - b.x);
      // Group cells separated by noticeable horizontal gap with tab or multi-space
      let line = '';
      let prevEnd = -1;
      for (const c of cells) {
        if (prevEnd >= 0) {
          const gap = c.x - prevEnd;
          line += gap > 22 ? '\t' : ' ';
        }
        line += c.text;
        prevEnd = c.x + c.text.length * 4.5;
      }
      if (line.trim()) extractedLines.push(line.trim());
    }
  }

  const rawText = extractedLines.join('\n');
  if (!rawText.trim()) {
    throw new Error('PDF contains no selectable text (scanned image PDFs cannot be OCR-parsed client-side).');
  }

  // Locate the most likely header line (contains keywords like description/item/unit/qty/cost)
  let headerIdx = extractedLines.findIndex((line) =>
    /(desc|item|particulars)/i.test(line) && /(qty|quantity|unit|cost|price|q1)/i.test(line)
  );
  if (headerIdx < 0) headerIdx = 0;

  const tableLines = extractedLines.slice(headerIdx).filter((l) => l.includes('\t') || /\s{2,}/.test(l));
  if (tableLines.length >= 2) {
    const res = parseStructuredText(tableLines.join('\n'), file.name, file.size);
    res.fileType = `PDF (${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''})`;
    res.rawPreviewText = rawText.slice(0, 2000);
    res.notes.unshift(`Extracted text coordinates from ${pdf.numPages} PDF page(s).`);
    return res;
  }

  // Fallback: single-column line extraction so user still gets extracted items to review
  const fallbackRows = extractedLines.map((line, i) => ({
    'Stock Code': `PDF-${String(i + 1).padStart(3, '0')}`,
    Description: line,
    Unit: 'pc',
    Qty: 1,
    'Unit Cost': 0,
  }));

  const headers = ['Stock Code', 'Description', 'Unit', 'Qty', 'Unit Cost'];
  return {
    fileName: file.name,
    fileType: `PDF (${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''})`,
    fileSizeBytes: file.size,
    headers,
    rows: fallbackRows,
    suggestedMapping: detectColumnMapping(headers),
    rawPreviewText: rawText.slice(0, 2000),
    notes: [
      `Extracted ${extractedLines.length} lines from ${pdf.numPages} PDF page(s). Adjust quantities/costs in the preview table before importing.`,
    ],
  };
}

export async function parseUploadedFile(file: File): Promise<RawTableParseResult> {
  const err = validateAllowedFile(file);
  if (err) throw new Error(err);

  const lower = file.name.toLowerCase();

  if (lower.endsWith('.pdf')) {
    return parsePdfFile(file);
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('Excel workbook contains no worksheets.');
    const sheet = workbook.Sheets[firstSheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (jsonRows.length === 0) {
      throw new Error(`Worksheet "${firstSheetName}" is empty.`);
    }

    const headers = Object.keys(jsonRows[0]);
    const rows = jsonRows.map((r) => {
      const rec: Record<string, string | number> = {};
      for (const h of headers) {
        const val = r[h];
        rec[h] = typeof val === 'number' || typeof val === 'string' ? val : String(val ?? '');
      }
      return rec;
    });

    return {
      fileName: file.name,
      fileType: `Excel (${firstSheetName})`,
      fileSizeBytes: file.size,
      headers,
      rows,
      suggestedMapping: detectColumnMapping(headers),
      notes: [`Loaded ${rows.length} rows from Excel sheet "${firstSheetName}".`],
    };
  }

  // CSV, TSV, JSON, TXT
  const text = await file.text();
  return parseStructuredText(text, file.name, file.size);
}

export function buildExtractedRows(
  rawRows: Array<Record<string, string | number>>,
  mapping: ColumnMapping
): ExtractedRow[] {
  return rawRows
    .map((row, idx) => {
      const stockCode = mapping.stockCode ? String(row[mapping.stockCode] ?? '').trim() : '';
      const description = mapping.description ? String(row[mapping.description] ?? '').trim() : '';
      const rawCategory = mapping.category ? String(row[mapping.category] ?? '').trim() : '';
      const unit = (mapping.unit ? String(row[mapping.unit] ?? '').trim() : '') || 'pc';
      const unitCost = mapping.unitCost ? parseNumeric(row[mapping.unitCost]) : 0;

      let q1Qty = mapping.q1Qty ? Math.max(0, Math.round(parseNumeric(row[mapping.q1Qty]))) : 0;
      let q2Qty = mapping.q2Qty ? Math.max(0, Math.round(parseNumeric(row[mapping.q2Qty]))) : 0;
      let q3Qty = mapping.q3Qty ? Math.max(0, Math.round(parseNumeric(row[mapping.q3Qty]))) : 0;
      let q4Qty = mapping.q4Qty ? Math.max(0, Math.round(parseNumeric(row[mapping.q4Qty]))) : 0;

      const qSum = q1Qty + q2Qty + q3Qty + q4Qty;
      const directQty = mapping.quantity ? Math.max(0, Math.round(parseNumeric(row[mapping.quantity]))) : 0;
      const quantity = qSum > 0 ? qSum : directQty > 0 ? directQty : 1;

      if (qSum === 0) {
        q1Qty = quantity;
      }

      const finalCode = stockCode || `EXT-${String(idx + 1).padStart(3, '0')}`;
      const finalDesc = description || finalCode;
      const { category, isCse } = normalizeCategory(rawCategory, finalCode, finalDesc);
      const rawMode = mapping.mode ? String(row[mapping.mode] ?? '').trim() : '';
      const mode = normalizeMode(rawMode, isCse);

      const warnings: string[] = [];
      if (!description) warnings.push('Missing description');
      if (unitCost <= 0) warnings.push('Unit cost is 0');
      if (quantity <= 0) warnings.push('Quantity is 0');

      return {
        id: uid('ext'),
        include: Boolean(finalDesc),
        stockCode: finalCode,
        description: finalDesc,
        category,
        isCse,
        unit,
        quantity,
        q1Qty,
        q2Qty,
        q3Qty,
        q4Qty,
        unitCost,
        mode,
        warnings,
      };
    })
    .filter((item) => item.description.length > 0);
}

export const SAMPLE_EXTRACTION_ROWS = [
  {
    'Stock Code': 'CSE-PPR-001',
    Description: 'Bond Paper A4 (80gsm, 500 sheets)',
    Category: 'CSE - Paper & Office Supplies',
    Unit: 'ream',
    Q1: 50,
    Q2: 50,
    Q3: 50,
    Q4: 50,
    'Unit Cost': 235,
    'Procurement Mode': 'PS-DBM / Agency-to-Agency',
  },
  {
    'Stock Code': 'CSE-INK-012',
    Description: 'Laser Toner Cartridge Black (High-Yield)',
    Category: 'CSE - Ink & Toner',
    Unit: 'cartridge',
    Q1: 4,
    Q2: 4,
    Q3: 4,
    Q4: 4,
    'Unit Cost': 4250,
    'Procurement Mode': 'PS-DBM / Agency-to-Agency',
  },
  {
    'Stock Code': 'CSE-CLN-035',
    Description: 'Isopropyl Alcohol 70% (1 Gallon)',
    Category: 'CSE - Cleaning & Janitorial',
    Unit: 'gallon',
    Q1: 12,
    Q2: 12,
    Q3: 12,
    Q4: 12,
    'Unit Cost': 520,
    'Procurement Mode': 'PS-DBM / Agency-to-Agency',
  },
  {
    'Stock Code': 'NCSE-IT-110',
    Description: '27-Inch 4K Productivity Monitor (USB-C)',
    Category: 'Non-CSE - IT Equipment',
    Unit: 'unit',
    Q1: 3,
    Q2: 0,
    Q3: 3,
    Q4: 0,
    'Unit Cost': 18500,
    'Procurement Mode': 'Small Value Procurement (Sec. 53.9)',
  },
];

export const SAMPLE_EXTRACTION_CSV = [
  'Stock Code,Description,Category,Unit,Q1,Q2,Q3,Q4,Unit Cost,Procurement Mode',
  'CSE-PPR-001,"Bond Paper A4 (80gsm, 500 sheets)",CSE - Paper & Office Supplies,ream,50,50,50,50,235,PS-DBM / Agency-to-Agency',
  'CSE-INK-012,"Laser Toner Cartridge Black (High-Yield)",CSE - Ink & Toner,cartridge,4,4,4,4,4250,PS-DBM / Agency-to-Agency',
  'CSE-CLN-035,"Isopropyl Alcohol 70% (1 Gallon)",CSE - Cleaning & Janitorial,gallon,12,12,12,12,520,PS-DBM / Agency-to-Agency',
  'NCSE-IT-110,"27-Inch 4K Productivity Monitor (USB-C)",Non-CSE - IT Equipment,unit,3,0,3,0,18500,Small Value Procurement (Sec. 53.9)',
].join('\n');

export function downloadSampleTemplate(format: 'xlsx' | 'csv'): void {
  if (format === 'csv') {
    const blob = new Blob([SAMPLE_EXTRACTION_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OpenProcure_APP_CSE_Sample_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(SAMPLE_EXTRACTION_ROWS);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PPMP_APP_CSE_Items');
  XLSX.writeFile(wb, 'OpenProcure_APP_CSE_Sample_Template.xlsx');
}

export function exportRowsToExcel(fileName: string, sheetName: string, rows: Array<Record<string, unknown>>): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
}
