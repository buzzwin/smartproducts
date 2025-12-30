"use client";

import { useState, useEffect } from "react";
import { problemsAPI, productsAPI, modulesAPI } from "@/lib/api";
import type { Problem, Product, Module } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProblemForm from "./ProblemForm";
import Modal from "../Modal";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ProblemListManagementProps {
  onUpdate?: () => void;
}

export default function ProblemListManagement({
  onUpdate,
}: ProblemListManagementProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadModules();
    } else {
      setModules([]);
      setSelectedModuleId(null);
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedProductId) {
      loadProblems();
    } else {
      setProblems([]);
    }
  }, [selectedProductId, selectedModuleId]);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setProducts(data);
      if (data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  const loadModules = async () => {
    if (!selectedProductId) {
      setModules([]);
      return;
    }
    try {
      const data = await modulesAPI.getByProduct(selectedProductId);
      setModules(data);
      setSelectedModuleId(null);
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
    }
  };

  const loadProblems = async () => {
    if (!selectedProductId) {
      setProblems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await problemsAPI.getByProduct(
        selectedProductId,
        selectedModuleId || undefined
      );
      setProblems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load problems");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this problem?")) {
      return;
    }
    try {
      setDeletingId(id);
      await problemsAPI.delete(id);
      await loadProblems();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete problem");
    } finally {
      setDeletingId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      low: "outline",
      medium: "secondary",
      high: "default",
      critical: "destructive",
    };
    return variants[priority] || "outline";
  };

  const getStatusColor = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      identified: "outline",
      validating: "secondary",
      prioritized: "default",
      addressed: "default",
      dismissed: "secondary",
    };
    return variants[status] || "outline";
  };

  if (loading && problems.length === 0) {
    return <div className="text-center py-8">Loading problems...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customer Problems</h2>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="product-select">Product:</Label>
            <Select
              value={selectedProductId || ""}
              onValueChange={(value) => setSelectedProductId(value || null)}
            >
              <SelectTrigger id="product-select" className="w-[200px]">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedProductId && (
            <div className="flex items-center gap-2">
              <Label htmlFor="module-select">Module:</Label>
              <Select
                value={selectedModuleId || "product-level"}
                onValueChange={(value) =>
                  setSelectedModuleId(value === "product-level" ? null : value)
                }
              >
                <SelectTrigger id="module-select" className="w-[200px]">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product-level">Product Level</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedProductId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Problem
          </Button>
        </div>
      </div>

      {!selectedProductId ? (
        <div className="text-center py-8 text-muted-foreground">
          Please select a product to view problems.
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No problems found. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {problems.map((problem) => (
            <Card key={problem.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{problem.title}</CardTitle>
                      <Badge variant={getPriorityColor(problem.priority)}>
                        {problem.priority}
                      </Badge>
                      <Badge variant={getStatusColor(problem.status)}>
                        {problem.status}
                      </Badge>
                      {problem.severity && (
                        <Badge variant="outline">{problem.severity}</Badge>
                      )}
                    </div>
                    {problem.description && (
                      <CardDescription>{problem.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingProblem(problem)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(problem.id)}
                      disabled={deletingId === problem.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Problem"
      >
        {selectedProductId && (
          <ProblemForm
            problem={undefined}
            productId={selectedProductId}
            moduleId={selectedModuleId || undefined}
            onSubmit={async () => {
              setShowCreateModal(false);
              await loadProblems();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProblem}
        onClose={() => setEditingProblem(null)}
        title="Edit Problem"
      >
        {editingProblem && (
          <ProblemForm
            problem={editingProblem}
            productId={editingProblem.product_id}
            moduleId={editingProblem.module_id}
            onSubmit={async () => {
              setEditingProblem(null);
              await loadProblems();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setEditingProblem(null)}
          />
        )}
      </Modal>
    </div>
  );
}
