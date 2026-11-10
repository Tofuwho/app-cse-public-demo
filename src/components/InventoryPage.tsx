import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileUp,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { ItemCategory } from '../types/procurement';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { exportRowsToExcel } from '../utils/fileExtractor';
import { RbacNoticeBanner, StatusBadge } from './RbacBadge';

const CATEGORIES: ItemCategory[] = [
  'CSE - Paper & Office Supplies',
  'CSE - Ink & Toner',
  'CSE - Cleaning & Janitorial',
  'CSE - IT Accessories',
  'Non-CSE - Furniture & Fixtures',
  'Non-CSE - IT Equipment',
  'Non-CSE - Services & Maintenance',
];

export const InventoryPage: React.FC = () => {
  const { state, can, addOrUpdateInventoryItem, adjustStock, setActivePage, notify } = useDemo();

  const [tab, setTab] = useState<'catalog' | 'ledger'>('catalog');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN' | 'LOW' | 'OUT'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add item form
  const [newCode, setNewCode] = useState('CSE-OFF-099');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ItemCategory>('CSE - Paper & Office Supplies');
  const [newUnit, setNewUnit] = useState('box');
  const [newCost, setNewCost] = useState('250');
  const [newQty, setNewQty] = useState('25');
  const [newReorder, setNewReorder] = useState('10');
  const [newBin, setNewBin] = useState('A2-10');

  // Quick adjust state
  const [adjustCode, setAdjustCode] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('10');
  const [adjustNote, setAdjustNote] = useState('Physical count replenishment');

  const canEdit = can('inventory', 'edit');
  const canCreate = can('inventory', 'create');

  const getStockStatus = (qty: number, reorder: number) => {
    if (qty === 0) return 'Out of Stock';
    if (qty <= reorder) return 'Low Stock';
    return 'In Stock';
  };

  const filteredItems = useMemo(() => {
    return state.inventory.filter((item) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !item.stockCode.toLowerCase().includes(q) &&
        !item.name.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      const status = getStockStatus(item.stockOnHand, item.reorderLevel);
      if (stockFilter === 'IN' && status !== 'In Stock') return false;
      if (stockFilter === 'LOW' && status !== 'Low Stock') return false;
      if (stockFilter === 'OUT' && status !== 'Out of Stock') return false;
      return true;
    });
  }, [state.inventory, search, stockFilter]);

  const totalInventoryValue = state.inventory.reduce(
    (s, it) => s + it.stockOnHand * it.unitCost,
    0
  );
  const lowOrOutCount = state.inventory.filter((i) => i.stockOnHand <= i.reorderLevel).length;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      notify('warning', 'Stock code and item name are required.');
      return;
    }
    addOrUpdateInventoryItem({
      stockCode: newCode.trim().toUpperCase(),
      name: newName.trim(),
      description: newName.trim(),
      category: newCategory,
      isCse: newCategory.startsWith('CSE'),
      unit: newUnit.trim() || 'pc',
      unitCost: Math.max(0, Number(newCost) || 0),
      stockOnHand: Math.max(0, Math.round(Number(newQty) || 0)),
      reservedQty: 0,
      reorderLevel: Math.max(0, Math.round(Number(newReorder) || 5)),
      warehouseBin: newBin.trim() || 'GEN-01',
    });
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Inventory Management & Warehouse Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Real-time stock catalog synced automatically with Stock Requisitions (SR Out) and Purchase Order Deliveries (PO In).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">
            <button
              onClick={() => setTab('catalog')}
              className={`px-3 py-1.5 rounded-lg transition ${
                tab === 'catalog' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Stock Catalog ({state.inventory.length})
            </button>
            <button
              onClick={() => setTab('ledger')}
              className={`px-3 py-1.5 rounded-lg transition ${
                tab === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Stock Movement Ledger ({state.stockMovements.length})
            </button>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Catalog Item
            </button>
          )}
          <button
            onClick={() => setActivePage('upload')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <FileUp className="w-4 h-4" />
            Bulk Extract
          </button>
        </div>
      </div>

      <RbacNoticeBanner
        module="inventory"
        action="edit"
        actionLabel="Adjust Stock Counts or Add Items"
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">
            Total On-Hand Stock Valuation
          </span>
          <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalInventoryValue, state.currency)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Active Catalog SKUs</span>
          <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {state.inventory.length} Items
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-500">
            Low / Out-of-Stock Alerts
          </span>
          <div className="mt-1 text-xl font-bold text-amber-700 tabular-nums">
            {lowOrOutCount} Need Replenishment
          </div>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-3 text-xs"
        >
          <h3 className="text-sm font-bold text-slate-900">Register New Supply / Equipment SKU</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Stock Code</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-600 mb-1">Item Name / Specification</label>
              <input
                type="text"
                placeholder="e.g., Sticky Notes 3x3 Pad (Pack of 12)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ItemCategory)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Unit</label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Unit Cost</label>
              <input
                type="number"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Initial Qty / Reorder</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 tabular-nums"
                  title="Initial Stock"
                />
                <input
                  type="number"
                  value={newReorder}
                  onChange={(e) => setNewReorder(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 tabular-nums"
                  title="Reorder Level"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Warehouse Bin</label>
              <input
                type="text"
                value={newBin}
                onChange={(e) => setNewBin(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Item to Catalog
            </button>
          </div>
        </form>
      )}

      {tab === 'catalog' ? (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by stock code, item name, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5"
                />
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                {(['ALL', 'IN', 'LOW', 'OUT'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setStockFilter(k)}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      stockFilter === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {k === 'ALL'
                      ? 'All'
                      : k === 'IN'
                      ? 'In Stock'
                      : k === 'LOW'
                      ? 'Low Stock'
                      : 'Out of Stock'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                exportRowsToExcel(
                  'OpenProcure_Inventory_Snapshot.xlsx',
                  'Inventory',
                  filteredItems.map((i) => ({
                    Stock_Code: i.stockCode,
                    Name: i.name,
                    Category: i.category,
                    Unit: i.unit,
                    Unit_Cost: i.unitCost,
                    Stock_On_Hand: i.stockOnHand,
                    Reorder_Level: i.reorderLevel,
                    Valuation: i.stockOnHand * i.unitCost,
                    Bin: i.warehouseBin,
                  }))
                );
                notify('success', 'Exported Inventory Snapshot to Excel.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" /> Export Catalog
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Stock Code</th>
                    <th className="px-4 py-3">Item & Category</th>
                    <th className="px-3 py-3 text-center">Bin</th>
                    <th className="px-3 py-3 text-center">Unit</th>
                    <th className="px-3 py-3 text-right">Unit Cost</th>
                    <th className="px-3 py-3 text-right">On Hand</th>
                    <th className="px-3 py-3 text-right">Reorder At</th>
                    <th className="px-3 py-3 text-right">Valuation</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {filteredItems.map((item) => {
                    const status = getStockStatus(item.stockOnHand, item.reorderLevel);
                    const isAdjusting = adjustCode === item.stockCode;
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-slate-700">
                            {item.stockCode}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-[10.5px] text-slate-400">
                              {item.category}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-500">
                            {item.warehouseBin}
                          </td>
                          <td className="px-3 py-2.5 text-center">{item.unit}</td>
                          <td className="px-3 py-2.5 text-right">
                            {formatCurrency(item.unitCost, state.currency)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                            {formatNumber(item.stockOnHand)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            {formatNumber(item.reorderLevel)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                            {formatCurrency(item.stockOnHand * item.unitCost, state.currency)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              disabled={!canEdit}
                              onClick={() =>
                                setAdjustCode(isAdjusting ? null : item.stockCode)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-semibold"
                            >
                              <SlidersHorizontal className="w-3 h-3" /> Adjust
                            </button>
                          </td>
                        </tr>
                        {isAdjusting && (
                          <tr className="bg-blue-50/60">
                            <td colSpan={10} className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <span className="font-semibold text-slate-700 mr-auto">
                                  Adjust Stock for {item.stockCode} (Current: {item.stockOnHand}{' '}
                                  {item.unit})
                                </span>
                                <input
                                  type="number"
                                  value={adjustDelta}
                                  onChange={(e) => setAdjustDelta(e.target.value)}
                                  placeholder="+/- Qty"
                                  className="w-24 rounded border border-slate-300 px-2.5 py-1 text-right bg-white"
                                />
                                <input
                                  type="text"
                                  value={adjustNote}
                                  onChange={(e) => setAdjustNote(e.target.value)}
                                  placeholder="Adjustment reason"
                                  className="w-56 rounded border border-slate-300 px-2.5 py-1 bg-white"
                                />
                                <button
                                  onClick={() => {
                                    adjustStock(item.stockCode, Number(adjustDelta) || 0, adjustNote);
                                    setAdjustCode(null);
                                  }}
                                  className="px-3 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                                >
                                  Apply Delta
                                </button>
                                <button
                                  onClick={() => setAdjustCode(null)}
                                  className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Stock Code & Item</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Balance After</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Performed By & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {state.stockMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{m.date}</td>
                    <td className="px-4 py-2.5">
                      {m.type === 'STOCK_IN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                          <ArrowDownLeft className="w-3 h-3" /> STOCK IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                          <ArrowUpRight className="w-3 h-3" /> STOCK OUT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 mr-1.5">
                        {m.stockCode}
                      </span>
                      <span className="text-slate-900">{m.itemName}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {m.type === 'STOCK_IN' ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                      {m.balanceAfter}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-blue-700">
                      {m.referenceNo}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{m.performedBy}</div>
                      <div className="text-[11px] text-slate-500">{m.notes}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
