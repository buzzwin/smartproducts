"use client";

import { useState, useEffect } from "react";
import { modulesAPI, productsAPI } from "@/lib/api";
import type { Module, Product } from "@/types";
import ModuleForm from "./ModuleForm";
import Modal from "../Modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ModuleListProps {
  productId?: string;
  onUpdate?: () => void;
}

export default function ModuleList({
  productId: propProductId,
  onUpdate,
}: ModuleListProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    propProductId || ""
  );

  // Use propProductId if provided, otherwise use selectedProductId
  const productId = propProductId || selectedProductId;

  // Load products if no productId is provided
  useEffect(() => {
    if (!propProductId) {
      const loadProducts = async () => {
        try {
          const data = await productsAPI.getAll();
          setProducts(data);
          // Auto-select the first product if none is selected
          if (data.length > 0) {
            setSelectedProductId((current) => {
              // Only set if not already set
              return current || data[0].id;
            });
          }
        } catch (err) {
          console.error("Failed to load products:", err);
        }
      };
      loadProducts();
    }
  }, [propProductId]);

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
      setError(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this module?")) {
      return;
    }

    try {
      setDeletingId(id);
      await modulesAPI.delete(id);
      // Optimistically update the UI by removing the deleted module immediately
      setModules((prevModules) => prevModules.filter((m) => m.id !== id));
      // Dispatch custom event to notify other components (like ProductWorkspace)
      window.dispatchEvent(
        new CustomEvent("moduleDeleted", { detail: { moduleId: id } })
      );
      // Also reload to ensure consistency
      await loadModules();
      onUpdate?.();
    } catch (err) {
      // If deletion failed, reload to restore the correct state
      await loadModules();
      alert(err instanceof Error ? err.message : "Failed to delete module");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    await loadModules();
    setShowCreateModal(false);
    // Dispatch event is handled by ModuleForm, but we'll also dispatch here for safety
    if (productId) {
      window.dispatchEvent(
        new CustomEvent("moduleCreated", {
          detail: { productId },
        })
      );
    }
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Modules</h2>
        <div className="flex items-center gap-4">
          {!propProductId && (
            <div className="flex items-center gap-2">
              <Label htmlFor="product-select" className="text-sm">
                Select Product:
              </Label>
              <Select
                value={selectedProductId}
                onValueChange={(value) => setSelectedProductId(value)}
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
          )}
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!productId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Module
          </Button>
        </div>
      </div>

      {!propProductId && !productId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-sm text-yellow-800">
            Please select a product above to view and manage modules.
          </p>
        </div>
      )}

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
                      <p className="text-sm text-muted-foreground mt-1">
                        {module.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {module.owner_id && (
                    <div>
                      <span className="font-medium">Owner: </span>
                      <span className="text-muted-foreground">
                        {module.owner_id}
                      </span>
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
        {productId ? (
          <ModuleForm
            module={null}
            productId={productId}
            onSuccess={handleCreate}
            onCancel={() => setShowCreateModal(false)}
          />
        ) : (
          <div className="p-4">
            <p className="text-red-500">
              Error: No product selected. Please select a product first before
              creating a module.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editingModule}
        onClose={() => setEditingModule(null)}
        title="Edit Module"
      >
        {editingModule && (
          <ModuleForm
            module={editingModule}
            productId={productId || editingModule.product_id}
            onSuccess={handleUpdate}
            onCancel={() => setEditingModule(null)}
          />
        )}
      </Modal>
    </div>
  );
}
