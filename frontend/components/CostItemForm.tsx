'use client';

import { useState, useEffect } from 'react';
import { costsAPI, productsAPI, scenariosAPI } from '@/lib/api';
import type { CostItem, Product, CostScenario } from '@/types';

interface CostItemFormProps {
  costItem?: CostItem;
  products: Product[];
  scenarios: CostScenario[];
  initialProductId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CostItemForm({ costItem, products, scenarios, initialProductId, onSuccess, onCancel }: CostItemFormProps) {
  const [productId, setProductId] = useState(costItem?.product_id || initialProductId || products[0]?.id || '');
  const [scenarioId, setScenarioId] = useState(costItem?.scenario_id || scenarios[0]?.id || '');
  const [name, setName] = useState(costItem?.name || '');
  const [amount, setAmount] = useState(costItem?.amount?.toString() || '');
  const [description, setDescription] = useState(costItem?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const costData = {
        product_id: productId,
        scenario_id: scenarioId,
        name,
        amount: parseFloat(amount),
        description: description || undefined,
        currency: 'USD',
      };

      if (costItem) {
        await costsAPI.update(costItem.id, costData);
      } else {
        await costsAPI.create(costData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cost item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px' }}>{costItem ? 'Edit Cost Item' : 'Create Cost Item'}</h3>
      
      {error && (
        <div className="error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Product *
        </label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          disabled={!!costItem || !!initialProductId || products.length === 1}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: (!!costItem || !!initialProductId || products.length === 1) ? '#f5f5f5' : '#fff',
          }}
        >
          <option value="">Select a product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Scenario *
        </label>
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <option value="">Select a scenario</option>
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Amount (USD) *
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim() || !amount || parseFloat(amount) <= 0}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: loading || !name.trim() || !amount ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !name.trim() || !amount ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving...' : costItem ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

