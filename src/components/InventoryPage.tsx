import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileUp,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { InventoryItem, ItemCategory } from '../types/procurement';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { exportRowsToExcel } from '../utils/fileExtractor';
import { Modal } from './Modal';
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
  const [stockFilter, setStockFilter] = useState<'ALL' | 'ALERT'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add item form
  const [newCode, setNewCode] = useState('CSE-OFF-099');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ItemCategory>('CSE - Paper & Office Supplies');
  const [newUnit, setNewUnit] = useState('box');
  const [newCost, setNewCost] = useState('250');
  const [newQty, setNewQty] = useState('25');
  const [newReorder, setNewReorder] = useState('10');
  const [newBin, setNewBin] = useState('A2-10');

  // Adjust modal state
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
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
      if (stockFilter === 'ALERT' && item.stockOnHand > item.reorderLevel) return false;
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
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Step 1 · Warehouse Inventory Stock</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Always check what is already on hand before requesting a purchase. Stock counts update automatically on SRs and POs.
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
              Movement Log ({state.stockMovements.length})
            </button>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
          <button
            onClick={() => setActivePage('upload')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <FileUp className="w-4 h-4 text-slate-500" /> Import
          </button>
        </div>
      </div>

      <RbacNoticeBanner
        module="inventory"
        action="edit"
        actionLabel="Adjust Stock Counts or Add Items"
      />

      {/* 3 Calm Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500">On-Hand Stock Value</div>
          <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalInventoryValue, state.currency)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500">Catalog Items (SKUs)</div>
          <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {state.inventory.length} Items
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500">Low / Out of Stock</div>
          <div className="mt-1 text-xl font-bold text-amber-700 tabular-nums">
            {lowOrOutCount} Need Reorder
          </div>
        </div>
      </div>

      {tab === 'catalog' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, item, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2"
                />
              </div>

              <button
                onClick={() => setStockFilter(stockFilter === 'ALL' ? 'ALERT' : 'ALL')}
                className={`px-3 py-2 rounded-xl border font-semibold transition ${
                  stockFilter === 'ALERT'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {stockFilter === 'ALERT' ? `Showing Low/Out (${lowOrOutCount})` : `Low Stock Only (${lowOrOutCount})`}
              </button>
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Stock Code</th>
                    <th className="px-4 py-3.5">Item & Category</th>
                    <th className="px-4 py-3.5 text-right">Unit Cost</th>
                    <th className="px-4 py-3.5 text-right">On Hand</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Adjust Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {filteredItems.map((item) => {
                    const status = getStockStatus(item.stockOnHand, item.reorderLevel);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-slate-700">
                          <div>{item.stockCode}</div>
                          <div className="text-[10px] text-slate-400">Bin {item.warehouseBin}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-400">{item.category}</div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {formatCurrency(item.unitCost, state.currency)}
                          <div className="text-[10.5px] text-slate-400">per {item.unit}</div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="font-bold text-slate-900">
                            {formatNumber(item.stockOnHand)} {item.unit}
                          </div>
                          <div className="text-[10.5px] text-slate-400">
                            Reorder at {formatNumber(item.reorderLevel)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            disabled={!canEdit}
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustDelta('10');
                              setAdjustNote('Physical count replenishment');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-semibold"
                          >
                            <SlidersHorizontal className="w-3 h-3" /> Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Movement</th>
                  <th className="px-4 py-3.5">Item</th>
                  <th className="px-4 py-3.5 text-right">Change</th>
                  <th className="px-4 py-3.5 text-right">Balance</th>
                  <th className="px-5 py-3.5">Reference & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {state.stockMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="px-4 py-3">
                      {m.type === 'STOCK_IN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          <ArrowDownLeft className="w-3 h-3" /> Stock In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                          <ArrowUpRight className="w-3 h-3" /> Stock Out
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{m.itemName}</div>
                      <div className="font-mono text-[10.5px] text-slate-400">{m.stockCode}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {m.type === 'STOCK_IN' ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {m.balanceAfter}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-mono text-[11px] font-semibold text-blue-700">
                        {m.referenceNo}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {m.performedBy} — {m.notes}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Catalog Item Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Catalog Item"
        subtitle="Register a supply or equipment SKU in the warehouse catalog."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleAddItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stock Code</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ItemCategory)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Item Name / Specification
              </label>
              <input
                type="text"
                placeholder="e.g., Sticky Notes 3x3 Pad (Pack of 12)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit (UOM)</label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Cost</label>
              <input
                type="number"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opening Stock</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reorder Alert Level</label>
              <input
                type="number"
                value={newReorder}
                onChange={(e) => setNewReorder(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse Bin</label>
              <input
                type="text"
                value={newBin}
                onChange={(e) => setNewBin(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        open={Boolean(adjustItem)}
        onClose={() => setAdjustItem(null)}
        title={`Adjust Stock — ${adjustItem?.stockCode || ''}`}
        subtitle={adjustItem ? `${adjustItem.name} (Current: ${adjustItem.stockOnHand} ${adjustItem.unit})` : ''}
        maxWidthClass="max-w-md"
      >
        {adjustItem && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Quantity Change (+ add / - subtract)
              </label>
              <input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 tabular-nums text-sm font-semibold"
              />
              <div className="text-[11px] text-slate-400 mt-1">
                New balance will be:{' '}
                <strong className="text-slate-700">
                  {Math.max(0, adjustItem.stockOnHand + (Number(adjustDelta) || 0))} {adjustItem.unit}
                </strong>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Audit Note</label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  adjustStock(adjustItem.stockCode, Number(adjustDelta) || 0, adjustNote);
                  setAdjustItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
