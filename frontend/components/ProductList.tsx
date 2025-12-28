'use client';

import { useState, useEffect } from 'react';
import { productsAPI } from '@/lib/api';
import type { Product } from '@/types';
import ProductForm from './ProductForm';
import Modal from './Modal';
import { Button } from '@/components/ui/button';

interface ProductListProps {
  products: Product[];
  onUpdate: () => void;
}

export default function ProductList({ products, onUpdate }: ProductListProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log('ProductList - showCreateModal changed to:', showCreateModal);
  }, [showCreateModal]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This will also delete all associated cost items.')) {
      return;
    }

    try {
      setDeletingId(id);
      await productsAPI.delete(id);
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Create Product button clicked');
    setShowCreateModal(true);
    return false;
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-5">
        <h2 className="m-0 text-2xl font-semibold text-foreground">Products</h2>
        <Button
          type="button"
          onClick={handleCreateClick}
          onMouseDown={(e) => e.preventDefault()}
          className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium"
        >
          + Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground text-center p-5">
          No products yet. Create your first product!
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.description || '-'}</td>
                <td className="text-right">
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingProduct(product);
                    }}
                    variant="default"
                    size="sm"
                    className="mr-2"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(product.id);
                    }}
                    disabled={deletingId === product.id}
                    variant="destructive"
                    size="sm"
                  >
                    {deletingId === product.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            console.log('Modal close clicked');
            setShowCreateModal(false);
          }}
          title="Create Product"
        >
          <ProductForm
            onSuccess={() => {
              console.log('Product created successfully');
              setShowCreateModal(false);
              onUpdate();
            }}
            onCancel={() => {
              console.log('Product form cancelled');
              setShowCreateModal(false);
            }}
          />
        </Modal>
      )}

      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Edit Product"
      >
        {editingProduct && (
          <ProductForm
            product={editingProduct}
            onSuccess={() => {
              setEditingProduct(null);
              onUpdate();
            }}
            onCancel={() => setEditingProduct(null)}
          />
        )}
      </Modal>
    </div>
  );
}

