export type RoleId =
  | 'SUPER_ADMIN'
  | 'BUDGET_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | 'SUPPLY_CUSTODIAN'
  | 'DEPT_USER'
  | 'HOPE_APPROVER';

export type ModuleKey =
  | 'dashboard'
  | 'fiscal'
  | 'ppmp'
  | 'app_cse'
  | 'inventory'
  | 'sr'
  | 'pr'
  | 'po'
  | 'upload'
  | 'print'
  | 'rbac';

export type ActionKey =
  | 'view'
  | 'create'
  | 'edit'
  | 'approve'
  | 'certify_budget'
  | 'issue'
  | 'receive'
  | 'allocate'
  | 'upload'
  | 'print'
  | 'admin';

export type PermissionMatrix = Record<RoleId, Record<ModuleKey, ActionKey[]>>;

export interface RoleDefinition {
  id: RoleId;
  name: string;
  shortLabel: string;
  personaName: string;
  personaTitle: string;
  defaultDepartmentId: string;
  badgeColor: string;
  description: string;
}

export type CurrencyCode = 'PHP' | 'USD' | 'EUR';

export interface Department {
  id: string;
  code: string;
  name: string;
  costCenter: string;
  headTitle: string;
}

export interface DepartmentAllocation {
  departmentId: string;
  fiscalYear: number;
  mooeCeiling: number;
  capitalOutlayCeiling: number;
}

export interface FiscalYearConfig {
  year: number;
  label: string;
  status: 'Active' | 'Planning' | 'Closed';
  agencyMooeCeiling: number;
  agencyCoCeiling: number;
  contingencyPercent: number;
  defaultTaxRate: number;
  defaultWithholdingRate: number;
}

export type ItemCategory =
  | 'CSE - Paper & Office Supplies'
  | 'CSE - Ink & Toner'
  | 'CSE - Cleaning & Janitorial'
  | 'CSE - IT Accessories'
  | 'Non-CSE - Furniture & Fixtures'
  | 'Non-CSE - IT Equipment'
  | 'Non-CSE - Services & Maintenance';

export type ProcurementMode =
  | 'PS-DBM / Agency-to-Agency'
  | 'Shopping (Sec. 52.1)'
  | 'Small Value Procurement (Sec. 53.9)'
  | 'Competitive Public Bidding'
  | 'Direct Contracting';

export interface InventoryItem {
  id: string;
  stockCode: string;
  name: string;
  description: string;
  category: ItemCategory;
  isCse: boolean;
  unit: string;
  unitCost: number;
  stockOnHand: number;
  reservedQty: number;
  reorderLevel: number;
  warehouseBin: string;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  date: string;
  stockCode: string;
  itemName: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
  quantity: number;
  balanceAfter: number;
  referenceNo: string;
  departmentId: string;
  performedBy: string;
  notes: string;
}

export interface PPMPItem {
  id: string;
  stockCode: string;
  description: string;
  category: ItemCategory;
  isCse: boolean;
  unit: string;
  unitCost: number;
  q1Qty: number;
  q2Qty: number;
  q3Qty: number;
  q4Qty: number;
  mode: ProcurementMode;
}

export type PPMPStatus = 'Draft' | 'Submitted' | 'Budget Verified' | 'Approved' | 'Returned';

export interface PPMPDocument {
  id: string;
  ppmpNo: string;
  fiscalYear: number;
  departmentId: string;
  title: string;
  fundCluster: string;
  preparedBy: string;
  verifiedBy?: string;
  approvedBy?: string;
  status: PPMPStatus;
  createdAt: string;
  updatedAt: string;
  remarks: string;
  items: PPMPItem[];
}

export interface SRLineItem {
  id: string;
  stockCode: string;
  description: string;
  unit: string;
  requestedQty: number;
  issuedQty: number;
  unitCost: number;
}

export type SRStatus = 'Draft' | 'Submitted' | 'Approved & Issued' | 'Needs Purchase (PR)' | 'Cancelled';

export interface StockRequisition {
  id: string;
  srNo: string;
  fiscalYear: number;
  departmentId: string;
  dateRequested: string;
  purpose: string;
  requestedBy: string;
  issuedBy?: string;
  status: SRStatus;
  linkedPrNo?: string;
  items: SRLineItem[];
}

export interface PRLineItem {
  id: string;
  stockCode: string;
  description: string;
  category: ItemCategory;
  unit: string;
  quantity: number;
  unitCost: number;
}

export type PRStatus =
  | 'Draft'
  | 'Submitted'
  | 'Funds Certified'
  | 'Approved'
  | 'Converted to PO'
  | 'Returned';

export interface PurchaseRequest {
  id: string;
  prNo: string;
  fiscalYear: number;
  departmentId: string;
  fundCluster: string;
  responsibilityCenter: string;
  dateRequested: string;
  purpose: string;
  requestedBy: string;
  budgetCertifiedBy?: string;
  approvedBy?: string;
  sourceRef?: string;
  status: PRStatus;
  linkedPoNo?: string;
  items: PRLineItem[];
}

export interface Supplier {
  id: string;
  name: string;
  tin: string;
  address: string;
  contactPerson: string;
  email: string;
  category: string;
}

export interface POLineItem {
  id: string;
  stockCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

export type POStatus = 'Draft' | 'Approved & Issued' | 'Delivered / Received' | 'Cancelled';

export interface PurchaseOrder {
  id: string;
  poNo: string;
  prNo: string;
  fiscalYear: number;
  departmentId: string;
  supplierId: string;
  supplierName: string;
  supplierAddress: string;
  supplierTin: string;
  modeOfProcurement: ProcurementMode;
  placeOfDelivery: string;
  deliveryTerm: string;
  paymentTerm: string;
  dateIssued: string;
  taxRate: number;
  withholdingRate: number;
  taxInclusive: boolean;
  preparedBy: string;
  approvedBy?: string;
  receivedBy?: string;
  receivedDate?: string;
  status: POStatus;
  items: POLineItem[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  roleId: RoleId;
  actor: string;
  module: ModuleKey;
  action: string;
  documentNo?: string;
  details: string;
}

export interface ExtractedRow {
  id: string;
  include: boolean;
  stockCode: string;
  description: string;
  category: ItemCategory;
  isCse: boolean;
  unit: string;
  quantity: number;
  q1Qty: number;
  q2Qty: number;
  q3Qty: number;
  q4Qty: number;
  unitCost: number;
  mode: ProcurementMode;
  warnings: string[];
}

export type PrintableFormType = 'PPMP' | 'APP_CSE' | 'SR' | 'PR' | 'PO';

export interface CustomPrintFormDraft {
  formType: PrintableFormType;
  entityName: string;
  fundCluster: string;
  fiscalYear: number;
  docNo: string;
  date: string;
  departmentName: string;
  costCenter: string;
  purposeOrTitle: string;
  supplierName: string;
  supplierAddress: string;
  supplierTin: string;
  deliveryTerm: string;
  paymentTerm: string;
  modeOfProcurement: string;
  preparedBy: string;
  certifiedBy: string;
  approvedBy: string;
  receivedBy: string;
  taxRate: number;
  withholdingRate: number;
  items: Array<{
    stockCode: string;
    description: string;
    unit: string;
    q1Qty?: number;
    q2Qty?: number;
    q3Qty?: number;
    q4Qty?: number;
    quantity: number;
    unitCost: number;
    mode?: string;
    isCse?: boolean;
  }>;
}
