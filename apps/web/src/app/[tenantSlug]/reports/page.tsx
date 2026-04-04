// Reports page — 5 tabs: Stock Movements, Low Stock, Inventory, Product History, Audit Trail

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc';
import { downloadCsv } from '@/lib/csv-export';

type Tab = 'movements' | 'lowStock' | 'inventory' | 'productHistory' | 'auditTrail';

const MOVEMENT_TYPES = ['', 'stock_in', 'stock_out', 'adjustment'] as const;

const ENTITY_TYPES = [
  '',
  'Product',
  'Supplier',
  'StockIn',
  'StockOut',
  'StockAdjustment',
  'User',
] as const;

export default function ReportsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('movements');

  // Stock Movements filters
  const [mvPage, setMvPage] = useState(1);
  const [mvType, setMvType] = useState('');
  const [mvStart, setMvStart] = useState('');
  const [mvEnd, setMvEnd] = useState('');
  // Inventory filters
  const [invPage, setInvPage] = useState(1);
  const [invSearch, setInvSearch] = useState('');
  const [invSearchInput, setInvSearchInput] = useState('');
  const [invCategory] = useState('');

  // Product History
  const [phProductId, setPhProductId] = useState('');
  const [phPage, setPhPage] = useState(1);

  // Audit Trail filters
  const [atPage, setAtPage] = useState(1);
  const [atEntityType, setAtEntityType] = useState('');
  const [atStart, setAtStart] = useState('');
  const [atEnd, setAtEnd] = useState('');

  // Low Stock
  const [lsPage, setLsPage] = useState(1);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: movements, isLoading: movementsLoading } = trpc.report.stockMovements.useQuery(
    {
      page: mvPage,
      limit: 50,
      movementType: mvType.length > 0 ? (mvType as 'stock_in' | 'stock_out' | 'adjustment') : undefined,
      startDate: mvStart.length > 0 ? new Date(mvStart).toISOString() : undefined,
      endDate: mvEnd.length > 0 ? new Date(mvEnd + 'T23:59:59').toISOString() : undefined,
    },
    { enabled: activeTab === 'movements' },
  );

  const { data: lowStock, isLoading: lowStockLoading } = trpc.report.lowStock.useQuery(
    { page: lsPage, limit: 50 },
    { enabled: activeTab === 'lowStock' },
  );

  const { data: inventory, isLoading: inventoryLoading } = trpc.report.inventorySnapshot.useQuery(
    { page: invPage, limit: 50, search: invSearch.length > 0 ? invSearch : undefined, category: invCategory.length > 0 ? invCategory : undefined },
    { enabled: activeTab === 'inventory' },
  );

  const { data: products } = trpc.product.list.useQuery(
    { page: 1, limit: 200 },
    { enabled: activeTab === 'productHistory' },
  );

  const { data: productHistory, isLoading: phLoading } = trpc.report.stockMovements.useQuery(
    { page: phPage, limit: 50, productId: phProductId.length > 0 ? phProductId : undefined },
    { enabled: activeTab === 'productHistory' && phProductId.length > 0 },
  );

  const { data: auditLogs, isLoading: auditLoading } = trpc.auditLog.list.useQuery(
    {
      page: atPage,
      limit: 50,
      entityType: atEntityType.length > 0 ? atEntityType : undefined,
      startDate: atStart.length > 0 ? new Date(atStart).toISOString() : undefined,
      endDate: atEnd.length > 0 ? new Date(atEnd + 'T23:59:59').toISOString() : undefined,
    },
    { enabled: activeTab === 'auditTrail' && isAdmin },
  );

  // ── Export helpers ────────────────────────────────────────────────────────

  const exportMovements = () => {
    if (movements?.items === undefined || movements.items.length === 0) return;
    downloadCsv(
      movements.items.map((m) => ({
        date: new Date(m.performedAt).toLocaleString(),
        productCode: m.product?.productCode ?? '',
        productName: m.product?.name ?? '',
        type: m.movementType,
        change: m.quantityDelta,
        before: m.quantityBefore,
        after: m.quantityAfter,
        performedBy: m.performedByUser?.name ?? m.performedByUserId,
      })),
      [
        { key: 'date', header: 'Date' },
        { key: 'productCode', header: 'Product Code' },
        { key: 'productName', header: 'Product Name' },
        { key: 'type', header: 'Type' },
        { key: 'change', header: 'Change' },
        { key: 'before', header: 'Qty Before' },
        { key: 'after', header: 'Qty After' },
        { key: 'performedBy', header: 'Performed By' },
      ],
      `stock-movements-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const lowStockItems = (lowStock?.items ?? []) as Array<{
    id: string;
    name: string;
    productCode: string;
    currentQuantity: number;
    lowStockThreshold: number;
    unit: string;
    category: string;
  }>;

  const exportLowStock = () => {
    if (lowStockItems.length === 0) return;
    downloadCsv(
      lowStockItems.map((p) => ({
        productCode: p.productCode,
        name: p.name,
        category: p.category,
        unit: p.unit,
        currentQuantity: p.currentQuantity,
        threshold: p.lowStockThreshold,
      })),
      [
        { key: 'productCode', header: 'Product Code' },
        { key: 'name', header: 'Product Name' },
        { key: 'category', header: 'Category' },
        { key: 'unit', header: 'Unit' },
        { key: 'currentQuantity', header: 'Current Qty' },
        { key: 'threshold', header: 'Low Stock Threshold' },
      ],
      `low-stock-report-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const exportInventory = () => {
    if (inventory?.items === undefined || inventory.items.length === 0) return;
    downloadCsv(
      inventory.items.map((p) => ({
        productCode: p.productCode,
        name: p.name,
        category: p.category ?? '',
        unit: p.unit,
        currentQuantity: p.currentQuantity,
        threshold: p.lowStockThreshold,
        sellingPrice: p.sellingPrice,
        inventoryValue: p.inventoryValue,
        status: p.isLowStock ? 'Low Stock' : 'OK',
      })),
      [
        { key: 'productCode', header: 'Product Code' },
        { key: 'name', header: 'Name' },
        { key: 'category', header: 'Category' },
        { key: 'unit', header: 'Unit' },
        { key: 'currentQuantity', header: 'Current Qty' },
        { key: 'threshold', header: 'Threshold' },
        { key: 'sellingPrice', header: 'Selling Price' },
        { key: 'inventoryValue', header: 'Inventory Value' },
        { key: 'status', header: 'Status' },
      ],
      `inventory-snapshot-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  // ── Tab button ────────────────────────────────────────────────────────────

  const tabBtn = (tab: Tab, label: string) => (
    <button
      type="button"
      onClick={() => { setActiveTab(tab); }}
      className={`px-4 py-2 text-sm font-medium ${
        activeTab === tab
          ? 'border-b-2 border-primary text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  // ── Pagination ────────────────────────────────────────────────────────────

  const Pagination = ({
    page,
    totalPages,
    onPrev,
    onNext,
  }: {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex gap-2 overflow-x-auto border-b border-border">
        {tabBtn('movements', 'Stock Movements')}
        {tabBtn('lowStock', 'Low Stock')}
        {tabBtn('inventory', 'Inventory')}
        {tabBtn('productHistory', 'Product History')}
        {isAdmin && tabBtn('auditTrail', 'Audit Trail')}
      </div>

      {/* ── Stock Movements ────────────────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                value={mvType}
                onChange={(e) => { setMvType(e.target.value); setMvPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                {MOVEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t === '' ? 'All Types' : t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input
                type="date"
                value={mvStart}
                onChange={(e) => { setMvStart(e.target.value); setMvPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                value={mvEnd}
                onChange={(e) => { setMvEnd(e.target.value); setMvPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={exportMovements}
                disabled={movements?.items === undefined || movements.items.length === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {movementsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Change</th>
                    <th className="px-4 py-3 text-right font-medium">Before</th>
                    <th className="px-4 py-3 text-right font-medium">After</th>
                    <th className="px-4 py-3 text-left font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {(movements?.items ?? []).map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.performedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{log.product?.name ?? ''}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {log.product?.productCode ?? ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.movementType === 'stock_in'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : log.movementType === 'stock_out'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {log.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        log.quantityDelta > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.quantityDelta > 0 ? '+' : ''}{log.quantityDelta}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{log.quantityBefore}</td>
                      <td className="px-4 py-3 text-right">{log.quantityAfter}</td>
                      <td className="px-4 py-3 text-xs">{log.performedByUser?.name ?? log.performedByUserId}</td>
                    </tr>
                  ))}
                  {(movements?.items ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No stock movements found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {(movements?.totalPages ?? 1) > 1 && (
                <Pagination
                  page={mvPage}
                  totalPages={movements?.totalPages ?? 1}
                  onPrev={() => { setMvPage((p) => p - 1); }}
                  onNext={() => { setMvPage((p) => p + 1); }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Low Stock ─────────────────────────────────────────────────────── */}
      {activeTab === 'lowStock' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Low Stock Items</h2>
            <button
              type="button"
              onClick={exportLowStock}
              disabled={lowStockItems.length === 0}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          {lowStockLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Product Code</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Unit</th>
                    <th className="px-4 py-3 text-right font-medium">Current Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{item.productCode}</td>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {item.currentQuantity}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.lowStockThreshold}
                      </td>
                    </tr>
                  ))}
                  {lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No low stock items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {(lowStock?.totalPages ?? 1) > 1 && (
                <Pagination
                  page={lsPage}
                  totalPages={lowStock?.totalPages ?? 1}
                  onPrev={() => { setLsPage((p) => p - 1); }}
                  onNext={() => { setLsPage((p) => p + 1); }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Inventory Snapshot ────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setInvSearch(invSearchInput);
                setInvPage(1);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Search by name or code…"
                value={invSearchInput}
                onChange={(e) => { setInvSearchInput(e.target.value); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-56"
              />
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Search
              </button>
              {invSearch.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setInvSearchInput(''); setInvSearch(''); setInvPage(1); }}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Clear
                </button>
              )}
            </form>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={exportInventory}
                disabled={inventory?.items === undefined || inventory.items.length === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          {inventoryLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Product Code</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Unit</th>
                    <th className="px-4 py-3 text-right font-medium">Current Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Selling Price</th>
                    <th className="px-4 py-3 text-right font-medium">Inventory Value</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventory?.items ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{p.productCode}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.unit}</td>
                      <td className="px-4 py-3 text-right">{p.currentQuantity}</td>
                      <td className="px-4 py-3 text-right">
                        ₱{p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₱{p.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.isLowStock ? (
                          <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(inventory?.items ?? []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {(inventory?.totalPages ?? 1) > 1 && (
                <Pagination
                  page={invPage}
                  totalPages={inventory?.totalPages ?? 1}
                  onPrev={() => { setInvPage((p) => p - 1); }}
                  onNext={() => { setInvPage((p) => p + 1); }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Product History ───────────────────────────────────────────────── */}
      {activeTab === 'productHistory' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Select Product</label>
              <select
                value={phProductId}
                onChange={(e) => { setPhProductId(e.target.value); setPhPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm min-w-64"
              >
                <option value="">— choose a product —</option>
                {(products?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.productCode}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {phProductId === '' ? (
            <div className="rounded-lg border border-border py-12 text-center text-muted-foreground">
              Select a product above to view its movement history
            </div>
          ) : phLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Change</th>
                    <th className="px-4 py-3 text-right font-medium">Before</th>
                    <th className="px-4 py-3 text-right font-medium">After</th>
                    <th className="px-4 py-3 text-left font-medium">Reference</th>
                    <th className="px-4 py-3 text-left font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {(productHistory?.items ?? []).map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.performedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.movementType === 'stock_in'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : log.movementType === 'stock_out'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {log.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        log.quantityDelta > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.quantityDelta > 0 ? '+' : ''}{log.quantityDelta}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{log.quantityBefore}</td>
                      <td className="px-4 py-3 text-right">{log.quantityAfter}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.referenceType}/{log.referenceId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.performedByUser?.name ?? log.performedByUserId}
                      </td>
                    </tr>
                  ))}
                  {(productHistory?.items ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No movement history for this product
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {(productHistory?.totalPages ?? 1) > 1 && (
                <Pagination
                  page={phPage}
                  totalPages={productHistory?.totalPages ?? 1}
                  onPrev={() => { setPhPage((p) => p - 1); }}
                  onNext={() => { setPhPage((p) => p + 1); }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Trail ───────────────────────────────────────────────────── */}
      {activeTab === 'auditTrail' && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
              <select
                value={atEntityType}
                onChange={(e) => { setAtEntityType(e.target.value); setAtPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t === '' ? 'All Types' : t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input
                type="date"
                value={atStart}
                onChange={(e) => { setAtStart(e.target.value); setAtPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                value={atEnd}
                onChange={(e) => { setAtEnd(e.target.value); setAtPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {auditLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Actor</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Entity</th>
                    <th className="px-4 py-3 text-left font-medium">Entity ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditLogs?.items ?? []).map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.actorUser?.name ?? log.actorUserId}
                        {log.actorUser?.email !== undefined && (
                          <span className="block text-muted-foreground">{log.actorUser.email}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.actionType === 'CREATE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : log.actionType === 'DELETE'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{log.entityType}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.entityId.slice(0, 12)}…
                      </td>
                    </tr>
                  ))}
                  {(auditLogs?.items ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No audit log entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {(auditLogs?.totalPages ?? 1) > 1 && (
                <Pagination
                  page={atPage}
                  totalPages={auditLogs?.totalPages ?? 1}
                  onPrev={() => { setAtPage((p) => p - 1); }}
                  onNext={() => { setAtPage((p) => p + 1); }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
