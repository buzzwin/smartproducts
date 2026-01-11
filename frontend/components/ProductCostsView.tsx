'use client';

import { useState, useEffect } from 'react';
import { productsAPI, unifiedCostsAPI } from '@/lib/api';
import type { Product, Cost } from '@/types';
import CostForm from './economics/CostForm';
import Modal from './Modal';
import { exportCostsReportToPDF } from '@/lib/exportUtils';

interface ProductCostsViewProps {
  onUpdate?: () => void;
}

export default function ProductCostsView({ onUpdate }: ProductCostsViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [costsByProduct, setCostsByProduct] = useState<Record<string, Cost[]>>({});
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<{ cost: Cost; product: Product } | null>(null);
  const [showCreateCost, setShowCreateCost] = useState<{ product: Product } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productsData, allCosts] = await Promise.all([
        productsAPI.getAll(),
        unifiedCostsAPI.getAll(),
      ]);
      
      setProducts(productsData);
      
      // Group costs by product
      const costsByProd: Record<string, Cost[]> = {};
      productsData.forEach(product => {
        costsByProd[product.id] = allCosts.filter(c => c.product_id === product.id);
      });
      setCostsByProduct(costsByProd);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (costId: string) => {
    if (!confirm('Are you sure you want to delete this cost?')) {
      return;
    }
    try {
      setDeletingId(costId);
      await unifiedCostsAPI.delete(costId);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete cost');
    } finally {
      setDeletingId(null);
    }
  };

  const getTotalCost = (costs: Cost[]): number => {
    return costs.reduce((sum, cost) => sum + cost.amount, 0);
  };

  const getCostsByScope = (costs: Cost[]): Record<string, Cost[]> => {
    const byScope: Record<string, Cost[]> = {};
    costs.forEach(cost => {
      const scopeKey = String(cost.scope);
      if (!byScope[scopeKey]) {
        byScope[scopeKey] = [];
      }
      byScope[scopeKey].push(cost);
    });
    return byScope;
  };

  const getCostsByCategory = (costs: Cost[]): Record<string, Cost[]> => {
    const byCategory: Record<string, Cost[]> = {};
    costs.forEach(cost => {
      const categoryKey = String(cost.category);
      if (!byCategory[categoryKey]) {
        byCategory[categoryKey] = [];
      }
      byCategory[categoryKey].push(cost);
    });
    return byCategory;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading products and costs...</div>
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

  if (products.length === 0) {
    return (
      <div className="card">
        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          No products available. Create a product first to manage costs.
        </p>
      </div>
    );
  }

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const productCosts = selectedProduct ? (costsByProduct[selectedProductId] || []) : [];
  const totalCost = getTotalCost(productCosts);
  const costsByScope = getCostsByScope(productCosts);
  const costsByCategory = getCostsByCategory(productCosts);

  return (
    <div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Product Costs</h2>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div>
            <h3 style={{ marginBottom: '10px', fontSize: '18px', color: '#333' }}>{selectedProduct.name}</h3>
            {selectedProduct.description && (
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>{selectedProduct.description}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Cost of Ownership</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#007bff' }}>
                  ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (selectedProduct && productCosts.length > 0) {
                      exportCostsReportToPDF(selectedProduct, productCosts);
                    } else {
                      alert('No costs to export. Please add costs first.');
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Export PDF
                </button>
                <button
                  onClick={() => setShowCreateCost({ product: selectedProduct })}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  + Add Cost
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="card">
          {productCosts.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              No costs yet. Add your first cost for {selectedProduct.name}!
            </p>
          ) : (
            <div>
              {Object.entries(costsByCategory).map(([category, categoryCosts]) => {
                const categoryTotal = getTotalCost(categoryCosts);
                
                return (
                  <div key={category} style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#333', textTransform: 'capitalize' }}>{category}</h4>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#007bff' }}>
                        {categoryCosts[0]?.currency || 'USD'} {categoryTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
                          <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Name</th>
                          <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Scope</th>
                          <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Type</th>
                          <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#666' }}>Amount</th>
                          <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#666' }}>Recurrence</th>
                          <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#666', width: '120px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryCosts.map((cost) => (
                          <tr key={cost.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '10px', fontWeight: 500 }}>{cost.name}</td>
                            <td style={{ padding: '10px', color: '#666', textTransform: 'capitalize' }}>{String(cost.scope)}</td>
                            <td style={{ padding: '10px', color: '#666', textTransform: 'capitalize' }}>{String(cost.cost_type)}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#007bff' }}>
                              {cost.currency} {cost.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '10px', color: '#666', textTransform: 'capitalize' }}>
                              {String(cost.recurrence || '-')}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              <button
                                onClick={() => setEditingCost({ cost, product: selectedProduct })}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  backgroundColor: '#007bff',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  marginRight: '5px',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(cost.id)}
                                disabled={deletingId === cost.id}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  backgroundColor: deletingId === cost.id ? '#ccc' : '#dc3545',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: deletingId === cost.id ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {deletingId === cost.id ? '...' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Cost Modal */}
      <Modal
        isOpen={!!showCreateCost}
        onClose={() => setShowCreateCost(null)}
        title="Create Cost"
      >
        {showCreateCost && (
          <CostForm
            cost={undefined}
            product={showCreateCost.product}
            onSuccess={() => {
              setShowCreateCost(null);
              loadData();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setShowCreateCost(null)}
          />
        )}
      </Modal>

      {/* Edit Cost Modal */}
      <Modal
        isOpen={!!editingCost}
        onClose={() => setEditingCost(null)}
        title="Edit Cost"
      >
        {editingCost && (
          <CostForm
            cost={editingCost.cost}
            product={editingCost.product}
            onSuccess={() => {
              setEditingCost(null);
              loadData();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setEditingCost(null)}
          />
        )}
      </Modal>
    </div>
  );
}

