'use client';

import { useState, useEffect } from 'react';
import { modulesAPI } from '@/lib/api';
import type { Module, Product } from '@/types';
import ModuleForm from './ModuleForm';
import Modal from '../Modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Star } from 'lucide-react';

interface ModuleListProps {
  productId?: string;
  onUpdate?: () => void;
}

export default function ModuleList({ productId, onUpdate }: ModuleListProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, [productId]);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = productId ? { product_id: productId } : undefined;
      const data = await modulesAPI.getAll(params);
      setModules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) {
      return;
    }

    try {
      setDeletingId(id);
      await modulesAPI.delete(id);
      await loadModules();
      onUpdate?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete module');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    await loadModules();
    setShowCreateModal(false);
    onUpdate?.();
  };

  const handleUpdate = async () => {
    await loadModules();
    setEditingModule(null);
    onUpdate?.();
  };

  if (loading) {
    return <div className="text-center py-8">Loading modules...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Modules</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No modules yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {module.name}
                      {module.is_default && (
                        <Badge variant="default" className="bg-yellow-500">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </CardTitle>
                    {module.description && (
                      <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {module.enabled_steps.length > 0 && (
                    <div>
                      <span className="font-medium">Steps: </span>
                      <span className="text-muted-foreground">
                        {module.enabled_steps.join(', ')}
                      </span>
                    </div>
                  )}
                  {module.owner_id && (
                    <div>
                      <span className="font-medium">Owner: </span>
                      <span className="text-muted-foreground">{module.owner_id}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingModule(module)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(module.id)}
                    disabled={deletingId === module.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Module"
      >
        <ModuleForm
          module={null}
          productId={productId}
          onSuccess={handleCreate}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingModule}
        onClose={() => setEditingModule(null)}
        title="Edit Module"
      >
        {editingModule && (
          <ModuleForm
            module={editingModule}
            productId={productId}
            onSuccess={handleUpdate}
            onCancel={() => setEditingModule(null)}
          />
        )}
      </Modal>
    </div>
  );
}

