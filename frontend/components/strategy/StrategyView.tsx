'use client';

import { useState, useEffect } from 'react';
import { strategiesAPI } from '@/lib/api';
import type { Strategy } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StrategyForm from './StrategyForm';
import OKRCard from './OKRCard';
import Modal from '../Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface StrategyViewProps {
  productId: string;
  moduleId?: string;  // Optional - if provided, loads module-specific strategies
  moduleName?: string;  // Optional - module name for display in badges
}

export default function StrategyView({ productId, moduleId, moduleName }: StrategyViewProps) {
  const [productStrategies, setProductStrategies] = useState<Strategy[]>([]);
  const [moduleStrategies, setModuleStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<'vision' | 'strategy' | 'okr'>('vision');
  const [activeModuleTab, setActiveModuleTab] = useState<'vision' | 'strategy' | 'okr'>('vision');

  useEffect(() => {
    loadStrategies();
  }, [productId, moduleId]);

  const loadStrategies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Always load product-level strategies (module_id = null)
      const productLevelData = await strategiesAPI.getByProduct(productId, undefined);
      setProductStrategies(productLevelData);
      
      // If module is selected, also load module-level strategies
      if (moduleId) {
        const moduleLevelData = await strategiesAPI.getByProduct(productId, moduleId);
        setModuleStrategies(moduleLevelData);
      } else {
        setModuleStrategies([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProductStrategy = async (strategy: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>) => {
    // Ensure module_id is undefined for product-level strategies
    const productStrategy = { ...strategy, module_id: undefined };
    console.log('Creating product-level strategy:', productStrategy);
    await strategiesAPI.create(productStrategy);
    await loadStrategies();
    setShowCreateProductModal(false);
  };

  const handleCreateModuleStrategy = async (strategy: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>) => {
    // Ensure module_id is set for module-level strategies
    if (!moduleId) {
      alert('No module selected. Cannot create module-level strategy.');
      return;
    }
    const moduleStrategy = { ...strategy, module_id: moduleId };
    console.log('Creating module-level strategy:', moduleStrategy);
    await strategiesAPI.create(moduleStrategy);
    await loadStrategies();
    setShowCreateModuleModal(false);
  };

  // Helper function to filter strategies by type
  const filterProductByType = (strategies: Strategy[]) => {
    return strategies.filter(s => s.type === activeProductTab);
  };

  const filterModuleByType = (strategies: Strategy[]) => {
    return strategies.filter(s => s.type === activeModuleTab);
  };

  // Helper function to render strategy card
  const renderStrategyCard = (strategy: Strategy) => {
    const isProductLevel = !strategy.module_id;
    
    return (
      <Card key={strategy.id} className={isProductLevel ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-purple-500'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>{strategy.title}</CardTitle>
                {isProductLevel ? (
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                    Product Level
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                    Module: {moduleName || 'Module'}
                  </Badge>
                )}
                <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                  {strategy.status}
                </Badge>
              </div>
              <CardDescription>{strategy.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingStrategy(strategy)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(strategy.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {strategy.target_date && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Target Date: {new Date(strategy.target_date).toLocaleDateString()}
            </p>
          </CardContent>
        )}
      </Card>
    );
  };

  const handleUpdate = async (strategy: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingStrategy) return;
    await strategiesAPI.update(editingStrategy.id, strategy);
    await loadStrategies();
    setEditingStrategy(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return;
    try {
      await strategiesAPI.delete(id);
      await loadStrategies();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete strategy');
    }
  };

  const filteredProductStrategies = filterProductByType(productStrategies);
  const filteredModuleStrategies = filterModuleByType(moduleStrategies);

  if (loading) {
    return <div className="text-center py-8">Loading strategies...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  // Helper function to render OKR content
  const renderOKRContent = (strategy: Strategy, isProductLevel: boolean) => {
    return (
      <div key={strategy.id} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{strategy.title}</h3>
              {isProductLevel ? (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                  Product Level
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                  Module: {moduleName || 'Module'}
                </Badge>
              )}
              <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                {strategy.status}
              </Badge>
            </div>
            {strategy.description && (
              <p className="text-sm text-muted-foreground">{strategy.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingStrategy(strategy)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(strategy.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {strategy.objectives && strategy.key_results && strategy.objectives.map((objective, idx) => {
          const relatedKRs = strategy.key_results?.filter((_, i) => 
            i >= idx * (strategy.key_results?.length || 0) / (strategy.objectives?.length || 1) &&
            i < (idx + 1) * (strategy.key_results?.length || 0) / (strategy.objectives?.length || 1)
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
    );
  };

  return (
    <div className="space-y-8">
      {/* Product Strategy & Vision Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Product Strategy & Vision</h2>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Product Level
            </Badge>
          </div>
          <Button onClick={() => setShowCreateProductModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Product Strategy
          </Button>
        </div>

        <Tabs value={activeProductTab} onValueChange={(v) => setActiveProductTab(v as typeof activeProductTab)}>
          <TabsList>
            <TabsTrigger value="vision">Vision</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="okr">OKRs</TabsTrigger>
          </TabsList>

          <TabsContent value="vision" className="space-y-4 mt-4">
            {filteredProductStrategies.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  No product-level vision documents yet.
                </CardContent>
              </Card>
            ) : (
              filteredProductStrategies.map(renderStrategyCard)
            )}
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4 mt-4">
            {filteredProductStrategies.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  No product-level strategy documents yet.
                </CardContent>
              </Card>
            ) : (
              filteredProductStrategies.map(renderStrategyCard)
            )}
          </TabsContent>

          <TabsContent value="okr" className="space-y-4 mt-4">
            {filteredProductStrategies.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  No product-level OKRs yet.
                </CardContent>
              </Card>
            ) : (
              filteredProductStrategies.map((strategy) => renderOKRContent(strategy, true))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Module Strategy & Vision Section - Only shown when module is selected */}
      {moduleId && (
        <>
          <div className="pt-8 border-t-2 border-border">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Module Strategy & Vision</h2>
                <Badge variant="secondary" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  {moduleName || 'Module'}
                </Badge>
              </div>
              <Button onClick={() => setShowCreateModuleModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Module Strategy
              </Button>
            </div>

            <Tabs value={activeModuleTab} onValueChange={(v) => setActiveModuleTab(v as typeof activeModuleTab)}>
              <TabsList>
                <TabsTrigger value="vision">Vision</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="okr">OKRs</TabsTrigger>
              </TabsList>

              <TabsContent value="vision" className="space-y-4 mt-4">
                {filteredModuleStrategies.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground">
                      No module-level vision documents yet.
                    </CardContent>
                  </Card>
                ) : (
                  filteredModuleStrategies.map(renderStrategyCard)
                )}
              </TabsContent>

              <TabsContent value="strategy" className="space-y-4 mt-4">
                {filteredModuleStrategies.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground">
                      No module-level strategy documents yet.
                    </CardContent>
                  </Card>
                ) : (
                  filteredModuleStrategies.map(renderStrategyCard)
                )}
              </TabsContent>

              <TabsContent value="okr" className="space-y-4 mt-4">
                {filteredModuleStrategies.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground">
                      No module-level OKRs yet.
                    </CardContent>
                  </Card>
                ) : (
                  filteredModuleStrategies.map((strategy) => renderOKRContent(strategy, false))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      {/* Create Product Strategy Modal */}
      <Modal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        title="Create Product Strategy"
      >
        <StrategyForm
          productId={productId}
          moduleId={undefined}
          moduleName={undefined}
          onSubmit={handleCreateProductStrategy}
          onCancel={() => setShowCreateProductModal(false)}
        />
      </Modal>

      {/* Create Module Strategy Modal */}
      {moduleId && (
        <Modal
          isOpen={showCreateModuleModal}
          onClose={() => setShowCreateModuleModal(false)}
          title={`Create Module Strategy - ${moduleName || 'Module'}`}
        >
          <StrategyForm
            productId={productId}
            moduleId={moduleId}
            moduleName={moduleName}
            onSubmit={handleCreateModuleStrategy}
            onCancel={() => setShowCreateModuleModal(false)}
          />
        </Modal>
      )}

      <Modal
        isOpen={!!editingStrategy}
        onClose={() => setEditingStrategy(null)}
        title="Edit Strategy"
      >
        {editingStrategy && (
          <StrategyForm
            strategy={editingStrategy}
            productId={productId}
            moduleId={moduleId}
            moduleName={moduleName}
            onSubmit={handleUpdate}
            onCancel={() => setEditingStrategy(null)}
          />
        )}
      </Modal>
    </div>
  );
}

