'use client';

import { useState, useEffect } from 'react';
import { stakeholdersAPI } from '@/lib/api';
import type { Stakeholder } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import StakeholderForm from './StakeholderForm';

interface StakeholderListProps {
  productId: string;
  moduleId?: string;  // Optional - if provided, loads module-specific stakeholders
  onUpdate?: () => void;
}

export default function StakeholderList({ productId, moduleId, onUpdate }: StakeholderListProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadStakeholders();
  }, [productId, moduleId]);

  const loadStakeholders = async () => {
    try {
      const data = await stakeholdersAPI.getByProduct(productId, moduleId);
      setStakeholders(data);
    } catch (err) {
      console.error('Failed to load stakeholders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stakeholder?')) {
      return;
    }

    try {
      setDeletingId(id);
      await stakeholdersAPI.delete(id);
      await loadStakeholders();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete stakeholder');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = async () => {
    setShowCreateModal(false);
    setEditingStakeholder(null);
    await loadStakeholders();
    if (onUpdate) onUpdate();
  };

  const getInfluenceColor = (level?: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading stakeholders...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stakeholders</h2>
        <Button onClick={() => { setEditingStakeholder(null); setShowCreateModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stakeholder
        </Button>
      </div>
      {stakeholders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No stakeholders added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stakeholders.map((stakeholder) => (
            <Card key={stakeholder.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{stakeholder.name}</CardTitle>
                    <CardDescription>{stakeholder.email}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditingStakeholder(stakeholder);
                        setShowCreateModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(stakeholder.id)}
                      disabled={deletingId === stakeholder.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stakeholder.company_name && <p className="text-sm"><strong>Company:</strong> {stakeholder.company_name}</p>}
                  {stakeholder.role && <p className="text-sm"><strong>Role:</strong> {stakeholder.role}</p>}
                  {stakeholder.influence_level && (
                    <div>
                      <Badge className={getInfluenceColor(stakeholder.influence_level)}>
                        {stakeholder.influence_level.charAt(0).toUpperCase() + stakeholder.influence_level.slice(1)} Influence
                      </Badge>
                    </div>
                  )}
                {stakeholder.update_frequency && (
                  <p className="text-sm text-muted-foreground">
                      <strong>Updates:</strong> {stakeholder.update_frequency}
                    </p>
                  )}
                  {stakeholder.interests && stakeholder.interests.length > 0 && (
                    <div>
                      <p className="text-sm"><strong>Interests:</strong></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stakeholder.interests.map((interest, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {stakeholder.communication_preferences && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Preferences:</strong> {stakeholder.communication_preferences}
                  </p>
                )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingStakeholder(null);
        }}
        title={editingStakeholder ? 'Edit Stakeholder' : 'Create Stakeholder'}
      >
        <StakeholderForm
          stakeholder={editingStakeholder || undefined}
          productId={productId}
          moduleId={moduleId}
          onSuccess={handleSuccess}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingStakeholder(null);
          }}
        />
      </Modal>
    </div>
  );
}

