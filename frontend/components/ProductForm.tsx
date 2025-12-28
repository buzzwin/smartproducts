'use client';

import { useState, useEffect } from 'react';
import { productsAPI } from '@/lib/api';
import type { Product, CostClassification } from '@/types';
import AIAssistant from './AIAssistant';

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [cost_classification, setCost_classification] = useState<CostClassification | ''>(product?.cost_classification || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const productData: any = { name, description };
      if (cost_classification) {
        productData.cost_classification = cost_classification;
      }
      if (product) {
        await productsAPI.update(product.id, productData);
      } else {
        await productsAPI.create(productData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.name) setName(fields.name);
    if (fields.description) setDescription(fields.description);
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
          {product ? 'Edit Product' : 'Create Product'}
        </h3>
        {!product && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="product"
              context={{ product }}
              onFillFields={handleAIFill}
            />
          </div>
        )}
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
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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

      <div style={{ marginBottom: '20px' }}>
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
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Cost Classification (Optional)
        </label>
        <select
          value={cost_classification}
          onChange={(e) => setCost_classification(e.target.value as CostClassification | '')}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        >
          <option value="">Not specified</option>
          <option value="run">Run/KTLO (Keep The Lights On)</option>
          <option value="change">Change/Growth (New Feature Development)</option>
        </select>
        <p style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
          Run/KTLO = Ongoing maintenance. Change/Growth = New feature development.
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        flexWrap: 'wrap'
      }}>
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
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            minWidth: '80px',
            flex: '1 1 auto',
            maxWidth: '150px',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: loading || !name.trim() ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
            minWidth: '80px',
            flex: '1 1 auto',
            maxWidth: '150px',
          }}
        >
          {loading ? 'Saving...' : product ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

