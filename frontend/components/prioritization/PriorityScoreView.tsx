'use client';

import { useState, useEffect } from 'react';
import { priorityScoresAPI } from '@/lib/api';
import type { PriorityScore, Product } from '@/types';

interface PriorityScoreViewProps {
  product: Product;
  entityType?: string;
  entityId?: string;
}

export default function PriorityScoreView({ product, entityType, entityId }: PriorityScoreViewProps) {
  const [scores, setScores] = useState<PriorityScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScores();
  }, [product.id, entityType, entityId]);

  const loadScores = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { product_id: product.id };
      if (entityType) params.entity_type = entityType;
      if (entityId) params.entity_id = entityId;
      const data = await priorityScoresAPI.getAll(params);
      setScores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load priority scores');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading priority scores...</div>;
  }

  if (error) {
    return (
      <div style={{ 
        padding: '16px',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '6px',
        color: '#c33'
      }}>
        {error}
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        No priority scores found
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
      <h3 style={{ marginBottom: '20px', fontSize: 'clamp(16px, 4vw, 20px)' }}>
        Priority Scores
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {scores.map((score) => (
          <div
            key={score.id}
            style={{
              padding: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {score.entity_type}: {score.entity_id}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Version {score.version} • {new Date(score.calculated_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 700,
                color: score.score >= 0.7 ? '#28a745' : score.score >= 0.4 ? '#ffc107' : '#dc3545'
              }}>
                {score.score.toFixed(2)}
              </div>
            </div>
            
            {score.confidence !== undefined && (
              <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                <strong>Confidence:</strong> {(score.confidence * 100).toFixed(0)}%
              </div>
            )}
            
            {score.inputs && Object.keys(score.inputs).length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Inputs:</strong>
                <div style={{ 
                  padding: '8px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(score.inputs, null, 2)}
                </div>
              </div>
            )}
            
            {score.assumptions && score.assumptions.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>Assumptions:</strong>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                  {score.assumptions.map((assumption, idx) => (
                    <li key={idx}>{assumption}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

