'use client';

import { useState } from 'react';
import { usageMetricsAPI } from '@/lib/api';
import type { UsageMetric, Product, UsageMetricType } from '@/types';
import Modal from '../Modal';

interface UsageMetricFormProps {
  metric?: UsageMetric;
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UsageMetricForm({ metric, product, onSuccess, onCancel }: UsageMetricFormProps) {
  const [name, setName] = useState(metric?.name || '');
  const [metricType, setMetricType] = useState<UsageMetricType>(metric?.metric_type || 'jobs');
  const [unit, setUnit] = useState(metric?.unit || '');
  const [volume, setVolume] = useState(metric?.volume?.toString() || '0');
  const [targetVolume, setTargetVolume] = useState(metric?.target_volume?.toString() || '');
  const [timePeriod, setTimePeriod] = useState(metric?.time_period || 'monthly');
  const [periodStart, setPeriodStart] = useState(metric?.period_start || '');
  const [periodEnd, setPeriodEnd] = useState(metric?.period_end || '');
  const [description, setDescription] = useState(metric?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const metricData = {
        product_id: product.id,
        name,
        metric_type: metricType,
        unit,
        volume: parseFloat(volume),
        target_volume: targetVolume ? parseFloat(targetVolume) : undefined,
        time_period: timePeriod || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        description: description || undefined,
      };

      if (metric) {
        await usageMetricsAPI.update(metric.id, metricData);
      } else {
        await usageMetricsAPI.create(metricData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save usage metric');
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
          {metric ? 'Edit Usage Metric' : 'Create Usage Metric'}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Metric Type *
          </label>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as UsageMetricType)}
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
            <option value="jobs">Jobs</option>
            <option value="customers">Customers</option>
            <option value="api_calls">API Calls</option>
            <option value="storage">Storage</option>
            <option value="bandwidth">Bandwidth</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Unit *
          </label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
            placeholder="e.g., jobs, GB, calls"
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
            Volume *
          </label>
          <input
            type="number"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
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
            Target Volume
          </label>
          <input
            type="number"
            step="0.01"
            value={targetVolume}
            onChange={(e) => setTargetVolume(e.target.value)}
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
          Time Period
        </label>
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
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
            Period Start
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
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
            Period End
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
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
          {loading ? 'Saving...' : (metric ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

