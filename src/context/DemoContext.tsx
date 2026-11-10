import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActionKey,
  AuditLogEntry,
  CurrencyCode,
  CustomPrintFormDraft,
  Department,
  DepartmentAllocation,
  ExtractedRow,
  FiscalYearConfig,
  InventoryItem,
  ModuleKey,
  PPMPDocument,
  PPMPItem,
  PPMPStatus,
  PermissionMatrix,
  PRLineItem,
  PRStatus,
  ProcurementMode,
  PurchaseOrder,
  PurchaseRequest,
  RoleId,
  SRLineItem,
  StockMovement,
  StockRequisition,
  Supplier,
} from '../types/procurement';
import { DEFAULT_PERMISSION_MATRIX, ROLES, hasPermission } from '../data/rbac';
import {
  INITIAL_ALLOCATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DEPARTMENTS,
  INITIAL_FISCAL_YEARS,
  INITIAL_INVENTORY,
  INITIAL_POS,
  INITIAL_PPMPS,
  INITIAL_PRS,
  INITIAL_SRS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIERS,
} from '../data/initialData';
import { nextDocNumber, nowTimestamp, todayIso, uid } from '../utils/formatters';

const STORAGE_KEY = 'openprocure_app_cse_demo_v1';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

export interface DepartmentBudgetSummary {
  department: Department;
  mooeCeiling: number;
  capitalOutlayCeiling: number;
  totalAllocated: number;
  ppmpPlanned: number;
  obligated: number;
  utilized: number;
  remaining: number;
  utilizationPct: number;
}

interface PersistedState {
  activeRole: RoleId;
  activeDeptUserScope: string;
  activeFiscalYear: number;
  currency: CurrencyCode;
  entityName: string;
  permissionMatrix: PermissionMatrix;
  departments: Department[];
  fiscalYears: FiscalYearConfig[];
  allocations: DepartmentAllocation[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  ppmps: PPMPDocument[];
  srs: StockRequisition[];
  prs: PurchaseRequest[];
  pos: PurchaseOrder[];
  suppliers: Supplier[];
  auditLogs: AuditLogEntry[];
}

function getInitialState(): PersistedState {
  return {
    activeRole: 'SUPER_ADMIN',
    activeDeptUserScope: 'IT',
    activeFiscalYear: 2026,
    currency: 'PHP',
    entityName: 'OpenProcure Public Demo Entity',
    permissionMatrix: JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX)),
    departments: INITIAL_DEPARTMENTS,
    fiscalYears: INITIAL_FISCAL_YEARS,
    allocations: INITIAL_ALLOCATIONS,
    inventory: INITIAL_INVENTORY,
    stockMovements: INITIAL_STOCK_MOVEMENTS,
    ppmps: INITIAL_PPMPS,
    srs: INITIAL_SRS,
    prs: INITIAL_PRS,
    pos: INITIAL_POS,
    suppliers: INITIAL_SUPPLIERS,
    auditLogs: INITIAL_AUDIT_LOGS,
  };
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const defaults = getInitialState();
    return {
      ...defaults,
      ...parsed,
      permissionMatrix: parsed.permissionMatrix || defaults.permissionMatrix,
    };
  } catch {
    return getInitialState();
  }
}

export function calcPpmpTotal(items: PPMPItem[]): number {
  return items.reduce((sum, item) => {
    const qty = item.q1Qty + item.q2Qty + item.q3Qty + item.q4Qty;
    return sum + qty * item.unitCost;
  }, 0);
}

export function calcPrTotal(pr: PurchaseRequest): number {
  return pr.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
}

export function calcPoSubtotal(po: PurchaseOrder): number {
  return po.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
}

interface DemoContextValue {
  state: PersistedState;
  activePage: ModuleKey;
  setActivePage: (page: ModuleKey) => void;
  activeRoleDef: (typeof ROLES)[number];
  can: (module: ModuleKey, action: ActionKey) => boolean;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  notify: (type: ToastMessage['type'], text: string) => void;
  printModalDraft: CustomPrintFormDraft | null;
  openPrintModal: (draft: CustomPrintFormDraft) => void;
  closePrintModal: () => void;

  // Global controls
  switchRole: (role: RoleId) => void;
  setDeptUserScope: (deptId: string) => void;
  setFiscalYear: (year: number) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setEntityName: (name: string) => void;
  resetDemoData: () => void;

  // Computed budgets
  currentFiscalConfig: FiscalYearConfig;
  departmentSummaries: DepartmentBudgetSummary[];
  agencyBudgetTotals: {
    agencyCeiling: number;
    contingencyAmount: number;
    netDistributable: number;
    totalAllocated: number;
    totalPpmpPlanned: number;
    totalObligated: number;
    totalUtilized: number;
    totalRemaining: number;
  };
  quarterlyPpmpTotals: { q1: number; q2: number; q3: number; q4: number };

  // Fiscal actions
  updateFiscalConfig: (year: number, patch: Partial<FiscalYearConfig>) => void;
  updateDepartmentAllocation: (deptId: string, year: number, mooe: number, co: number) => void;
  addFiscalYear: (year: number, mooeCeiling: number, coCeiling: number) => void;

  // PPMP actions
  createPpmp: (payload: {
    departmentId: string;
    title: string;
    fundCluster: string;
    remarks: string;
    items: PPMPItem[];
    submitImmediately?: boolean;
  }) => PPMPDocument | null;
  updatePpmpStatus: (id: string, nextStatus: PPMPStatus, note?: string) => void;

  // Inventory actions
  addOrUpdateInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'> & { id?: string }) => void;
  adjustStock: (stockCode: string, delta: number, notes: string) => void;
  importExtractedToInventory: (rows: ExtractedRow[]) => number;

  // SR actions
  createSr: (payload: {
    departmentId: string;
    purpose: string;
    items: SRLineItem[];
    submitImmediately?: boolean;
  }) => StockRequisition | null;
  issueSr: (srId: string) => void;
  convertSrToPr: (srId: string) => PurchaseRequest | null;

  // PR actions
  createPr: (payload: {
    departmentId: string;
    purpose: string;
    fundCluster: string;
    sourceRef?: string;
    items: PRLineItem[];
    submitImmediately?: boolean;
  }) => PurchaseRequest | null;
  updatePrStatus: (prId: string, status: PRStatus) => void;
  convertPrToPo: (
    prId: string,
    supplierId: string,
    mode: ProcurementMode,
    deliveryTerm: string,
    paymentTerm: string
  ) => PurchaseOrder | null;

  // PO actions
  createPoDirect: (payload: {
    departmentId: string;
    prNo: string;
    supplierId: string;
    modeOfProcurement: ProcurementMode;
    deliveryTerm: string;
    paymentTerm: string;
    taxRate: number;
    withholdingRate: number;
    taxInclusive: boolean;
    items: Array<{ stockCode: string; description: string; unit: string; quantity: number; unitCost: number }>;
  }) => PurchaseOrder | null;
  issuePo: (poId: string) => void;
  receivePoDelivery: (poId: string) => void;

  // RBAC toggle
  togglePermission: (role: RoleId, module: ModuleKey, action: ActionKey) => void;
  resetPermissionsToDefault: () => void;

  // Print helper builders
  buildPpmpPrintDraft: (ppmp: PPMPDocument) => CustomPrintFormDraft;
  buildAppCsePrintDraft: () => CustomPrintFormDraft;
  buildSrPrintDraft: (sr: StockRequisition) => CustomPrintFormDraft;
  buildPrPrintDraft: (pr: PurchaseRequest) => CustomPrintFormDraft;
  buildPoPrintDraft: (po: PurchaseOrder) => CustomPrintFormDraft;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [activePage, setActivePage] = useState<ModuleKey>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [printModalDraft, setPrintModalDraft] = useState<CustomPrintFormDraft | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues in restricted browsers
    }
  }, [state]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const notify = (type: ToastMessage['type'], text: string) => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const activeRoleDef = useMemo(
    () => ROLES.find((r) => r.id === state.activeRole) || ROLES[0],
    [state.activeRole]
  );

  const can = (module: ModuleKey, action: ActionKey) =>
    hasPermission(state.permissionMatrix, state.activeRole, module, action);

  const requirePerm = (module: ModuleKey, action: ActionKey, label: string): boolean => {
    if (!can(module, action)) {
      notify(
        'error',
        `RBAC Denied: Role "${activeRoleDef.name}" does not have "${action}" permission to ${label}.`
      );
      return false;
    }
    return true;
  };

  const appendAudit = (
    prev: PersistedState,
    module: ModuleKey,
    action: string,
    details: string,
    documentNo?: string
  ): AuditLogEntry[] => {
    const role = ROLES.find((r) => r.id === prev.activeRole) || ROLES[0];
    const entry: AuditLogEntry = {
      id: uid('aud'),
      timestamp: nowTimestamp(),
      roleId: prev.activeRole,
      actor: role.personaName,
      module,
      action,
      documentNo,
      details,
    };
    return [entry, ...prev.auditLogs].slice(0, 120);
  };

  const switchRole = (role: RoleId) => {
    const roleInfo = ROLES.find((r) => r.id === role);
    setState((prev) => ({
      ...prev,
      activeRole: role,
      auditLogs: [
        {
          id: uid('aud'),
          timestamp: nowTimestamp(),
          roleId: role,
          actor: roleInfo?.personaName || role,
          module: 'rbac' as const,
          action: 'Switched Active Demo Role',
          details: `Demo session persona switched to ${roleInfo?.name || role}.`,
        },
        ...prev.auditLogs,
      ].slice(0, 120),
    }));
    notify('info', `Switched active RBAC persona to ${roleInfo?.name} (${roleInfo?.personaName}).`);
  };

  const setDeptUserScope = (deptId: string) => {
    setState((prev) => ({ ...prev, activeDeptUserScope: deptId }));
  };

  const setFiscalYear = (year: number) => {
    setState((prev) => ({ ...prev, activeFiscalYear: year }));
  };

  const setCurrency = (currency: CurrencyCode) => {
    setState((prev) => ({ ...prev, currency }));
  };

  const setEntityName = (entityName: string) => {
    setState((prev) => ({ ...prev, entityName }));
  };

  const resetDemoData = () => {
    const fresh = getInitialState();
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    notify('success', 'Demo sandbox reset to clean baseline dataset.');
  };

  const currentFiscalConfig = useMemo(() => {
    return (
      state.fiscalYears.find((f) => f.year === state.activeFiscalYear) ||
      state.fiscalYears[0]
    );
  }, [state.fiscalYears, state.activeFiscalYear]);

  const departmentSummaries: DepartmentBudgetSummary[] = useMemo(() => {
    const fy = state.activeFiscalYear;
    return state.departments.map((dept) => {
      const alloc = state.allocations.find(
        (a) => a.departmentId === dept.id && a.fiscalYear === fy
      );
      const mooeCeiling = alloc?.mooeCeiling || 0;
      const capitalOutlayCeiling = alloc?.capitalOutlayCeiling || 0;
      const totalAllocated = mooeCeiling + capitalOutlayCeiling;

      const deptPpmps = state.ppmps.filter(
        (p) => p.fiscalYear === fy && p.departmentId === dept.id && p.status !== 'Returned'
      );
      const ppmpPlanned = deptPpmps.reduce((sum, p) => sum + calcPpmpTotal(p.items), 0);

      // Obligated = Active PRs not yet converted + Issued POs not yet delivered
      const activePrTotal = state.prs
        .filter(
          (pr) =>
            pr.fiscalYear === fy &&
            pr.departmentId === dept.id &&
            ['Submitted', 'Funds Certified', 'Approved'].includes(pr.status)
        )
        .reduce((sum, pr) => sum + calcPrTotal(pr), 0);

      const issuedPoTotal = state.pos
        .filter(
          (po) =>
            po.fiscalYear === fy &&
            po.departmentId === dept.id &&
            ['Draft', 'Approved & Issued'].includes(po.status)
        )
        .reduce((sum, po) => sum + calcPoSubtotal(po), 0);

      const obligated = activePrTotal + issuedPoTotal;

      const utilized = state.pos
        .filter(
          (po) =>
            po.fiscalYear === fy &&
            po.departmentId === dept.id &&
            po.status === 'Delivered / Received'
        )
        .reduce((sum, po) => sum + calcPoSubtotal(po), 0);

      const remaining = totalAllocated - obligated - utilized;
      const utilizationPct =
        totalAllocated > 0 ? Math.min(100, Math.round(((obligated + utilized) / totalAllocated) * 100)) : 0;

      return {
        department: dept,
        mooeCeiling,
        capitalOutlayCeiling,
        totalAllocated,
        ppmpPlanned,
        obligated,
        utilized,
        remaining,
        utilizationPct,
      };
    });
  }, [state.departments, state.allocations, state.ppmps, state.prs, state.pos, state.activeFiscalYear]);

  const agencyBudgetTotals = useMemo(() => {
    const agencyCeiling =
      currentFiscalConfig.agencyMooeCeiling + currentFiscalConfig.agencyCoCeiling;
    const contingencyAmount = agencyCeiling * (currentFiscalConfig.contingencyPercent / 100);
    const netDistributable = agencyCeiling - contingencyAmount;

    const totalAllocated = departmentSummaries.reduce((s, d) => s + d.totalAllocated, 0);
    const totalPpmpPlanned = departmentSummaries.reduce((s, d) => s + d.ppmpPlanned, 0);
    const totalObligated = departmentSummaries.reduce((s, d) => s + d.obligated, 0);
    const totalUtilized = departmentSummaries.reduce((s, d) => s + d.utilized, 0);
    const totalRemaining = departmentSummaries.reduce((s, d) => s + d.remaining, 0);

    return {
      agencyCeiling,
      contingencyAmount,
      netDistributable,
      totalAllocated,
      totalPpmpPlanned,
      totalObligated,
      totalUtilized,
      totalRemaining,
    };
  }, [currentFiscalConfig, departmentSummaries]);

  const quarterlyPpmpTotals = useMemo(() => {
    const fy = state.activeFiscalYear;
    let q1 = 0;
    let q2 = 0;
    let q3 = 0;
    let q4 = 0;
    for (const p of state.ppmps) {
      if (p.fiscalYear !== fy || p.status === 'Returned') continue;
      for (const it of p.items) {
        q1 += it.q1Qty * it.unitCost;
        q2 += it.q2Qty * it.unitCost;
        q3 += it.q3Qty * it.unitCost;
        q4 += it.q4Qty * it.unitCost;
      }
    }
    return { q1, q2, q3, q4 };
  }, [state.ppmps, state.activeFiscalYear]);

  const updateFiscalConfig = (year: number, patch: Partial<FiscalYearConfig>) => {
    if (!requirePerm('fiscal', 'edit', 'update fiscal year configuration')) return;
    setState((prev) => ({
      ...prev,
      fiscalYears: prev.fiscalYears.map((fy) => (fy.year === year ? { ...fy, ...patch } : fy)),
      auditLogs: appendAudit(prev, 'fiscal', 'Updated Fiscal Ceiling', `Modified FY ${year} fiscal parameters.`),
    }));
    notify('success', `Updated FY ${year} fiscal ceiling settings.`);
  };

  const updateDepartmentAllocation = (deptId: string, year: number, mooe: number, co: number) => {
    if (!requirePerm('fiscal', 'allocate', 'allocate departmental budget')) return;
    setState((prev) => {
      const exists = prev.allocations.some(
        (a) => a.departmentId === deptId && a.fiscalYear === year
      );
      const nextAllocs = exists
        ? prev.allocations.map((a) =>
            a.departmentId === deptId && a.fiscalYear === year
              ? { ...a, mooeCeiling: mooe, capitalOutlayCeiling: co }
              : a
          )
        : [
            ...prev.allocations,
            { departmentId: deptId, fiscalYear: year, mooeCeiling: mooe, capitalOutlayCeiling: co },
          ];
      const deptName = prev.departments.find((d) => d.id === deptId)?.name || deptId;
      return {
        ...prev,
        allocations: nextAllocs,
        auditLogs: appendAudit(
          prev,
          'fiscal',
          'Updated Dept Allocation',
          `Set FY ${year} allocation for ${deptName} (MOOE: ${mooe}, CO: ${co}).`
        ),
      };
    });
    notify('success', 'Department budget allocation saved.');
  };

  const addFiscalYear = (year: number, mooeCeiling: number, coCeiling: number) => {
    if (!requirePerm('fiscal', 'create', 'add a new fiscal year')) return;
    if (state.fiscalYears.some((f) => f.year === year)) {
      notify('warning', `Fiscal Year ${year} already exists.`);
      return;
    }
    setState((prev) => {
      const newAllocs: DepartmentAllocation[] = prev.departments.map((d) => ({
        departmentId: d.id,
        fiscalYear: year,
        mooeCeiling: Math.round(mooeCeiling / prev.departments.length),
        capitalOutlayCeiling: Math.round(coCeiling / prev.departments.length),
      }));
      return {
        ...prev,
        activeFiscalYear: year,
        fiscalYears: [
          ...prev.fiscalYears,
          {
            year,
            label: `FY ${year} — Planning Cycle`,
            status: 'Planning' as const,
            agencyMooeCeiling: mooeCeiling,
            agencyCoCeiling: coCeiling,
            contingencyPercent: 5,
            defaultTaxRate: 12,
            defaultWithholdingRate: 2,
          },
        ].sort((a, b) => a.year - b.year),
        allocations: [...prev.allocations, ...newAllocs],
        auditLogs: appendAudit(prev, 'fiscal', 'Created Fiscal Year', `Initialized FY ${year} budget cycle.`),
      };
    });
    notify('success', `Fiscal Year ${year} created and activated.`);
  };

  const createPpmp: DemoContextValue['createPpmp'] = (payload) => {
    if (!requirePerm('ppmp', 'create', 'create a PPMP')) return null;
    const dept = state.departments.find((d) => d.id === payload.departmentId);
    const deptTag = dept?.code.split('-')[0] || payload.departmentId;
    const existingForDept = state.ppmps
      .filter((p) => p.fiscalYear === state.activeFiscalYear && p.departmentId === payload.departmentId)
      .map((p) => p.ppmpNo);
    const seq = existingForDept.length + 1;
    const ppmpNo = `PPMP-${state.activeFiscalYear}-${deptTag}-${String(seq).padStart(2, '0')}`;
    const doc: PPMPDocument = {
      id: uid('ppmp'),
      ppmpNo,
      fiscalYear: state.activeFiscalYear,
      departmentId: payload.departmentId,
      title: payload.title,
      fundCluster: payload.fundCluster,
      preparedBy: activeRoleDef.personaName,
      status: payload.submitImmediately ? 'Submitted' : 'Draft',
      createdAt: todayIso(),
      updatedAt: todayIso(),
      remarks: payload.remarks,
      items: payload.items,
    };
    setState((prev) => ({
      ...prev,
      ppmps: [doc, ...prev.ppmps],
      auditLogs: appendAudit(
        prev,
        'ppmp',
        payload.submitImmediately ? 'Created & Submitted PPMP' : 'Created Draft PPMP',
        `${doc.title} (${doc.items.length} line items).`,
        doc.ppmpNo
      ),
    }));
    notify('success', `${ppmpNo} created (${doc.status}).`);
    return doc;
  };

  const updatePpmpStatus = (id: string, nextStatus: PPMPStatus, note?: string) => {
    if (nextStatus === 'Budget Verified' && !requirePerm('ppmp', 'certify_budget', 'verify PPMP budget')) return;
    if (nextStatus === 'Approved' && !requirePerm('ppmp', 'approve', 'approve PPMP')) return;
    if (nextStatus === 'Submitted' && !requirePerm('ppmp', 'create', 'submit PPMP')) return;
    if (nextStatus === 'Returned' && !can('ppmp', 'certify_budget') && !can('ppmp', 'approve')) {
      notify('error', 'RBAC Denied: Only Budget Officer, Approving Authority, or Admin can return a PPMP.');
      return;
    }

    setState((prev) => {
      const target = prev.ppmps.find((p) => p.id === id);
      if (!target) return prev;
      return {
        ...prev,
        ppmps: prev.ppmps.map((p) =>
          p.id === id
            ? {
                ...p,
                status: nextStatus,
                updatedAt: todayIso(),
                remarks: note || p.remarks,
                verifiedBy: nextStatus === 'Budget Verified' ? `${activeRoleDef.personaName}` : p.verifiedBy,
                approvedBy: nextStatus === 'Approved' ? `${activeRoleDef.personaName}` : p.approvedBy,
              }
            : p
        ),
        auditLogs: appendAudit(
          prev,
          'ppmp',
          `PPMP ${nextStatus}`,
          `Updated ${target.ppmpNo} status to ${nextStatus}.`,
          target.ppmpNo
        ),
      };
    });
    notify('success', `PPMP updated to "${nextStatus}".`);
  };

  const addOrUpdateInventoryItem: DemoContextValue['addOrUpdateInventoryItem'] = (item) => {
    const action: ActionKey = item.id ? 'edit' : 'create';
    if (!requirePerm('inventory', action, 'modify inventory catalog')) return;
    setState((prev) => {
      if (item.id) {
        return {
          ...prev,
          inventory: prev.inventory.map((ex) =>
            ex.id === item.id ? { ...item, id: ex.id, lastUpdated: todayIso() } : ex
          ),
          auditLogs: appendAudit(prev, 'inventory', 'Updated Inventory Item', `Edited ${item.stockCode} - ${item.name}.`, item.stockCode),
        };
      }
      const created: InventoryItem = {
        ...item,
        id: uid('inv'),
        lastUpdated: todayIso(),
      };
      return {
        ...prev,
        inventory: [created, ...prev.inventory],
        auditLogs: appendAudit(prev, 'inventory', 'Added Inventory Item', `Added ${item.stockCode} (${item.stockOnHand} ${item.unit}).`, item.stockCode),
      };
    });
    notify('success', `Inventory item ${item.stockCode} saved.`);
  };

  const adjustStock = (stockCode: string, delta: number, notes: string) => {
    if (!requirePerm('inventory', 'edit', 'adjust warehouse stock')) return;
    setState((prev) => {
      const target = prev.inventory.find((i) => i.stockCode === stockCode);
      if (!target) return prev;
      const nextQty = Math.max(0, target.stockOnHand + delta);
      const mov: StockMovement = {
        id: uid('mov'),
        date: nowTimestamp().slice(0, 16),
        stockCode: target.stockCode,
        itemName: target.name,
        type: delta >= 0 ? 'STOCK_IN' : 'STOCK_OUT',
        quantity: Math.abs(delta),
        balanceAfter: nextQty,
        referenceNo: 'ADJ-MANUAL',
        departmentId: 'OPS',
        performedBy: activeRoleDef.personaName,
        notes: notes || 'Manual warehouse physical count adjustment',
      };
      return {
        ...prev,
        inventory: prev.inventory.map((i) =>
          i.stockCode === stockCode ? { ...i, stockOnHand: nextQty, lastUpdated: todayIso() } : i
        ),
        stockMovements: [mov, ...prev.stockMovements],
        auditLogs: appendAudit(
          prev,
          'inventory',
          'Adjusted Stock Count',
          `${stockCode} changed by ${delta >= 0 ? `+${delta}` : delta} (New balance: ${nextQty}).`,
          stockCode
        ),
      };
    });
    notify('success', `Stock balance updated for ${stockCode}.`);
  };

  const importExtractedToInventory = (rows: ExtractedRow[]): number => {
    if (!requirePerm('inventory', 'upload', 'import extracted items into inventory')) return 0;
    const included = rows.filter((r) => r.include);
    if (included.length === 0) return 0;
    setState((prev) => {
      const nextInv = [...prev.inventory];
      const nextMovs = [...prev.stockMovements];
      for (const row of included) {
        const existingIdx = nextInv.findIndex(
          (i) => i.stockCode.toLowerCase() === row.stockCode.toLowerCase()
        );
        if (existingIdx >= 0) {
          const ex = nextInv[existingIdx];
          const updatedQty = ex.stockOnHand + row.quantity;
          nextInv[existingIdx] = {
            ...ex,
            stockOnHand: updatedQty,
            unitCost: row.unitCost > 0 ? row.unitCost : ex.unitCost,
            lastUpdated: todayIso(),
          };
          nextMovs.unshift({
            id: uid('mov'),
            date: nowTimestamp().slice(0, 16),
            stockCode: ex.stockCode,
            itemName: ex.name,
            type: 'STOCK_IN',
            quantity: row.quantity,
            balanceAfter: updatedQty,
            referenceNo: 'FILE-IMPORT',
            departmentId: 'OPS',
            performedBy: activeRoleDef.personaName,
            notes: 'Stock incremented via File Upload & Extraction',
          });
        } else {
          nextInv.unshift({
            id: uid('inv'),
            stockCode: row.stockCode,
            name: row.description,
            description: row.description,
            category: row.category,
            isCse: row.isCse,
            unit: row.unit,
            unitCost: row.unitCost,
            stockOnHand: row.quantity,
            reservedQty: 0,
            reorderLevel: Math.max(5, Math.round(row.quantity * 0.25)),
            warehouseBin: 'IMP-01',
            lastUpdated: todayIso(),
          });
          nextMovs.unshift({
            id: uid('mov'),
            date: nowTimestamp().slice(0, 16),
            stockCode: row.stockCode,
            itemName: row.description,
            type: 'STOCK_IN',
            quantity: row.quantity,
            balanceAfter: row.quantity,
            referenceNo: 'FILE-IMPORT',
            departmentId: 'OPS',
            performedBy: activeRoleDef.personaName,
            notes: 'New catalog item imported via File Extraction',
          });
        }
      }
      return {
        ...prev,
        inventory: nextInv,
        stockMovements: nextMovs,
        auditLogs: appendAudit(
          prev,
          'inventory',
          'Imported File to Inventory',
          `Extracted and imported ${included.length} item rows into stock catalog.`
        ),
      };
    });
    notify('success', `Imported ${included.length} extracted item(s) into Inventory.`);
    return included.length;
  };

  const createSr: DemoContextValue['createSr'] = (payload) => {
    if (!requirePerm('sr', 'create', 'create a Stock Requisition (SR)')) return null;
    const srNo = nextDocNumber(
      'SR',
      state.activeFiscalYear,
      state.srs.map((s) => s.srNo)
    );
    const sr: StockRequisition = {
      id: uid('sr'),
      srNo,
      fiscalYear: state.activeFiscalYear,
      departmentId: payload.departmentId,
      dateRequested: todayIso(),
      purpose: payload.purpose,
      requestedBy: activeRoleDef.personaName,
      status: payload.submitImmediately === false ? 'Draft' : 'Submitted',
      items: payload.items,
    };
    setState((prev) => ({
      ...prev,
      srs: [sr, ...prev.srs],
      auditLogs: appendAudit(
        prev,
        'sr',
        'Created Stock Requisition',
        `Created ${srNo} for ${payload.items.length} line item(s).`,
        srNo
      ),
    }));
    notify('success', `Stock Requisition ${srNo} created.`);
    return sr;
  };

  const issueSr = (srId: string) => {
    if (!requirePerm('sr', 'issue', 'approve and issue warehouse stock')) return;
    const target = state.srs.find((s) => s.id === srId);
    if (!target) return;

    // Validate stock availability
    const shortages: string[] = [];
    for (const line of target.items) {
      const invItem = state.inventory.find((i) => i.stockCode === line.stockCode);
      if (!invItem || invItem.stockOnHand < line.requestedQty) {
        shortages.push(
          `${line.stockCode} (Need ${line.requestedQty}, Available ${invItem?.stockOnHand ?? 0})`
        );
      }
    }

    if (shortages.length > 0) {
      setState((prev) => ({
        ...prev,
        srs: prev.srs.map((s) => (s.id === srId ? { ...s, status: 'Needs Purchase (PR)' } : s)),
        auditLogs: appendAudit(
          prev,
          'sr',
          'Flagged SR for Purchase',
          `Insufficient stock on ${target.srNo}: ${shortages.join('; ')}.`,
          target.srNo
        ),
      }));
      notify(
        'warning',
        `Insufficient warehouse stock (${shortages[0]}). Marked "${target.srNo}" as Needs Purchase (PR).`
      );
      return;
    }

    setState((prev) => {
      const nextInv = [...prev.inventory];
      const nextMovs = [...prev.stockMovements];
      const issuedItems = target.items.map((line) => {
        const idx = nextInv.findIndex((i) => i.stockCode === line.stockCode);
        if (idx >= 0) {
          const updatedBal = Math.max(0, nextInv[idx].stockOnHand - line.requestedQty);
          nextInv[idx] = {
            ...nextInv[idx],
            stockOnHand: updatedBal,
            lastUpdated: todayIso(),
          };
          nextMovs.unshift({
            id: uid('mov'),
            date: nowTimestamp().slice(0, 16),
            stockCode: line.stockCode,
            itemName: line.description,
            type: 'STOCK_OUT',
            quantity: line.requestedQty,
            balanceAfter: updatedBal,
            referenceNo: target.srNo,
            departmentId: target.departmentId,
            performedBy: activeRoleDef.personaName,
            notes: `Issued via ${target.srNo}: ${target.purpose}`,
          });
        }
        return { ...line, issuedQty: line.requestedQty };
      });

      return {
        ...prev,
        inventory: nextInv,
        stockMovements: nextMovs,
        srs: prev.srs.map((s) =>
          s.id === srId
            ? {
                ...s,
                status: 'Approved & Issued',
                issuedBy: activeRoleDef.personaName,
                items: issuedItems,
              }
            : s
        ),
        auditLogs: appendAudit(
          prev,
          'sr',
          'Issued SR Stock',
          `Approved and deducted stock for ${target.srNo}.`,
          target.srNo
        ),
      };
    });
    notify('success', `Stock issued for ${target.srNo} and Inventory balances updated.`);
  };

  const convertSrToPr = (srId: string): PurchaseRequest | null => {
    if (!requirePerm('pr', 'create', 'convert short SR to Purchase Request')) return null;
    const sr = state.srs.find((s) => s.id === srId);
    if (!sr) return null;

    const dept = state.departments.find((d) => d.id === sr.departmentId);
    const prNo = nextDocNumber(
      'PR',
      state.activeFiscalYear,
      state.prs.map((p) => p.prNo)
    );

    const prItems: PRLineItem[] = sr.items.map((line) => {
      const inv = state.inventory.find((i) => i.stockCode === line.stockCode);
      const shortfall = inv ? Math.max(line.requestedQty - inv.stockOnHand, line.requestedQty) : line.requestedQty;
      return {
        id: uid('pri'),
        stockCode: line.stockCode,
        description: line.description,
        category: inv?.category || 'CSE - Paper & Office Supplies',
        unit: line.unit,
        quantity: shortfall,
        unitCost: line.unitCost || inv?.unitCost || 0,
      };
    });

    const pr: PurchaseRequest = {
      id: uid('pr'),
      prNo,
      fiscalYear: state.activeFiscalYear,
      departmentId: sr.departmentId,
      fundCluster: '01 - Regular Agency Fund',
      responsibilityCenter: dept?.costCenter || 'CC-1000',
      dateRequested: todayIso(),
      purpose: `Replenishment from ${sr.srNo}: ${sr.purpose}`,
      requestedBy: activeRoleDef.personaName,
      sourceRef: sr.srNo,
      status: 'Submitted',
      items: prItems,
    };

    setState((prev) => ({
      ...prev,
      prs: [pr, ...prev.prs],
      srs: prev.srs.map((s) => (s.id === srId ? { ...s, linkedPrNo: prNo } : s)),
      auditLogs: appendAudit(
        prev,
        'pr',
        'Converted SR to PR',
        `Generated ${prNo} from stock-short ${sr.srNo}.`,
        prNo
      ),
    }));
    notify('success', `Converted ${sr.srNo} into Purchase Request ${prNo}.`);
    return pr;
  };

  const createPr: DemoContextValue['createPr'] = (payload) => {
    if (!requirePerm('pr', 'create', 'create a Purchase Request (PR)')) return null;
    const dept = state.departments.find((d) => d.id === payload.departmentId);
    const prNo = nextDocNumber(
      'PR',
      state.activeFiscalYear,
      state.prs.map((p) => p.prNo)
    );
    const pr: PurchaseRequest = {
      id: uid('pr'),
      prNo,
      fiscalYear: state.activeFiscalYear,
      departmentId: payload.departmentId,
      fundCluster: payload.fundCluster || '01 - Regular Agency Fund',
      responsibilityCenter: dept?.costCenter || 'CC-1000',
      dateRequested: todayIso(),
      purpose: payload.purpose,
      requestedBy: activeRoleDef.personaName,
      sourceRef: payload.sourceRef,
      status: payload.submitImmediately === false ? 'Draft' : 'Submitted',
      items: payload.items,
    };
    setState((prev) => ({
      ...prev,
      prs: [pr, ...prev.prs],
      auditLogs: appendAudit(
        prev,
        'pr',
        'Created Purchase Request',
        `Created ${prNo} (${payload.items.length} line items).`,
        prNo
      ),
    }));
    notify('success', `Purchase Request ${prNo} created.`);
    return pr;
  };

  const updatePrStatus = (prId: string, status: PRStatus) => {
    if (status === 'Funds Certified' && !requirePerm('pr', 'certify_budget', 'certify PR funds availability')) return;
    if (status === 'Approved' && !requirePerm('pr', 'approve', 'grant final approval to PR')) return;
    if (status === 'Submitted' && !requirePerm('pr', 'create', 'submit PR')) return;
    if (status === 'Returned' && !can('pr', 'certify_budget') && !can('pr', 'approve')) {
      notify('error', 'RBAC Denied: Only Budget Officer, Approving Authority, or Admin can return a PR.');
      return;
    }

    const target = state.prs.find((p) => p.id === prId);
    if (!target) return;

    if (status === 'Funds Certified') {
      const deptSummary = departmentSummaries.find((d) => d.department.id === target.departmentId);
      const prAmount = calcPrTotal(target);
      if (deptSummary && prAmount > deptSummary.remaining + prAmount && target.status === 'Submitted') {
        // Note: target PR is already counted in obligated once submitted, so check raw remaining >= 0
      }
      if (deptSummary && deptSummary.remaining < 0) {
        notify(
          'warning',
          `Warning: ${deptSummary.department.name} exceeds budget ceiling by ${Math.abs(deptSummary.remaining).toLocaleString()}. Certified with caution.`
        );
      }
    }

    setState((prev) => ({
      ...prev,
      prs: prev.prs.map((p) =>
        p.id === prId
          ? {
              ...p,
              status,
              budgetCertifiedBy: status === 'Funds Certified' ? activeRoleDef.personaName : p.budgetCertifiedBy,
              approvedBy: status === 'Approved' ? activeRoleDef.personaName : p.approvedBy,
            }
          : p
      ),
      auditLogs: appendAudit(
        prev,
        'pr',
        `PR ${status}`,
        `Updated ${target.prNo} status to ${status}.`,
        target.prNo
      ),
    }));
    notify('success', `${target.prNo} moved to "${status}".`);
  };

  const convertPrToPo: DemoContextValue['convertPrToPo'] = (
    prId,
    supplierId,
    mode,
    deliveryTerm,
    paymentTerm
  ) => {
    if (!requirePerm('po', 'create', 'generate a Purchase Order from PR')) return null;
    const pr = state.prs.find((p) => p.id === prId);
    const supplier = state.suppliers.find((s) => s.id === supplierId) || state.suppliers[0];
    if (!pr) return null;

    const poNo = nextDocNumber(
      'PO',
      state.activeFiscalYear,
      state.pos.map((p) => p.poNo)
    );
    const po: PurchaseOrder = {
      id: uid('po'),
      poNo,
      prNo: pr.prNo,
      fiscalYear: state.activeFiscalYear,
      departmentId: pr.departmentId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierAddress: supplier.address,
      supplierTin: supplier.tin,
      modeOfProcurement: mode,
      placeOfDelivery: 'Central Property Warehouse (Gate 2)',
      deliveryTerm: deliveryTerm || '15 Calendar Days upon receipt of PO',
      paymentTerm: paymentTerm || '30 Days Net upon Inspection & Acceptance',
      dateIssued: todayIso(),
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: currentFiscalConfig.defaultWithholdingRate,
      taxInclusive: true,
      preparedBy: activeRoleDef.personaName,
      approvedBy: pr.approvedBy || 'Riley Cruz (HOPE)',
      status: can('po', 'issue') ? 'Approved & Issued' : 'Draft',
      items: pr.items.map((it) => ({
        id: uid('poi'),
        stockCode: it.stockCode,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unitCost: it.unitCost,
      })),
    };

    setState((prev) => ({
      ...prev,
      pos: [po, ...prev.pos],
      prs: prev.prs.map((p) =>
        p.id === prId ? { ...p, status: 'Converted to PO', linkedPoNo: poNo } : p
      ),
      auditLogs: appendAudit(
        prev,
        'po',
        'Generated PO from PR',
        `Created ${poNo} for ${supplier.name} from approved ${pr.prNo}.`,
        poNo
      ),
    }));
    notify('success', `Generated Purchase Order ${poNo} from ${pr.prNo}.`);
    return po;
  };

  const createPoDirect: DemoContextValue['createPoDirect'] = (payload) => {
    if (!requirePerm('po', 'create', 'create a Purchase Order')) return null;
    const supplier = state.suppliers.find((s) => s.id === payload.supplierId) || state.suppliers[0];
    const poNo = nextDocNumber(
      'PO',
      state.activeFiscalYear,
      state.pos.map((p) => p.poNo)
    );
    const po: PurchaseOrder = {
      id: uid('po'),
      poNo,
      prNo: payload.prNo || 'DIRECT-REQ',
      fiscalYear: state.activeFiscalYear,
      departmentId: payload.departmentId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierAddress: supplier.address,
      supplierTin: supplier.tin,
      modeOfProcurement: payload.modeOfProcurement,
      placeOfDelivery: 'Central Property Warehouse (Gate 2)',
      deliveryTerm: payload.deliveryTerm,
      paymentTerm: payload.paymentTerm,
      dateIssued: todayIso(),
      taxRate: payload.taxRate,
      withholdingRate: payload.withholdingRate,
      taxInclusive: payload.taxInclusive,
      preparedBy: activeRoleDef.personaName,
      status: 'Draft',
      items: payload.items.map((i) => ({ ...i, id: uid('poi') })),
    };
    setState((prev) => ({
      ...prev,
      pos: [po, ...prev.pos],
      auditLogs: appendAudit(prev, 'po', 'Created Draft PO', `Created ${poNo} for ${supplier.name}.`, poNo),
    }));
    notify('success', `Draft Purchase Order ${poNo} created.`);
    return po;
  };

  const issuePo = (poId: string) => {
    if (!requirePerm('po', 'issue', 'issue Purchase Order to supplier')) return;
    const target = state.pos.find((p) => p.id === poId);
    if (!target) return;
    setState((prev) => ({
      ...prev,
      pos: prev.pos.map((p) =>
        p.id === poId
          ? {
              ...p,
              status: 'Approved & Issued',
              approvedBy: p.approvedBy || activeRoleDef.personaName,
            }
          : p
      ),
      auditLogs: appendAudit(prev, 'po', 'Issued PO to Supplier', `Issued ${target.poNo} to ${target.supplierName}.`, target.poNo),
    }));
    notify('success', `${target.poNo} issued to supplier.`);
  };

  const receivePoDelivery = (poId: string) => {
    if (!requirePerm('po', 'receive', 'receive PO delivery into Inventory')) return;
    const po = state.pos.find((p) => p.id === poId);
    if (!po || po.status === 'Delivered / Received') return;

    setState((prev) => {
      const nextInv = [...prev.inventory];
      const nextMovs = [...prev.stockMovements];

      for (const line of po.items) {
        const idx = nextInv.findIndex((i) => i.stockCode === line.stockCode);
        if (idx >= 0) {
          const newBal = nextInv[idx].stockOnHand + line.quantity;
          nextInv[idx] = {
            ...nextInv[idx],
            stockOnHand: newBal,
            unitCost: line.unitCost > 0 ? line.unitCost : nextInv[idx].unitCost,
            lastUpdated: todayIso(),
          };
          nextMovs.unshift({
            id: uid('mov'),
            date: nowTimestamp().slice(0, 16),
            stockCode: line.stockCode,
            itemName: line.description,
            type: 'STOCK_IN',
            quantity: line.quantity,
            balanceAfter: newBal,
            referenceNo: po.poNo,
            departmentId: po.departmentId,
            performedBy: activeRoleDef.personaName,
            notes: `Delivery received from ${po.supplierName}`,
          });
        } else {
          nextInv.unshift({
            id: uid('inv'),
            stockCode: line.stockCode,
            name: line.description,
            description: line.description,
            category: line.stockCode.startsWith('NCSE')
              ? 'Non-CSE - IT Equipment'
              : 'CSE - Paper & Office Supplies',
            isCse: !line.stockCode.startsWith('NCSE'),
            unit: line.unit,
            unitCost: line.unitCost,
            stockOnHand: line.quantity,
            reservedQty: 0,
            reorderLevel: Math.max(2, Math.round(line.quantity * 0.2)),
            warehouseBin: 'RCV-01',
            lastUpdated: todayIso(),
          });
          nextMovs.unshift({
            id: uid('mov'),
            date: nowTimestamp().slice(0, 16),
            stockCode: line.stockCode,
            itemName: line.description,
            type: 'STOCK_IN',
            quantity: line.quantity,
            balanceAfter: line.quantity,
            referenceNo: po.poNo,
            departmentId: po.departmentId,
            performedBy: activeRoleDef.personaName,
            notes: `New stock received from ${po.supplierName}`,
          });
        }
      }

      return {
        ...prev,
        inventory: nextInv,
        stockMovements: nextMovs,
        pos: prev.pos.map((p) =>
          p.id === poId
            ? {
                ...p,
                status: 'Delivered / Received',
                receivedBy: activeRoleDef.personaName,
                receivedDate: todayIso(),
              }
            : p
        ),
        auditLogs: appendAudit(
          prev,
          'po',
          'Received PO Delivery',
          `Inspected & stocked ${po.items.length} item(s) from ${po.poNo}.`,
          po.poNo
        ),
      };
    });
    notify('success', `PO ${po.poNo} marked Delivered & stock levels incremented!`);
  };

  const togglePermission = (role: RoleId, module: ModuleKey, action: ActionKey) => {
    if (!requirePerm('rbac', 'admin', 'modify RBAC permission matrix')) return;
    if (role === 'SUPER_ADMIN' && module === 'rbac' && action === 'admin') {
      notify('warning', 'Cannot revoke System Administrator RBAC admin permission in sandbox.');
      return;
    }
    setState((prev) => {
      const currentActions = prev.permissionMatrix[role]?.[module] || [];
      const exists = currentActions.includes(action);
      const updated = exists
        ? currentActions.filter((a) => a !== action)
        : [...currentActions, action];
      return {
        ...prev,
        permissionMatrix: {
          ...prev.permissionMatrix,
          [role]: {
            ...prev.permissionMatrix[role],
            [module]: updated,
          },
        },
        auditLogs: appendAudit(
          prev,
          'rbac',
          'Modified Permission Rule',
          `${exists ? 'Revoked' : 'Granted'} "${action}" on "${module}" for ${role}.`
        ),
      };
    });
  };

  const resetPermissionsToDefault = () => {
    if (!requirePerm('rbac', 'admin', 'reset RBAC matrix')) return;
    setState((prev) => ({
      ...prev,
      permissionMatrix: JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX)),
      auditLogs: appendAudit(prev, 'rbac', 'Reset RBAC Matrix', 'Restored default 6-role permission matrix.'),
    }));
    notify('success', 'RBAC permissions restored to baseline defaults.');
  };

  // Printable Draft Builders
  const buildPpmpPrintDraft = (ppmp: PPMPDocument): CustomPrintFormDraft => {
    const dept = state.departments.find((d) => d.id === ppmp.departmentId);
    return {
      formType: 'PPMP',
      entityName: state.entityName,
      fundCluster: ppmp.fundCluster,
      fiscalYear: ppmp.fiscalYear,
      docNo: ppmp.ppmpNo,
      date: ppmp.updatedAt,
      departmentName: dept?.name || ppmp.departmentId,
      costCenter: dept?.costCenter || 'CC-1000',
      purposeOrTitle: ppmp.title,
      supplierName: '',
      supplierAddress: '',
      supplierTin: '',
      deliveryTerm: 'Quarterly Schedule (Q1–Q4)',
      paymentTerm: 'Agency Budget Allocation',
      modeOfProcurement: 'Per-Item Schedule',
      preparedBy: ppmp.preparedBy,
      certifiedBy: ppmp.verifiedBy || 'Morgan Reyes (Budget Officer)',
      approvedBy: ppmp.approvedBy || 'Riley Cruz (HOPE)',
      receivedBy: '',
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: 0,
      items: ppmp.items.map((i) => ({
        stockCode: i.stockCode,
        description: i.description,
        unit: i.unit,
        q1Qty: i.q1Qty,
        q2Qty: i.q2Qty,
        q3Qty: i.q3Qty,
        q4Qty: i.q4Qty,
        quantity: i.q1Qty + i.q2Qty + i.q3Qty + i.q4Qty,
        unitCost: i.unitCost,
        mode: i.mode,
        isCse: i.isCse,
      })),
    };
  };

  const buildAppCsePrintDraft = (): CustomPrintFormDraft => {
    const consolidatedMap = new Map<
      string,
      {
        stockCode: string;
        description: string;
        unit: string;
        q1Qty: number;
        q2Qty: number;
        q3Qty: number;
        q4Qty: number;
        unitCost: number;
        mode: string;
        isCse: boolean;
      }
    >();

    for (const p of state.ppmps) {
      if (p.fiscalYear !== state.activeFiscalYear || !['Approved', 'Budget Verified'].includes(p.status)) {
        continue;
      }
      for (const it of p.items) {
        const key = `${it.stockCode}::${it.description}`;
        const existing = consolidatedMap.get(key);
        if (existing) {
          existing.q1Qty += it.q1Qty;
          existing.q2Qty += it.q2Qty;
          existing.q3Qty += it.q3Qty;
          existing.q4Qty += it.q4Qty;
        } else {
          consolidatedMap.set(key, {
            stockCode: it.stockCode,
            description: it.description,
            unit: it.unit,
            q1Qty: it.q1Qty,
            q2Qty: it.q2Qty,
            q3Qty: it.q3Qty,
            q4Qty: it.q4Qty,
            unitCost: it.unitCost,
            mode: it.mode,
            isCse: it.isCse,
          });
        }
      }
    }

    const items = Array.from(consolidatedMap.values()).map((it) => ({
      ...it,
      quantity: it.q1Qty + it.q2Qty + it.q3Qty + it.q4Qty,
    }));

    return {
      formType: 'APP_CSE',
      entityName: state.entityName,
      fundCluster: '01 - Regular Agency Consolidated Fund',
      fiscalYear: state.activeFiscalYear,
      docNo: `APP-CSE-${state.activeFiscalYear}-MASTER`,
      date: todayIso(),
      departmentName: 'All Operating Departments (Consolidated)',
      costCenter: 'AGENCY-WIDE',
      purposeOrTitle: `Annual Procurement Plan — Common-Use Supplies & Equipment (FY ${state.activeFiscalYear})`,
      supplierName: 'PS-DBM & Authorized Mode Suppliers',
      supplierAddress: '',
      supplierTin: '',
      deliveryTerm: 'Quarterly Consolidated Replenishment',
      paymentTerm: 'Per Approved Budget Allocation',
      modeOfProcurement: 'PS-DBM / R.A. 9184 Modes',
      preparedBy: 'Taylor Santos (Procurement Officer)',
      certifiedBy: 'Morgan Reyes (Budget Officer)',
      approvedBy: 'Riley Cruz (HOPE)',
      receivedBy: 'Jordan Navarro (Supply Custodian)',
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: 0,
      items,
    };
  };

  const buildSrPrintDraft = (sr: StockRequisition): CustomPrintFormDraft => {
    const dept = state.departments.find((d) => d.id === sr.departmentId);
    return {
      formType: 'SR',
      entityName: state.entityName,
      fundCluster: '01 - Regular Agency Fund',
      fiscalYear: sr.fiscalYear,
      docNo: sr.srNo,
      date: sr.dateRequested,
      departmentName: dept?.name || sr.departmentId,
      costCenter: dept?.costCenter || 'CC-1000',
      purposeOrTitle: sr.purpose,
      supplierName: 'Central Supply Warehouse',
      supplierAddress: '',
      supplierTin: '',
      deliveryTerm: 'Immediate Warehouse Issuance',
      paymentTerm: 'Internal Stock Transfer',
      modeOfProcurement: 'Inventory Requisition',
      preparedBy: sr.requestedBy,
      certifiedBy: 'Division Head / Requesting Supervisor',
      approvedBy: sr.issuedBy || 'Jordan Navarro (Supply Custodian)',
      receivedBy: sr.requestedBy,
      taxRate: 0,
      withholdingRate: 0,
      items: sr.items.map((i) => ({
        stockCode: i.stockCode,
        description: i.description,
        unit: i.unit,
        quantity: i.issuedQty > 0 ? i.issuedQty : i.requestedQty,
        unitCost: i.unitCost,
      })),
    };
  };

  const buildPrPrintDraft = (pr: PurchaseRequest): CustomPrintFormDraft => {
    const dept = state.departments.find((d) => d.id === pr.departmentId);
    return {
      formType: 'PR',
      entityName: state.entityName,
      fundCluster: pr.fundCluster,
      fiscalYear: pr.fiscalYear,
      docNo: pr.prNo,
      date: pr.dateRequested,
      departmentName: dept?.name || pr.departmentId,
      costCenter: pr.responsibilityCenter,
      purposeOrTitle: pr.purpose,
      supplierName: '',
      supplierAddress: '',
      supplierTin: '',
      deliveryTerm: 'Upon PO Issuance',
      paymentTerm: 'Government Terms (30 Days Net)',
      modeOfProcurement: 'Pending BAC Validation',
      preparedBy: pr.requestedBy,
      certifiedBy: pr.budgetCertifiedBy || 'Morgan Reyes (Budget Officer)',
      approvedBy: pr.approvedBy || 'Riley Cruz (HOPE)',
      receivedBy: '',
      taxRate: currentFiscalConfig.defaultTaxRate,
      withholdingRate: 0,
      items: pr.items.map((i) => ({
        stockCode: i.stockCode,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
    };
  };

  const buildPoPrintDraft = (po: PurchaseOrder): CustomPrintFormDraft => {
    const dept = state.departments.find((d) => d.id === po.departmentId);
    return {
      formType: 'PO',
      entityName: state.entityName,
      fundCluster: '01 - Regular Agency Fund',
      fiscalYear: po.fiscalYear,
      docNo: po.poNo,
      date: po.dateIssued,
      departmentName: dept?.name || po.departmentId,
      costCenter: dept?.costCenter || 'CC-1000',
      purposeOrTitle: `Reference PR: ${po.prNo}`,
      supplierName: po.supplierName,
      supplierAddress: po.supplierAddress,
      supplierTin: po.supplierTin,
      deliveryTerm: po.deliveryTerm,
      paymentTerm: po.paymentTerm,
      modeOfProcurement: po.modeOfProcurement,
      preparedBy: po.preparedBy,
      certifiedBy: 'Morgan Reyes (Budget Officer)',
      approvedBy: po.approvedBy || 'Riley Cruz (HOPE)',
      receivedBy: po.receivedBy || 'Authorized Supplier Representative',
      taxRate: po.taxRate,
      withholdingRate: po.withholdingRate,
      items: po.items.map((i) => ({
        stockCode: i.stockCode,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
    };
  };

  return (
    <DemoContext.Provider
      value={{
        state,
        activePage,
        setActivePage,
        activeRoleDef,
        can,
        toasts,
        dismissToast,
        notify,
        printModalDraft,
        openPrintModal: (draft) => setPrintModalDraft(draft),
        closePrintModal: () => setPrintModalDraft(null),
        switchRole,
        setDeptUserScope,
        setFiscalYear,
        setCurrency,
        setEntityName,
        resetDemoData,
        currentFiscalConfig,
        departmentSummaries,
        agencyBudgetTotals,
        quarterlyPpmpTotals,
        updateFiscalConfig,
        updateDepartmentAllocation,
        addFiscalYear,
        createPpmp,
        updatePpmpStatus,
        addOrUpdateInventoryItem,
        adjustStock,
        importExtractedToInventory,
        createSr,
        issueSr,
        convertSrToPr,
        createPr,
        updatePrStatus,
        convertPrToPo,
        createPoDirect,
        issuePo,
        receivePoDelivery,
        togglePermission,
        resetPermissionsToDefault,
        buildPpmpPrintDraft,
        buildAppCsePrintDraft,
        buildSrPrintDraft,
        buildPrPrintDraft,
        buildPoPrintDraft,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error('useDemo must be used inside DemoProvider');
  }
  return ctx;
}
