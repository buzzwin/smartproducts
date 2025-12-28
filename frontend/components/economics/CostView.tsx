'use client';

import { useState, useEffect } from 'react';
import { unifiedCostsAPI, featuresAPI, tasksAPI, resourcesAPI, modulesAPI, productsAPI } from '@/lib/api';
import type { Cost, Feature, Task, Resource, Module, CostClassification, Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import CostForm from './CostForm';

interface CostViewProps {
  productId: string;
  moduleId?: string;
}

export default function CostView({ productId, moduleId }: CostViewProps) {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [taskCosts, setTaskCosts] = useState<any[]>([]);
  const [featureCosts, setFeatureCosts] = useState<any[]>([]);
  const [classificationSummary, setClassificationSummary] = useState<any>(null);
  const [resourceCosts, setResourceCosts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<'all' | 'run' | 'change'>('all');
  const [showCostForm, setShowCostForm] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);

  useEffect(() => {
    loadData();
  }, [productId, moduleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [costsData, featuresData, tasksData, resourcesData, modulesData, productData, taskCostsData, featureCostsData, classificationData, resourceCostsData] = await Promise.all([
        unifiedCostsAPI.getAll({ product_id: productId, module_id: moduleId }),
        featuresAPI.getAll({ product_id: productId, module_id: moduleId }),
        tasksAPI.getAll({ product_id: productId, module_id: moduleId }),
        resourcesAPI.getAll(),
        moduleId ? modulesAPI.getByProduct(productId) : Promise.resolve([]),
        productsAPI.getById(productId),
        unifiedCostsAPI.getTaskCosts(productId, moduleId),
        unifiedCostsAPI.getFeatureCosts(productId, moduleId),
        unifiedCostsAPI.getClassificationSummary(productId, moduleId),
        unifiedCostsAPI.getResourceCosts(productId, moduleId),
      ]);

      setCosts(costsData);
      setFeatures(featuresData);
      setTasks(tasksData);
      setResources(resourcesData);
      setModules(modulesData);
      setProduct(productData);
      setTaskCosts(taskCostsData);
      setFeatureCosts(featureCostsData);
      setClassificationSummary(classificationData);
      setResourceCosts(resourceCostsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost data');
      console.error('Error loading cost data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCostCreated = () => {
    setShowCostForm(false);
    setEditingCost(null);
    loadData();
  };

  const handleCostDeleted = async (costId: string) => {
    if (!confirm('Are you sure you want to delete this cost?')) return;
    try {
      await unifiedCostsAPI.delete(costId);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete cost');
    }
  };

  const getClassificationColor = (classification?: string) => {
    if (classification === 'run') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (classification === 'change') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const filteredFeatureCosts = selectedClassification === 'all'
    ? featureCosts
    : featureCosts.filter((fc: any) => fc.cost_classification === selectedClassification);

  const filteredTaskCosts = selectedClassification === 'all'
    ? taskCosts
    : taskCosts.filter((tc: any) => tc.cost_classification === selectedClassification);

  if (loading) {
    return <div className="p-6 text-center">Loading cost data...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  const runTotal = classificationSummary?.run?.total_cost || 0;
  const changeTotal = classificationSummary?.change?.total_cost || 0;
  const grandTotal = runTotal + changeTotal;
  const runPercentage = grandTotal > 0 ? (runTotal / grandTotal * 100) : 0;
  const changePercentage = grandTotal > 0 ? (changeTotal / grandTotal * 100) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Classification Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Run/KTLO Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(runTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{runPercentage.toFixed(1)}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Change/Growth Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(changeTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{changePercentage.toFixed(1)}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Grand Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">All costs combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Classification Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Classification:</label>
        <select
          value={selectedClassification}
          onChange={(e) => setSelectedClassification(e.target.value as 'all' | 'run' | 'change')}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All</option>
          <option value="run">Run/KTLO</option>
          <option value="change">Change/Growth</option>
        </select>
        <Button onClick={() => { setEditingCost(null); setShowCostForm(true); }}>
          Add Cost
        </Button>
      </div>

      <Tabs defaultValue="features" className="space-y-4">
        <TabsList>
          <TabsTrigger value="features">Feature Costs</TabsTrigger>
          <TabsTrigger value="tasks">Task Costs</TabsTrigger>
          <TabsTrigger value="direct">Direct Costs</TabsTrigger>
          <TabsTrigger value="resources">Resource Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredFeatureCosts.length === 0 ? (
                <p className="text-muted-foreground">No feature costs found</p>
              ) : (
                <div className="space-y-4">
                  {filteredFeatureCosts.map((featureCost: any) => {
                    const feature = features.find(f => f.id === featureCost.feature_id);
                    return (
                      <div key={featureCost.feature_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{feature?.name || featureCost.feature_name}</h4>
                            {featureCost.cost_classification && (
                              <Badge className={getClassificationColor(featureCost.cost_classification)}>
                                {featureCost.cost_classification === 'run' ? 'Run/KTLO' : 'Change/Growth'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(featureCost.total_cost)}</div>
                            <div className="text-sm text-muted-foreground">
                              Est: {formatCurrency(featureCost.estimated_cost)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {featureCost.task_count} tasks
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTaskCosts.length === 0 ? (
                <p className="text-muted-foreground">No task costs found</p>
              ) : (
                <div className="space-y-2">
                  {filteredTaskCosts.map((taskCost: any) => {
                    const task = tasks.find(t => t.id === taskCost.task_id);
                    return (
                      <div key={taskCost.task_id} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{task?.title || taskCost.task_title}</h5>
                            {taskCost.cost_classification && (
                              <Badge className={getClassificationColor(taskCost.cost_classification)}>
                                {taskCost.cost_classification === 'run' ? 'Run/KTLO' : 'Change/Growth'}
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {taskCost.estimated_hours || 0}h est / {taskCost.actual_hours || taskCost.estimated_hours || 0}h actual
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(taskCost.total_cost)}</div>
                            <div className="text-sm text-muted-foreground">
                              Est: {formatCurrency(taskCost.estimated_cost)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Direct Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {costs.length === 0 ? (
                <p className="text-muted-foreground">No direct costs found</p>
              ) : (
                <div className="space-y-2">
                  {costs.map((cost) => (
                    <div key={cost.id} className="border rounded p-3 flex justify-between items-center">
                      <div>
                        <h5 className="font-medium">{cost.name}</h5>
                        <div className="text-xs text-muted-foreground">
                          {String(cost.category)} • {String(cost.cost_type)} • {String(cost.recurrence)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(cost.amount, cost.currency)}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCostDeleted(cost.id)}
                          className="text-red-600"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Direct Resource Costs</h4>
                  {resourceCosts?.direct_resource_costs?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No direct resource costs</p>
                  ) : (
                    <div className="space-y-2">
                      {resourceCosts?.direct_resource_costs?.map((cost: Cost) => (
                        <div key={cost.id} className="border rounded p-3">
                          <div className="flex justify-between">
                            <span>{cost.name}</span>
                            <span className="font-bold">{formatCurrency(cost.amount, cost.currency)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Calculated Resource Costs</h4>
                  {resourceCosts?.calculated_resource_costs?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No calculated resource costs</p>
                  ) : (
                    <div className="space-y-2">
                      {resourceCosts?.calculated_resource_costs?.map((resourceCost: any, idx: number) => {
                        const resource = resources.find(r => r.id === resourceCost.resource_id);
                        return (
                          <div key={idx} className="border rounded p-3">
                            <div className="flex justify-between">
                              <span>{resource?.name || `Resource ${resourceCost.resource_id}`}</span>
                              <div className="text-right">
                                <span className="font-bold">{formatCurrency(resourceCost.total_cost)}</span>
                                <div className="text-xs text-muted-foreground">
                                  Est: {formatCurrency(resourceCost.estimated_cost)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {product && (
              <CostForm
                cost={editingCost || undefined}
                product={product}
                moduleId={moduleId}
                onSuccess={handleCostCreated}
                onCancel={() => { setShowCostForm(false); setEditingCost(null); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

