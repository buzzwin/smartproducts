'use client';

import { useState } from 'react';
import { roadmapsAPI } from '@/lib/api';
import type { Roadmap, Product, RoadmapType } from '@/types';
import Modal from '../Modal';

interface RoadmapFormProps {
  roadmap?: Roadmap;
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RoadmapForm({ roadmap, product, onSuccess, onCancel }: RoadmapFormProps) {
  const [name, setName] = useState(roadmap?.name || '');
  const [type, setType] = useState<RoadmapType>(roadmap?.type || 'now_next_later');
  const [description, setDescription] = useState(roadmap?.description || '');
  const [isActive, setIsActive] = useState(roadmap?.is_active ?? true);
  const [timeboxes, setTimeboxes] = useState<string>(JSON.stringify(roadmap?.timeboxes || [], null, 2));
  const [roadmapItems, setRoadmapItems] = useState<string>(JSON.stringify(roadmap?.roadmap_items || [], null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let parsedTimeboxes: any[] = [];
      let parsedItems: any[] = [];
      
      try {
        parsedTimeboxes = timeboxes ? JSON.parse(timeboxes) : [];
      } catch (e) {
        throw new Error('Invalid JSON in timeboxes field');
      }
      
      try {
        parsedItems = roadmapItems ? JSON.parse(roadmapItems) : [];
      } catch (e) {
        throw new Error('Invalid JSON in roadmap items field');
      }

      const roadmapData = {
        product_id: product.id,
        name,
        type,
        description: description || undefined,
        is_active: isActive,
        timeboxes: parsedTimeboxes,
        roadmap_items: parsedItems,
      };

      if (roadmap) {
        await roadmapsAPI.update(roadmap.id, roadmapData);
      } else {
        await roadmapsAPI.create(roadmapData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save roadmap');
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
          {roadmap ? 'Edit Roadmap' : 'Create Roadmap'}
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
          onChange={(e) => setType(e.target.value as RoadmapType)}
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
          <option value="now_next_later">Now / Next / Later</option>
          <option value="timeline">Timeline</option>
          <option value="quarters">Quarters</option>
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

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Timeboxes (JSON)
        </label>
        <textarea
          value={timeboxes}
          onChange={(e) => setTimeboxes(e.target.value)}
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
          placeholder='[{"id": "q1", "name": "Q1 2024", "start": "2024-01-01", "end": "2024-03-31"}, ...]'
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Roadmap Items (JSON)
        </label>
        <textarea
          value={roadmapItems}
          onChange={(e) => setRoadmapItems(e.target.value)}
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
          placeholder='[{"entity_type": "feature", "entity_id": "...", "timebox_id": "q1"}, ...]'
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
          {loading ? 'Saving...' : (roadmap ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

