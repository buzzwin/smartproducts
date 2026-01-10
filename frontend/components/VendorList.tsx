'use client';

import { useState, useEffect } from 'react';
import { vendorsAPI } from '@/lib/api';
import type { Vendor } from '@/types';
import VendorForm from './VendorForm';
import Modal from './Modal';

interface VendorListProps {
  onUpdate?: () => void;
}

export default function VendorList({ onUpdate }: VendorListProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vendorsAPI.getAll();
      setVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    try {
      setDeletingId(id);
      await vendorsAPI.delete(id);
      await loadVendors();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete vendor');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading vendors...</div>
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
        <h2 style={{ margin: 0, fontSize: '24px' }}>Vendors</h2>
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
          + Add Vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          No vendors found. Create your first vendor!
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Email</th>
              <th>Contact Phone</th>
              <th>Website</th>
              <th>Description</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.id}>
                <td style={{ fontWeight: 500 }}>{vendor.name}</td>
                <td>{vendor.contact_email || '-'}</td>
                <td>{vendor.contact_phone || '-'}</td>
                <td>
                  {vendor.website ? (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#007bff', textDecoration: 'none' }}
                    >
                      {vendor.website}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{vendor.description || '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setEditingVendor(vendor)}
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
                    onClick={() => handleDelete(vendor.id)}
                    disabled={deletingId === vendor.id}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: deletingId === vendor.id ? '#ccc' : '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: deletingId === vendor.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deletingId === vendor.id ? 'Deleting...' : 'Delete'}
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
        title="Create Vendor"
      >
        <VendorForm
          onSuccess={() => {
            setShowCreateModal(false);
            loadVendors();
            if (onUpdate) onUpdate();
            // Dispatch event to refresh vendor dropdowns
            window.dispatchEvent(new CustomEvent('vendorCreated'));
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingVendor}
        onClose={() => setEditingVendor(null)}
        title="Edit Vendor"
      >
        {editingVendor && (
          <VendorForm
            vendor={editingVendor}
            onSuccess={() => {
              setEditingVendor(null);
              loadVendors();
              if (onUpdate) onUpdate();
              // Dispatch event to refresh vendor dropdowns
              window.dispatchEvent(new CustomEvent('vendorUpdated'));
            }}
            onCancel={() => setEditingVendor(null)}
          />
        )}
      </Modal>
    </div>
  );
}

