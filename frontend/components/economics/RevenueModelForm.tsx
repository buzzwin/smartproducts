'use client';

import { useState } from 'react';
import { revenueModelsAPI } from '@/lib/api';
import type { RevenueModel, Product, RevenueModelType } from '@/types';
import Modal from '../Modal';

interface RevenueModelFormProps {
  model?: RevenueModel;
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RevenueModelForm({ model, product, onSuccess, onCancel }: RevenueModelFormProps) {
  const [modelType, setModelType] = useState<RevenueModelType>(model?.model_type || 'subscription');
  const [description, setDescription] = useState(model?.description || '');
  const [baseRevenue, setBaseRevenue] = useState(model?.base_revenue?.toString() || '');
  const [currency, setCurrency] = useState(model?.currency || 'USD');
  const [assumptions, setAssumptions] = useState<string>(JSON.stringify(model?.assumptions || [], null, 2));
  const [isActive, setIsActive] = useState(model?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let parsedAssumptions: string[] = [];
      
      try {
        parsedAssumptions = assumptions ? JSON.parse(assumptions) : [];
      } catch (e) {
        throw new Error('Invalid JSON in assumptions field');
      }

      const modelData = {
        product_id: product.id,
        model_type: modelType,
        description: description || undefined,
        base_revenue: baseRevenue ? parseFloat(baseRevenue) : undefined,
        currency,
        assumptions: parsedAssumptions,
        is_active: isActive,
      };

      if (model) {
        await revenueModelsAPI.update(model.id, modelData);
      } else {
        await revenueModelsAPI.create(modelData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save revenue model');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <h3 style={{ margin: 0, flex: '1 1 200px', fontSize: 'clamp(16px, 4vw, 20px)' }}>
          {model ? 'Edit Revenue Model' : 'Create Revenue Model'}
        </h3>
      </div>
      
      <div style={{ 
        marginBottom: '16px', 
        padding: '12px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '6px',
        fontSize: '14px'
      }}>
        <strong>Product:</strong> {product.name}
      </div>
      
      {error && (
        <div className="error" style={{ 
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Model Type *
        </label>
        <select
          value={modelType}
          onChange={(e) => setModelType(e.target.value as RevenueModelType)}
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        >
          <option value="per_customer">Per Customer</option>
          <option value="per_job">Per Job</option>
          <option value="tiered">Tiered</option>
          <option value="subscription">Subscription</option>
          <option value="usage_based">Usage Based</option>
          <option value="one_time">One Time</option>
          <option value="freemium">Freemium</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Base Revenue
          </label>
          <input
            type="number"
            step="0.01"
            value={baseRevenue}
            onChange={(e) => setBaseRevenue(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Currency *
          </label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Assumptions (JSON array)
        </label>
        <textarea
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
          }}
          placeholder='["Assumption 1", "Assumption 2", ...]'
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontWeight: 500,
          fontSize: '14px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          Active
        </label>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        marginTop: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: '#fff',
            cursor: 'pointer',
            minWidth: '100px'
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            minWidth: '100px'
          }}
        >
          {loading ? 'Saving...' : (model ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

