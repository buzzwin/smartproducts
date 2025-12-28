'use client';

import { useState, useEffect } from 'react';
import { resourcesAPI } from '@/lib/api';
import type { Resource, ResourceType } from '@/types';
import ResourceForm from './ResourceForm';
import Modal from './Modal';

export default function ResourceList({ onUpdate }: { onUpdate?: () => void }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSkill, setFilterSkill] = useState<string>('');

  useEffect(() => {
    loadResources();
  }, [filterType, filterSkill]);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { type?: string; skill?: string } = {};
      if (filterType) params.type = filterType;
      if (filterSkill) params.skill = filterSkill;
      const data = await resourcesAPI.getAll(params);
      setResources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      setDeletingId(id);
      await resourcesAPI.delete(id);
      await loadResources();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete resource');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading resources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Resources</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + Add Resource
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
            Filter by Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <option value="">All Types</option>
            <option value="individual">Individual</option>
            <option value="organization">Organization</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
            Filter by Skill
          </label>
          <input
            type="text"
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
            placeholder="Enter skill name"
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      {resources.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          No resources found. Create your first resource!
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Skills</th>
              <th>Email</th>
              <th>Description</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td style={{ fontWeight: 500 }}>{resource.name}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: resource.type === 'individual' ? '#e7f3ff' : '#f3e5f5',
                      color: resource.type === 'individual' ? '#0066cc' : '#7b1fa2',
                    }}
                  >
                    {resource.type === 'individual' ? 'Individual' : 'Organization'}
                  </span>
                </td>
                <td>
                  {resource.skills && resource.skills.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {resource.skills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            backgroundColor: '#e7f3ff',
                            color: '#0066cc',
                            borderRadius: '12px',
                            fontSize: '11px',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{resource.email || '-'}</td>
                <td>{resource.description || '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setEditingResource(resource)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '8px',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(resource.id)}
                    disabled={deletingId === resource.id}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: deletingId === resource.id ? '#ccc' : '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: deletingId === resource.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deletingId === resource.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Resource"
      >
        <ResourceForm
          onSuccess={() => {
            setShowCreateModal(false);
            loadResources();
            if (onUpdate) onUpdate();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingResource}
        onClose={() => setEditingResource(null)}
        title="Edit Resource"
      >
        {editingResource && (
          <ResourceForm
            resource={editingResource}
            onSuccess={() => {
              setEditingResource(null);
              loadResources();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setEditingResource(null)}
          />
        )}
      </Modal>
    </div>
  );
}

