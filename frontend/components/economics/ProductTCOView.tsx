'use client';

import { useState, useEffect } from 'react';
import { productsAPI } from '@/lib/api';
import type { Product, TCOBreakdown } from '@/types';

interface ProductTCOViewProps {
  product: Product;
}

export default function ProductTCOView({ product }: ProductTCOViewProps) {
  const [tcoData, setTcoData] = useState<TCOBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriodMonths, setTimePeriodMonths] = useState(12);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTCO();
  }, [product.id, timePeriodMonths]);

  const loadTCO = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsAPI.getTCOBreakdown(product.id, timePeriodMonths);
      setTcoData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load TCO data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTCO = async () => {
    setUpdating(true);
    setError(null);
    try {
      await productsAPI.updateTCO(product.id, timePeriodMonths);
      await loadTCO();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update TCO');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading TCO data...</div>;
  }

  if (error) {
    return (
      <div style={{ 
        padding: '16px',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '6px',
        color: '#c33',
        marginBottom: '16px'
      }}>
        {error}
      </div>
    );
  }

  if (!tcoData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        No TCO data available. Click "Calculate TCO" to compute.
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <h3 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 20px)' }}>
          Total Cost of Ownership (TCO)
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            Period (months):
            <input
              type="number"
              min="1"
              max="60"
              value={timePeriodMonths}
              onChange={(e) => setTimePeriodMonths(parseInt(e.target.value) || 12)}
              style={{
                width: '80px',
                padding: '6px 8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
          <button
            onClick={handleUpdateTCO}
            disabled={updating}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: updating ? '#ccc' : '#28a745',
              color: '#fff',
              cursor: updating ? 'not-allowed' : 'pointer',
            }}
          >
            {updating ? 'Updating...' : 'Calculate TCO'}
          </button>
        </div>
      </div>

      <div style={{ 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '2px solid #007bff'
      }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          Total TCO ({timePeriodMonths} months)
        </div>
        <div style={{ fontSize: '36px', fontWeight: 700, color: '#007bff' }}>
          {tcoData.currency} {tcoData.total_tco.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {tcoData.calculated_at && (
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            Last calculated: {new Date(tcoData.calculated_at).toLocaleString()}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Breakdown by Category</h4>
          {Object.entries(tcoData.breakdown || {}).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(tcoData.breakdown).map(([category, amount]) => (
                <div key={category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{category}:</span>
                  <strong>{tcoData.currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: '14px' }}>No category breakdown available</div>
          )}
        </div>

        <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Breakdown by Scope</h4>
          {Object.entries(tcoData.breakdown_by_scope || {}).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(tcoData.breakdown_by_scope).map(([scope, amount]) => (
                <div key={scope} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{scope}:</span>
                  <strong>{tcoData.currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: '14px' }}>No scope breakdown available</div>
          )}
        </div>

        <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Breakdown by Cost Type</h4>
          {Object.entries(tcoData.breakdown_by_cost_type || {}).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(tcoData.breakdown_by_cost_type).map(([costType, amount]) => (
                <div key={costType} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{costType}:</span>
                  <strong>{tcoData.currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: '14px' }}>No cost type breakdown available</div>
          )}
        </div>
      </div>

      {tcoData.costs && tcoData.costs.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '18px' }}>Cost Details</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Scope</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Period Cost</th>
                </tr>
              </thead>
              <tbody>
                {tcoData.costs.map((cost) => (
                  <tr key={cost.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{cost.name}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize' }}>{String(cost.scope)}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize' }}>{String(cost.category)}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize' }}>{String(cost.cost_type)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {cost.currency} {cost.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                      {cost.currency} {cost.period_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

