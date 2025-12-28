'use client';

import { useState, useEffect } from 'react';
import { unifiedCostsAPI, resourcesAPI, modulesAPI } from '@/lib/api';
import type { Cost, Product, Module, CostScope, CostCategory, CostType, CostRecurrence, CostClassification, Resource } from '@/types';
import Modal from '../Modal';

interface CostFormProps {
  cost?: Cost;
  product: Product;
  moduleId?: string;  // Optional - for module-level costs
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CostForm({ cost, product, moduleId, onSuccess, onCancel }: CostFormProps) {
  const [name, setName] = useState<string>(cost?.name || '');
  const [scope, setScope] = useState<CostScope>((cost?.scope as CostScope) || 'product');
  const [scopeId, setScopeId] = useState<string>(cost?.scope_id || '');
  const [category, setCategory] = useState<string>((cost?.category as unknown as string) || 'build');
  const [costType, setCostType] = useState<string>((cost?.cost_type as unknown as string) || 'labor');
  const [amount, setAmount] = useState<string>(cost?.amount?.toString() || '0');
  const [currency, setCurrency] = useState<string>(cost?.currency || 'USD');
  const [recurrence, setRecurrence] = useState<CostRecurrence>((cost?.recurrence as CostRecurrence) || 'monthly');
  const [amortizationPeriod, setAmortizationPeriod] = useState<string>(cost?.amortization_period?.toString() || '');
  const [description, setDescription] = useState<string>(cost?.description || '');
  const [resourceId, setResourceId] = useState<string>(cost?.resource_id || '');
  const [module_id, setModule_id] = useState<string>(cost?.module_id || moduleId || '');
  const [cost_classification, setCost_classification] = useState<string>((cost?.cost_classification as unknown as string) || '');
  const [resources, setResources] = useState<Resource[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
    loadModules();
  }, [product.id]);

  useEffect(() => {
    // If moduleId prop is provided, set it (and disable dropdown)
    if (moduleId && !cost) {
      setModule_id(moduleId);
    }
  }, [moduleId, cost]);

  const loadResources = async () => {
    try {
      const data = await resourcesAPI.getAll();
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  const loadModules = async () => {
    try {
      const data = await modulesAPI.getByProduct(product.id);
      setModules(data);
    } catch (err) {
      console.error('Failed to load modules:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const costData = {
        product_id: product.id,
        module_id: module_id || undefined,
        name,
        scope,
        scope_id: scopeId || undefined,
        category: category as unknown as CostCategory,
        cost_type: costType as unknown as CostType,
        amount: parseFloat(amount),
        currency,
        recurrence: recurrence,
        amortization_period: amortizationPeriod ? parseInt(amortizationPeriod) : undefined,
        description: description || undefined,
        resource_id: resourceId || undefined,
        cost_classification: (cost_classification || undefined) as CostClassification | undefined,
      };

      if (cost) {
        await unifiedCostsAPI.update(cost.id, costData);
      } else {
        await unifiedCostsAPI.create(costData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cost');
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
          {cost ? 'Edit Cost' : 'Create Cost'}
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

      {modules.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Module {moduleId ? '(Pre-selected)' : '(Optional)'}
          </label>
          <select
            value={module_id}
            onChange={(e) => setModule_id(e.target.value)}
            disabled={!!moduleId}  // Disable if moduleId prop is provided
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
              backgroundColor: moduleId ? '#f5f5f5' : '#fff',
            }}
          >
            <option value="">Product-level (no module)</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
          <p style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
            Leave empty for product-level costs, or select a module for module-specific costs.
          </p>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
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
          onChange={(e) => setCost_classification(e.target.value)}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Scope *
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as CostScope)}
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
            <option value="task">Task</option>
            <option value="product">Product</option>
            <option value="shared">Shared</option>
          </select>
        </div>

        {scope !== 'product' && scope !== 'shared' && (
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              fontSize: '14px'
            }}>
              Scope ID
            </label>
            <input
              type="text"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
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
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
            <option value="build">Build</option>
            <option value="run">Run</option>
            <option value="maintain">Maintain</option>
            <option value="scale">Scale</option>
            <option value="overhead">Overhead</option>
          </select>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Cost Type *
          </label>
          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value)}
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
            <option value="labor">Labor</option>
            <option value="infra">Infrastructure</option>
            <option value="license">License</option>
            <option value="vendor">Vendor</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Amount *
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Recurrence *
          </label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as CostRecurrence)}
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
            <option value="one-time">One-time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        {recurrence === 'one-time' && (
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              fontSize: '14px'
            }}>
              Amortization Period (months)
            </label>
            <input
              type="number"
              value={amortizationPeriod}
              onChange={(e) => setAmortizationPeriod(e.target.value)}
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
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Resource (optional)
        </label>
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
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
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name}
            </option>
          ))}
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
          {loading ? 'Saving...' : (cost ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

