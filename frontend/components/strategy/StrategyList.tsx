"use client";

import { useState, useEffect } from "react";
import { strategiesAPI, productsAPI } from "@/lib/api";
import type { Strategy, Product } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StrategyForm from "./StrategyForm";
import OKRCard from "./OKRCard";
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

interface StrategyListProps {
  onUpdate?: () => void;
}

export default function StrategyList({ onUpdate }: StrategyListProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"vision" | "strategy" | "okr">(
    "vision"
  );

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      loadStrategies();
    }
  }, [selectedProductId, products]);

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

  const loadStrategies = async () => {
    if (!selectedProductId) {
      setStrategies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Get all strategies for the product (product-level only - no module filtering)
      const data = await strategiesAPI.getByProduct(selectedProductId);
      // Filter to show only product-level strategies (module_id is null)
      setStrategies(data.filter((s) => !s.module_id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load strategies"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (
    strategy: Omit<Strategy, "id" | "created_at" | "updated_at">
  ): Promise<void> => {
    if (!selectedProductId) {
      alert("Please select a product first");
      return;
    }
    const strategyData = {
      ...strategy,
      product_id: selectedProductId,
      module_id: undefined, // Always product-level in Management section
    };
    await strategiesAPI.create(strategyData);
    await loadStrategies();
    setShowCreateModal(false);
    if (onUpdate) onUpdate();
  };

  const handleUpdate = async (
    strategy: Omit<Strategy, "id" | "created_at" | "updated_at">
  ): Promise<void> => {
    if (!editingStrategy) return;
    await strategiesAPI.update(editingStrategy.id, strategy);
    await loadStrategies();
    setEditingStrategy(null);
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) {
      return;
    }
    try {
      await strategiesAPI.delete(id);
      await loadStrategies();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete strategy");
    }
  };

  // Filter strategies by type (no module filtering in Management section)
  const filteredStrategies = strategies.filter((s) => s.type === activeTab);

  // Helper function to render strategy card
  const renderStrategyCard = (strategy: Strategy) => {
    const isProductLevel = !strategy.module_id;
    const product = products.find((p) => p.id === strategy.product_id);

    if (strategy.type === "okr") {
      return (
        <Card
          key={strategy.id}
          className={
            isProductLevel
              ? "border-l-4 border-l-blue-500"
              : "border-l-4 border-l-purple-500"
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle>{strategy.title}</CardTitle>
                  <Badge variant="outline">{strategy.type.toUpperCase()}</Badge>
                  {product && <Badge variant="secondary">{product.name}</Badge>}
                  {isProductLevel ? (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 dark:bg-blue-950"
                    >
                      Product Level
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-purple-50 dark:bg-purple-950"
                    >
                      Module Level
                    </Badge>
                  )}
                  <Badge
                    variant={
                      strategy.status === "active"
                        ? "default"
                        : strategy.status === "archived"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {strategy.status}
                  </Badge>
                </div>
                {strategy.description && (
                  <CardDescription>{strategy.description}</CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingStrategy(strategy)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(strategy.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {strategy.objectives && strategy.key_results && (
              <div className="space-y-4">
                {strategy.objectives.map((objective, idx) => {
                  const relatedKRs =
                    strategy.key_results?.filter(
                      (_, i) =>
                        i >=
                          (idx * (strategy.key_results?.length || 0)) /
                            (strategy.objectives?.length || 1) &&
                        i <
                          ((idx + 1) * (strategy.key_results?.length || 0)) /
                            (strategy.objectives?.length || 1)
                    ) || [];
                  return (
                    <OKRCard
                      key={idx}
                      objective={objective}
                      keyResults={relatedKRs}
                      status={strategy.status}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        key={strategy.id}
        className={
          isProductLevel
            ? "border-l-4 border-l-blue-500"
            : "border-l-4 border-l-purple-500"
        }
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>{strategy.title}</CardTitle>
                <Badge variant="outline">{strategy.type.toUpperCase()}</Badge>
                {product && <Badge variant="secondary">{product.name}</Badge>}
                {isProductLevel ? (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950"
                  >
                    Product Level
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-purple-50 dark:bg-purple-950"
                  >
                    Module Level
                  </Badge>
                )}
                <Badge
                  variant={
                    strategy.status === "active"
                      ? "default"
                      : strategy.status === "archived"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {strategy.status}
                </Badge>
              </div>
              {strategy.description && (
                <CardDescription>{strategy.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingStrategy(strategy)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(strategy.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {strategy.type === "themes" && strategy.strategic_themes && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Strategic Themes:</h4>
              <ul className="list-disc list-inside space-y-1">
                {strategy.strategic_themes.map((theme, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {theme}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {strategy.type === "assumptions" && strategy.assumptions && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Assumptions:</h4>
              <ul className="list-disc list-inside space-y-1">
                {strategy.assumptions.map((assumption, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {strategy.type === "risks" && strategy.risks && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Risks:</h4>
              <ul className="list-disc list-inside space-y-1">
                {strategy.risks.map((risk, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading && strategies.length === 0) {
    return <div className="text-center py-8">Loading strategies...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Strategies, Vision & OKRs</h2>
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
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedProductId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Strategy
          </Button>
        </div>
      </div>

      {!selectedProductId ? (
        <div className="text-center py-8 text-muted-foreground">
          Please select a product to view strategies, visions, and OKRs.
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="vision">Vision</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="okr">OKRs</TabsTrigger>
            </TabsList>

            <TabsContent value="vision" className="space-y-4 mt-4">
              {filteredStrategies
                .filter((s) => s.type === "vision")
                .map((strategy) => renderStrategyCard(strategy))}
              {filteredStrategies.filter((s) => s.type === "vision").length ===
                0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No visions found. Create one to get started.
                </div>
              )}
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4 mt-4">
              {filteredStrategies
                .filter((s) => s.type === "strategy")
                .map((strategy) => renderStrategyCard(strategy))}
              {filteredStrategies.filter((s) => s.type === "strategy")
                .length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No strategies found. Create one to get started.
                </div>
              )}
            </TabsContent>

            <TabsContent value="okr" className="space-y-4 mt-4">
              {filteredStrategies
                .filter((s) => s.type === "okr")
                .map((strategy) => renderStrategyCard(strategy))}
              {filteredStrategies.filter((s) => s.type === "okr").length ===
                0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No OKRs found. Create one to get started.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Strategy"
      >
        {selectedProductId && (
          <StrategyForm
            productId={selectedProductId}
            moduleId={undefined}
            moduleName={undefined}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingStrategy}
        onClose={() => setEditingStrategy(null)}
        title="Edit Strategy"
      >
        {editingStrategy && (
          <StrategyForm
            strategy={editingStrategy}
            productId={editingStrategy.product_id}
            moduleId={editingStrategy.module_id}
            onSubmit={handleUpdate}
            onCancel={() => setEditingStrategy(null)}
          />
        )}
      </Modal>
    </div>
  );
}
