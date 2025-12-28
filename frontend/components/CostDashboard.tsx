'use client';

import { useEffect, useState } from 'react';
import { costsAPI, productsAPI } from '@/lib/api';
import type { CostItem, Product, CostTotals, CostScenario } from '@/types';
import CostItemForm from './CostItemForm';
import Modal from './Modal';

interface CostDashboardProps {
  productId: string;
  products: Product[];
  scenarios: CostScenario[];
  onUpdate?: () => void;
}

export default function CostDashboard({ productId, products, scenarios, onUpdate }: CostDashboardProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [totals, setTotals] = useState<CostTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [productData, costsData, totalsData] = await Promise.all([
        productsAPI.getById(productId),
        costsAPI.getAll({ product_id: productId }),
        costsAPI.getTotals({ product_id: productId }),
      ]);
      setProduct(productData);
      setCosts(costsData);
      setTotals(totalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cost item?')) {
      return;
    }

    try {
      setDeletingId(id);
      await costsAPI.delete(id);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete cost item');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading cost data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  // Group costs by scenario
  const costsByScenario = costs.reduce((acc, cost) => {
    if (!acc[cost.scenario_id]) {
      acc[cost.scenario_id] = [];
    }
    acc[cost.scenario_id].push(cost);
    return acc;
  }, {} as Record<string, CostItem[]>);

  // Calculate totals by scenario
  const scenarioTotals = Object.entries(costsByScenario).reduce((acc, [scenarioId, items]) => {
    acc[scenarioId] = items.reduce((sum, item) => sum + item.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
        {product?.name} - Cost Breakdown
      </h2>

      {Object.entries(costsByScenario).map(([scenarioId, items]) => {
        const scenarioTotal = scenarioTotals[scenarioId];
        const scenario = scenarios.find((s) => s.id === scenarioId);
        const scenarioName = scenario?.name || scenarioId;

        return (
          <div key={scenarioId} style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', color: '#555' }}>
              {scenarioName}
              <span style={{ marginLeft: '12px', fontSize: '16px', color: '#28a745' }}>
                Total: ${scenarioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cost) => (
                  <tr key={cost.id}>
                    <td>{cost.name}</td>
                    <td className="amount">
                      ${cost.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>{cost.description || '-'}</td>
                    <td style={{ textAlign: 'right', width: '150px' }}>
                      <button
                        onClick={() => setEditingItem(cost)}
                        style={{
                          padding: '4px 12px',
                          fontSize: '12px',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '8px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cost.id)}
                        disabled={deletingId === cost.id}
                        style={{
                          padding: '4px 12px',
                          fontSize: '12px',
                          backgroundColor: deletingId === cost.id ? '#ccc' : '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: deletingId === cost.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {deletingId === cost.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Cost Item"
      >
        {editingItem && (
          <CostItemForm
            costItem={editingItem}
            products={products}
            scenarios={scenarios}
            onSuccess={() => {
              setEditingItem(null);
              loadData();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setEditingItem(null)}
          />
        )}
      </Modal>
    </div>
  );
}

