"use client";

import { useState, useEffect } from "react";
import { unifiedCostsAPI, productsAPI, modulesAPI } from "@/lib/api";
import type { Cost, Product, Module } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CostForm from "./CostForm";
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

interface CostListProps {
  onUpdate?: () => void;
}

export default function CostList({ onUpdate }: CostListProps) {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
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
      loadCosts();
    } else {
      setCosts([]);
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

  const loadCosts = async () => {
    if (!selectedProductId) {
      setCosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params: { product_id: string; module_id?: string } = {
        product_id: selectedProductId,
      };
      if (selectedModuleId) {
        params.module_id = selectedModuleId;
      }
      const data = await unifiedCostsAPI.getAll(params);
      setCosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load costs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cost?")) {
      return;
    }
    try {
      setDeletingId(id);
      await unifiedCostsAPI.delete(id);
      await loadCosts();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete cost");
    } finally {
      setDeletingId(null);
    }
  };

  const getCostTypeBadge = (costType: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      labor: "default",
      infra: "secondary",
      license: "outline",
      vendor: "secondary",
      other: "outline",
    };
    return variants[costType] || "outline";
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      build: "default",
      run: "secondary",
      maintain: "outline",
      scale: "secondary",
      overhead: "outline",
    };
    return variants[category] || "outline";
  };

  if (loading && costs.length === 0) {
    return <div className="text-center py-8">Loading costs...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Costs</h2>
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
            Add Cost
          </Button>
        </div>
      </div>

      {!selectedProductId ? (
        <div className="text-center py-8 text-muted-foreground">
          Please select a product to view costs.
        </div>
      ) : costs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No costs found. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {costs.map((cost) => (
            <Card key={cost.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{cost.name}</CardTitle>
                      <Badge variant={getCategoryBadge(cost.category)}>
                        {cost.category}
                      </Badge>
                      <Badge variant={getCostTypeBadge(cost.cost_type)}>
                        {cost.cost_type}
                      </Badge>
                      {cost.cost_classification && (
                        <Badge
                          variant={
                            cost.cost_classification === "run"
                              ? "default"
                              : "outline"
                          }
                        >
                          {cost.cost_classification === "run"
                            ? "Run/KTLO"
                            : "Change/Growth"}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {cost.amount.toFixed(2)} {cost.currency} -{" "}
                      {cost.recurrence}
                      {cost.description && ` • ${cost.description}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCost(cost)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(cost.id)}
                      disabled={deletingId === cost.id}
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
        title="Add Cost"
      >
        {selectedProduct && (
          <CostForm
            cost={undefined}
            product={selectedProduct}
            moduleId={selectedModuleId || undefined}
            onSuccess={() => {
              setShowCreateModal(false);
              loadCosts();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingCost}
        onClose={() => setEditingCost(null)}
        title="Edit Cost"
      >
        {editingCost && selectedProduct && (
          <CostForm
            cost={editingCost}
            product={selectedProduct}
            moduleId={editingCost.module_id}
            onSuccess={() => {
              setEditingCost(null);
              loadCosts();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setEditingCost(null)}
          />
        )}
      </Modal>
    </div>
  );
}
