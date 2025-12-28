'use client';

import { useState, useEffect } from 'react';
import { pricingTiersAPI, revenueModelsAPI } from '@/lib/api';
import type { PricingTier, Product, RevenueModel } from '@/types';
import Modal from '../Modal';

interface PricingTierFormProps {
  tier?: PricingTier;
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PricingTierForm({ tier, product, onSuccess, onCancel }: PricingTierFormProps) {
  const [name, setName] = useState(tier?.name || '');
  const [revenueModelId, setRevenueModelId] = useState(tier?.revenue_model_id || '');
  const [price, setPrice] = useState(tier?.price?.toString() || '0');
  const [currency, setCurrency] = useState(tier?.currency || 'USD');
  const [billingPeriod, setBillingPeriod] = useState(tier?.billing_period || 'monthly');
  const [features, setFeatures] = useState<string>(JSON.stringify(tier?.features || [], null, 2));
  const [limits, setLimits] = useState<string>(JSON.stringify(tier?.limits || {}, null, 2));
  const [overageRules, setOverageRules] = useState<string>(JSON.stringify(tier?.overage_rules || {}, null, 2));
  const [description, setDescription] = useState(tier?.description || '');
  const [revenueModels, setRevenueModels] = useState<RevenueModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRevenueModels();
  }, []);

  const loadRevenueModels = async () => {
    try {
      const data = await revenueModelsAPI.getAll({ product_id: product.id });
      setRevenueModels(data);
    } catch (err) {
      console.error('Failed to load revenue models:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let parsedFeatures: string[] = [];
      let parsedLimits: Record<string, any> = {};
      let parsedOverageRules: Record<string, any> = {};
      
      try {
        parsedFeatures = features ? JSON.parse(features) : [];
      } catch (e) {
        throw new Error('Invalid JSON in features field');
      }
      
      try {
        parsedLimits = limits ? JSON.parse(limits) : {};
      } catch (e) {
        throw new Error('Invalid JSON in limits field');
      }
      
      try {
        parsedOverageRules = overageRules ? JSON.parse(overageRules) : {};
      } catch (e) {
        throw new Error('Invalid JSON in overage rules field');
      }

      const tierData = {
        product_id: product.id,
        name,
        revenue_model_id: revenueModelId || undefined,
        price: parseFloat(price),
        currency,
        billing_period: billingPeriod || undefined,
        features: parsedFeatures,
        limits: Object.keys(parsedLimits).length > 0 ? parsedLimits : undefined,
        overage_rules: Object.keys(parsedOverageRules).length > 0 ? parsedOverageRules : undefined,
        description: description || undefined,
      };

      if (tier) {
        await pricingTiersAPI.update(tier.id, tierData);
      } else {
        await pricingTiersAPI.create(tierData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing tier');
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
          {tier ? 'Edit Pricing Tier' : 'Create Pricing Tier'}
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
          Revenue Model (optional)
        </label>
        <select
          value={revenueModelId}
          onChange={(e) => setRevenueModelId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        >
          <option value="">None</option>
          {revenueModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.model_type} - {model.description || 'No description'}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Price *
          </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
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

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Billing Period
          </label>
          <select
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="one-time">One-time</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Features (JSON array)
        </label>
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
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
          placeholder='["Feature 1", "Feature 2", ...]'
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Limits (JSON object)
        </label>
        <textarea
          value={limits}
          onChange={(e) => setLimits(e.target.value)}
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
          placeholder='{"users": 10, "storage": "100GB", ...}'
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Overage Rules (JSON object)
        </label>
        <textarea
          value={overageRules}
          onChange={(e) => setOverageRules(e.target.value)}
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
          placeholder='{"storage": "$0.10/GB", "api_calls": "$0.01/1000", ...}'
        />
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
          {loading ? 'Saving...' : (tier ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

