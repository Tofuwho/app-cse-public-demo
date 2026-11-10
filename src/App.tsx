import React from 'react';
import { Lock } from 'lucide-react';
import { DemoProvider, useDemo } from './context/DemoContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FiscalBudgetPage } from './components/FiscalBudgetPage';
import { PpmpAppCsePage } from './components/PpmpAppCsePage';
import { InventoryPage } from './components/InventoryPage';
import { StockRequisitionPage } from './components/StockRequisitionPage';
import { PurchaseRequestPage } from './components/PurchaseRequestPage';
import { PurchaseOrderPage } from './components/PurchaseOrderPage';
import { FileUploadExtractPage } from './components/FileUploadExtractPage';
import { PrintFormStudio } from './components/PrintFormStudio';
import { RbacAuditPage } from './components/RbacAuditPage';
import { getAuthorizedRolesForAction } from './data/rbac';

const ActivePageRouter: React.FC = () => {
  const { activePage, can, state, switchRole, activeRoleDef } = useDemo();

  if (!can(activePage, 'view')) {
    const allowed = getAuthorizedRolesForAction(state.permissionMatrix, activePage, 'view');
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-xl mx-auto my-8 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted by RBAC Policy</h2>
        <p className="text-xs text-slate-600 mt-1.5">
          The active role <strong>{activeRoleDef.name}</strong> does not currently have{' '}
          <code>view</code> permission for module <code>{activePage}</code>.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {allowed.map((r) => (
            <button
              key={r.id}
              onClick={() => switchRole(r.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Switch to {r.shortLabel}
            </button>
          ))}
        </div>
      </div>
    );
  }

  switch (activePage) {
    case 'dashboard':
      return <Dashboard />;
    case 'fiscal':
      return <FiscalBudgetPage />;
    case 'ppmp':
      return <PpmpAppCsePage initialTab="ppmp" />;
    case 'app_cse':
      return <PpmpAppCsePage initialTab="app_cse" />;
    case 'inventory':
      return <InventoryPage />;
    case 'sr':
      return <StockRequisitionPage />;
    case 'pr':
      return <PurchaseRequestPage />;
    case 'po':
      return <PurchaseOrderPage />;
    case 'upload':
      return <FileUploadExtractPage />;
    case 'print':
      return <PrintFormStudio />;
    case 'rbac':
      return <RbacAuditPage />;
    default:
      return <Dashboard />;
  }
};

export function App() {
  return (
    <DemoProvider>
      <Layout>
        <ActivePageRouter />
      </Layout>
    </DemoProvider>
  );
}

export default App;
