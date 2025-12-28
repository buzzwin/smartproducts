'use client';

import { useState, useEffect } from 'react';
import { problemsAPI, tasksAPI, productsAPI, featuresAPI, resourcesAPI } from '@/lib/api';
import type { Problem, Product, Feature, Resource } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProblemForm from './ProblemForm';
import TaskForm from '../TaskForm';
import Modal from '../Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface ProblemListProps {
  productId: string;
  moduleId?: string;
  onUpdate?: () => void;
}

export default function ProblemList({ productId, moduleId, onUpdate }: ProblemListProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskProblemId, setTaskProblemId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    loadProductsAndResources();
  }, [productId]);

  useEffect(() => {
    loadProblems();
  }, [productId, moduleId]);

  const loadProblems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await problemsAPI.getByProduct(productId, moduleId);
      setProblems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const loadProductsAndResources = async () => {
    try {
      const [productsData, featuresData, resourcesData] = await Promise.all([
        productsAPI.getAll(),
        featuresAPI.getAll({ product_id: productId }),
        resourcesAPI.getAll(),
      ]);
      setProducts(productsData);
      setFeatures(featuresData);
      setResources(resourcesData);
    } catch (err) {
      console.error('Failed to load products/resources:', err);
    }
  };

  const handleCreate = async (problem: Omit<Problem, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await problemsAPI.create(problem);
    await loadProblems();
    setShowCreateModal(false);
    onUpdate?.();
    // Offer to create task after problem creation
    if (created.id) {
      if (confirm('Problem created successfully! Would you like to create a task for this problem?')) {
        setTaskProblemId(created.id);
        setShowTaskModal(true);
      }
    }
  };

  const handleCreateTask = (problemId: string) => {
    setTaskProblemId(problemId);
    setShowTaskModal(true);
    setEditingProblem(null); // Close problem edit modal if open
  };

  const handleUpdate = async (problem: Omit<Problem, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingProblem) return;
    await problemsAPI.update(editingProblem.id, problem);
    await loadProblems();
    setEditingProblem(null);
    onUpdate?.();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    try {
      await problemsAPI.delete(id);
      await loadProblems();
      onUpdate?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete problem');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading problems...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customer Problems</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Problem
        </Button>
      </div>

      {problems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No problems identified yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {problems.map((problem) => (
            <Card key={problem.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{problem.title}</CardTitle>
                    <CardDescription>{problem.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(problem.priority)}>
                      {problem.priority}
                    </Badge>
                    <Badge variant={problem.status === 'addressed' ? 'default' : 'secondary'}>
                      {problem.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProblem(problem)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(problem.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {problem.insight_ids && problem.insight_ids.length > 0 && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Linked to {problem.insight_ids.length} insight{problem.insight_ids.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Problem"
      >
        <ProblemForm
          productId={productId}
          moduleId={moduleId}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          onCreateTask={handleCreateTask}
        />
      </Modal>

      <Modal
        isOpen={!!editingProblem}
        onClose={() => setEditingProblem(null)}
        title="Edit Problem"
      >
        {editingProblem && (
          <ProblemForm
            problem={editingProblem}
            productId={productId}
            moduleId={moduleId}
            onSubmit={handleUpdate}
            onCancel={() => setEditingProblem(null)}
            onCreateTask={handleCreateTask}
          />
        )}
      </Modal>

      <Modal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setTaskProblemId(null);
        }}
        title="Create Task"
      >
        <TaskForm
          products={products}
          features={features}
          resources={resources}
          initialProductId={productId}
          initialModuleId={moduleId}
          initialProblemId={taskProblemId || undefined}
          onSuccess={() => {
            setShowTaskModal(false);
            setTaskProblemId(null);
            loadProblems(); // Reload to show updated task associations
            onUpdate?.();
          }}
          onCancel={() => {
            setShowTaskModal(false);
            setTaskProblemId(null);
          }}
        />
      </Modal>
    </div>
  );
}

