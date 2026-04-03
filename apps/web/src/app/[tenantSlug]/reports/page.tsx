// Reports page — low stock alerts, movement history, CSV export

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { downloadCsv } from '@/lib/csv-export';

type Tab = 'movements' | 'lowStock';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('movements');

  const { data: movements, isLoading: movementsLoading } = trpc.report.stockMovements.useQuery({
    page: 1,
    limit: 100,
  });

  const { data: lowStock, isLoading: lowStockLoading } = trpc.report.lowStock.useQuery({
    page: 1,
    limit: 100,
  });

  const exportMovements = () => {
    if (movements?.items === undefined) return;
    downloadCsv(
      movements.items.map((m) => ({
        date: new Date(m.performedAt).toLocaleString(),
        productId: m.productId,
        productName: m.product?.name ?? '',
        productCode: m.product?.productCode ?? '',
        type: m.movementType,
        change: m.quantityDelta,
        after: m.quantityAfter,
        performedBy: m.performedByUser?.name ?? m.performedByUserId,
      })),
      [
        { key: 'date', header: 'Date' },
        { key: 'productCode', header: 'Product Code' },
        { key: 'productName', header: 'Product Name' },
        { key: 'type', header: 'Movement Type' },
        { key: 'change', header: 'Quantity Change' },
        { key: 'after', header: 'Quantity After' },
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => { setActiveTab('movements'); }}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'movements'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Stock Movements
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('lowStock'); }}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'lowStock'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Low Stock
        </button>
      </div>

      {activeTab === 'movements' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Stock Movements</h2>
            <button
              type="button"
              onClick={exportMovements}
              disabled={movements?.items === undefined || movements.items.length === 0}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          {movementsLoading ? (
            <div>Loading reports...</div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Change</th>
                    <th className="px-4 py-3 text-right font-medium">After</th>
                    <th className="px-4 py-3 text-left font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements?.items.map((log) => (
                    <tr key={log.id} className="border-b border-border">
                      <td className="px-4 py-3 text-xs">{new Date(log.performedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{log.product?.name ?? ''}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {log.product?.productCode ?? ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.movementType === 'stock_in' ? 'bg-green-100 text-green-800' :
                          log.movementType === 'stock_out' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.movementType}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        log.quantityDelta > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.quantityDelta > 0 ? '+' : ''}{log.quantityDelta}
                      </td>
                      <td className="px-4 py-3 text-right">{log.quantityAfter}</td>
                      <td className="px-4 py-3 text-sm">{log.performedByUser?.name ?? log.performedByUserId}</td>
                    </tr>
                  ))}
                  {movements?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No stock movements yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'lowStock' && (
        <>
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
            <div>Loading low stock report...</div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Product Code</th>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Current Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-3 font-mono text-xs">{item.productCode}</td>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{item.currentQuantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.lowStockThreshold}</td>
                    </tr>
                  ))}
                  {lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No low stock items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
