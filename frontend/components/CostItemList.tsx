'use client';

import { useState } from 'react';
import { costsAPI } from '@/lib/api';
import type { CostItem, Product, CostScenario } from '@/types';
import CostItemForm from './CostItemForm';
import Modal from './Modal';

interface CostItemListProps {
  costItems: CostItem[];
  products: Product[];
  scenarios: CostScenario[];
  onUpdate: () => void;
}

export default function CostItemList({ costItems, products, scenarios, onUpdate }: CostItemListProps) {
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [filterScenario, setFilterScenario] = useState<string>('');

  const filteredItems = costItems.filter((item) => {
    if (filterProduct && item.product_id !== filterProduct) return false;
    if (filterScenario && item.scenario_id !== filterScenario) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cost item?')) {
      return;
    }

    try {
      setDeletingId(id);
      await costsAPI.delete(id);
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete cost item');
    } finally {
      setDeletingId(null);
    }
  };

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || productId;
  };

  const getScenarioName = (scenarioId: string) => {
    return scenarios.find((s) => s.id === scenarioId)?.name || scenarioId;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Cost Items</h2>
        <button
          onClick={() => setShowCreateModal(true)}
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
          + Add Cost Item
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            flex: 1,
          }}
        >
          <option value="">All Products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <select
          value={filterScenario}
          onChange={(e) => setFilterScenario(e.target.value)}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            flex: 1,
          }}
        >
          <option value="">All Scenarios</option>
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          No cost items found. Create your first cost item!
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Scenario</th>
              <th>Name</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Description</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>{getProductName(item.product_id)}</td>
                <td>{getScenarioName(item.scenario_id)}</td>
                <td>{item.name}</td>
                <td style={{ textAlign: 'right' }} className="amount">
                  ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td>{item.description || '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setEditingItem(item)}
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
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: deletingId === item.id ? '#ccc' : '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Cost Item"
      >
        <CostItemForm
          products={products}
          scenarios={scenarios}
          onSuccess={() => {
            setShowCreateModal(false);
            onUpdate();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

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
              onUpdate();
            }}
            onCancel={() => setEditingItem(null)}
          />
        )}
      </Modal>
    </div>
  );
}

