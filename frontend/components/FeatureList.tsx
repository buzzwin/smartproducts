'use client';

import { useState, useEffect } from 'react';
import { featuresAPI, productsAPI, resourcesAPI } from '@/lib/api';
import type { Feature, Product, Resource } from '@/types';
import FeatureForm from './FeatureForm';
import Modal from './Modal';

interface FeatureListProps {
  product?: Product;
  productId?: string;
  onUpdate?: () => void;
}

export default function FeatureList({ product, productId, onUpdate }: FeatureListProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterProductId, setFilterProductId] = useState<string | ''>(productId || product?.id || '');

  // Create a map of resource IDs to resource names
  const resourceMap = new Map<string, Resource>();
  resources.forEach(resource => {
    resourceMap.set(resource.id, resource);
  });

  useEffect(() => {
    loadFeatures();
    loadResources();
    if (!product) {
      loadProducts();
    }
  }, [product?.id, productId, filterProductId]);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const loadResources = async () => {
    try {
      const data = await resourcesAPI.getAll();
      setResources(data || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
      setResources([]);
    }
  };

  const loadFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { product_id?: string; module_id?: string } = {};
      if (filterProductId) {
        params.product_id = filterProductId;
      } else if (productId) {
        params.product_id = productId;
      } else if (product?.id) {
        params.product_id = product.id;
      }
      const data = await featuresAPI.getAll(params);
      setFeatures(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) {
      return;
    }

    try {
      setDeletingId(id);
      await featuresAPI.delete(id);
      await loadFeatures();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete feature');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading features...</div>
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

  const currentProduct = product || products.find(p => p.id === filterProductId);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>
          {currentProduct ? `Features - ${currentProduct.name}` : 'Features'}
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!product && (
            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!currentProduct && !filterProductId}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: (!currentProduct && !filterProductId) ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: (!currentProduct && !filterProductId) ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
            title={(!currentProduct && !filterProductId) ? 'Please select a product first' : ''}
          >
            + Add Feature
          </button>
        </div>
      </div>

      {features.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          {currentProduct 
            ? `No features yet. Create your first feature for ${currentProduct.name}!`
            : filterProductId 
              ? 'No features found for the selected product.'
              : 'No features found. Select a product to view or create features.'}
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {!product && <th>Product</th>}
              <th>Name</th>
              <th>Description</th>
              <th>Module</th>
              <th>Owner</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => {
              const featureProduct = products.find(p => p.id === feature.product_id);
              return (
                <tr key={feature.id}>
                  {!product && (
                    <td>{featureProduct?.name || feature.product_id || '-'}</td>
                  )}
                  <td style={{ fontWeight: 500 }}>{feature.name}</td>
                  <td>{feature.description || '-'}</td>
                  <td>{feature.module_id ? `Module ${feature.module_id.substring(0, 8)}...` : '-'}</td>
                  <td>
                    {feature.owner ? (
                      resourceMap.get(feature.owner)?.name || feature.owner
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setEditingFeature(feature)}
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
                      onClick={() => handleDelete(feature.id)}
                      disabled={deletingId === feature.id}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        backgroundColor: deletingId === feature.id ? '#ccc' : '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: deletingId === feature.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {deletingId === feature.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Feature"
      >
        {currentProduct && (
          <FeatureForm
            product={currentProduct}
            onSuccess={() => {
              setShowCreateModal(false);
              loadFeatures();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
        {!currentProduct && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Please select a product first to create a feature.</p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editingFeature}
        onClose={() => setEditingFeature(null)}
        title="Edit Feature"
      >
        {editingFeature && (() => {
          const editProduct = currentProduct || products.find(p => p.id === editingFeature.product_id);
          if (!editProduct) {
            return (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Product not found for this feature.</p>
              </div>
            );
          }
          return (
            <FeatureForm
              feature={editingFeature}
              product={editProduct}
              onSuccess={() => {
                setEditingFeature(null);
                loadFeatures();
                if (onUpdate) onUpdate();
              }}
              onCancel={() => setEditingFeature(null)}
            />
          );
        })()}
      </Modal>
    </div>
  );
}

