'use client';

import { useState, useEffect } from 'react';
import { prioritizationModelsAPI } from '@/lib/api';
import type { PrioritizationModel, Product, PrioritizationModelType, AppliesTo } from '@/types';
import Modal from '../Modal';

interface PrioritizationModelFormProps {
  model?: PrioritizationModel;
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PrioritizationModelForm({ model, product, onSuccess, onCancel }: PrioritizationModelFormProps) {
  const [name, setName] = useState(model?.name || '');
  const [type, setType] = useState<PrioritizationModelType>(model?.type || 'rice');
  const [appliesTo, setAppliesTo] = useState<AppliesTo>(model?.applies_to || 'feature');
  const [isActive, setIsActive] = useState(model?.is_active ?? true);
  const [criteria, setCriteria] = useState<string>(JSON.stringify(model?.criteria || {}, null, 2));
  const [weights, setWeights] = useState<string>(JSON.stringify(model?.weights || {}, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let parsedCriteria = {};
      let parsedWeights = {};
      
      try {
        parsedCriteria = criteria ? JSON.parse(criteria) : {};
      } catch (e) {
        throw new Error('Invalid JSON in criteria field');
      }
      
      try {
        parsedWeights = weights ? JSON.parse(weights) : {};
      } catch (e) {
        throw new Error('Invalid JSON in weights field');
      }

      const modelData = {
        product_id: product.id,
        name,
        type,
        applies_to: appliesTo,
        is_active: isActive,
        criteria: parsedCriteria,
        weights: Object.keys(parsedWeights).length > 0 ? parsedWeights : undefined,
        version: model?.version || 1,
      };

      if (model) {
        await prioritizationModelsAPI.update(model.id, modelData);
      } else {
        await prioritizationModelsAPI.create(modelData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prioritization model');
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
          {model ? 'Edit Prioritization Model' : 'Create Prioritization Model'}
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

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Type *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PrioritizationModelType)}
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
          <option value="rice">RICE</option>
          <option value="ice">ICE</option>
          <option value="value_effort">Value vs Effort</option>
          <option value="kano">Kano</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Applies To *
        </label>
        <select
          value={appliesTo}
          onChange={(e) => setAppliesTo(e.target.value as AppliesTo)}
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
          <option value="problem">Problem</option>
          <option value="feature">Feature</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Criteria (JSON) *
        </label>
        <textarea
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          required
          rows={6}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
          }}
          placeholder='{"reach": "number", "impact": "number", ...}'
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Weights (JSON, optional)
        </label>
        <textarea
          value={weights}
          onChange={(e) => setWeights(e.target.value)}
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
          placeholder='{"reach": 0.25, "impact": 0.25, ...}'
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

