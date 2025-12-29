"use client";

import { useState, useEffect } from "react";
import {
  unifiedCostsAPI,
  featuresAPI,
  tasksAPI,
  resourcesAPI,
  modulesAPI,
  productsAPI,
} from "@/lib/api";
import type {
  Cost,
  Feature,
  Task,
  Resource,
  Module,
  CostClassification,
  Product,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react";
import CostForm from "./CostForm";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedClassification, setSelectedClassification] = useState<
    "all" | "run" | "change"
  >("all");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>(
    moduleId || "all"
  );
  const [showCostForm, setShowCostForm] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);

  useEffect(() => {
    loadData();
  }, [productId, moduleId]);

  // Update module filter when moduleId prop changes
  useEffect(() => {
    if (moduleId) {
      setSelectedModuleFilter(moduleId);
    } else if (
      !moduleId &&
      selectedModuleFilter !== "all" &&
      selectedModuleFilter !== "product-level"
    ) {
      // Only reset to "all" if we're not already at a valid state
      setSelectedModuleFilter("all");
    }
  }, [moduleId]);

  // Load modules for filter
  useEffect(() => {
    const loadModules = async () => {
      try {
        const modulesData = await modulesAPI.getByProduct(productId);
        setModules(modulesData);
      } catch (err) {
        console.error("Failed to load modules:", err);
      }
    };
    if (productId) {
      loadModules();
    }
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrors({});

      // Load data with individual error handling
      const loadWithErrorHandling = async <T,>(
        key: string,
        loader: () => Promise<T>,
        defaultValue: T
      ): Promise<T> => {
        try {
          const data = await loader();
          console.log(`✅ Loaded ${key}:`, data);
          return data;
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : `Failed to load ${key}`;
          console.error(`❌ Error loading ${key}:`, err);
          setErrors((prev) => ({ ...prev, [key]: errorMsg }));
          return defaultValue;
        }
      };

      const [
        costsData,
        featuresData,
        tasksData,
        resourcesData,
        productData,
        taskCostsData,
        featureCostsData,
        classificationData,
        resourceCostsData,
      ] = await Promise.all([
        // Load all product costs (including product-level) - filter by module on frontend if needed
        loadWithErrorHandling(
          "costs",
          () => unifiedCostsAPI.getAll({ product_id: productId }),
          []
        ),
        loadWithErrorHandling(
          "features",
          () =>
            featuresAPI.getAll({ product_id: productId, module_id: moduleId }),
          []
        ),
        loadWithErrorHandling(
          "tasks",
          () => tasksAPI.getAll({ product_id: productId, module_id: moduleId }),
          []
        ),
        loadWithErrorHandling("resources", () => resourcesAPI.getAll(), []),
        loadWithErrorHandling(
          "product",
          () => productsAPI.getById(productId),
          null
        ),
        loadWithErrorHandling(
          "taskCosts",
          () => unifiedCostsAPI.getTaskCosts(productId, moduleId),
          []
        ),
        loadWithErrorHandling(
          "featureCosts",
          () => unifiedCostsAPI.getFeatureCosts(productId, moduleId),
          []
        ),
        loadWithErrorHandling(
          "classificationSummary",
          () => unifiedCostsAPI.getClassificationSummary(productId, moduleId),
          null
        ),
        loadWithErrorHandling(
          "resourceCosts",
          () => unifiedCostsAPI.getResourceCosts(productId, moduleId),
          null
        ),
      ]);

      // Filter costs:
      // - If moduleId is provided: show product-level costs (module_id is null/empty) AND costs for that module
      // - If no moduleId: show all product-level costs
      const filteredCosts = moduleId
        ? costsData.filter((c) => !c.module_id || c.module_id === moduleId)
        : costsData.filter((c) => !c.module_id); // Show only product-level when no module selected

      setCosts(filteredCosts);
      setFeatures(featuresData);
      setTasks(tasksData);
      setResources(resourcesData);
      setProduct(productData);
      setTaskCosts(taskCostsData);
      setFeatureCosts(featureCostsData);
      setClassificationSummary(classificationData);
      setResourceCosts(resourceCostsData);
    } catch (err) {
      console.error("Error loading cost data:", err);
      setErrors({
        general:
          err instanceof Error ? err.message : "Failed to load cost data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCostCreated = () => {
    setShowCostForm(false);
    setEditingCost(null);
    loadData();
  };

  const handleCostEdit = (cost: Cost) => {
    setEditingCost(cost);
    setShowCostForm(true);
  };

  const handleCostDeleted = async (costId: string) => {
    if (!confirm("Are you sure you want to delete this cost?")) return;
    try {
      await unifiedCostsAPI.delete(costId);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete cost");
    }
  };

  const getClassificationColor = (classification?: string) => {
    if (classification === "run")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (classification === "change")
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Calculate summary totals (always show, even if 0)
  const runTotal = classificationSummary?.run?.total_cost || 0;
  const changeTotal = classificationSummary?.change?.total_cost || 0;
  const grandTotal = runTotal + changeTotal;
  const runPercentage = grandTotal > 0 ? (runTotal / grandTotal) * 100 : 0;
  const changePercentage =
    grandTotal > 0 ? (changeTotal / grandTotal) * 100 : 0;

  // Filter data based on selected filters
  const filteredFeatureCosts = featureCosts
    .filter((fc: any) => {
      // Filter by classification
      if (selectedClassification !== "all") {
        if (fc.cost_classification !== selectedClassification) {
          return false;
        }
      }
      // Filter by module
      if (selectedModuleFilter === "all") {
        // Show all modules
      } else if (selectedModuleFilter === "product-level") {
        // Show only product-level features (no module_id)
        const feature = features.find((f) => f.id === fc.feature_id);
        if (!feature || (feature.module_id && feature.module_id !== "")) {
          return false;
        }
      } else {
        // Show only features for the selected module
        const feature = features.find((f) => f.id === fc.feature_id);
        if (!feature || feature.module_id !== selectedModuleFilter) {
          return false;
        }
      }
      return true;
    })
    .sort((a: any, b: any) => (b.total_cost || 0) - (a.total_cost || 0));

  const filteredTaskCosts = taskCosts
    .filter((tc: any) => {
      // Filter by classification
      if (selectedClassification !== "all") {
        if (tc.cost_classification !== selectedClassification) {
          return false;
        }
      }
      // Filter by module
      if (selectedModuleFilter === "all") {
        // Show all modules
      } else if (selectedModuleFilter === "product-level") {
        // Show only product-level tasks (no module_id)
        const task = tasks.find((t) => t.id === tc.task_id);
        if (!task || (task.module_id && task.module_id !== "")) {
          return false;
        }
      } else {
        // Show only tasks for the selected module
        const task = tasks.find((t) => t.id === tc.task_id);
        if (!task || task.module_id !== selectedModuleFilter) {
          return false;
        }
      }
      return true;
    })
    .sort((a: any, b: any) => (b.total_cost || 0) - (a.total_cost || 0));

  const filteredDirectCosts = costs.filter((cost) => {
    // Filter by classification
    if (selectedClassification !== "all") {
      if (cost.cost_classification !== selectedClassification) {
        return false;
      }
    }
    // Filter by module
    if (selectedModuleFilter === "all") {
      // Show all modules when "All Modules" is selected
      return true;
    } else if (selectedModuleFilter === "product-level") {
      // Show only product-level costs (no module_id) when "Product-level" is selected
      return !cost.module_id || cost.module_id === "";
    } else {
      // Show only costs for the selected module
      return cost.module_id === selectedModuleFilter;
    }
  });

  // Prepare trend chart data - show current run costs as of today
  const calculateRunCostTotal = () => {
    // Sum all costs with classification 'run' or direct costs (which are typically run costs)
    return costs
      .filter((cost) => {
        // Include costs with 'run' classification
        if (cost.cost_classification === "run") return true;
        // Include direct costs that don't have a classification (assumed to be run costs)
        // Exclude feature-scoped costs as they are typically change costs
        if (!cost.cost_classification && cost.scope !== "feature") return true;
        return false;
      })
      .reduce((sum, cost) => {
        // For recurring costs, calculate monthly equivalent
        let monthlyAmount = cost.amount || 0;
        if (cost.recurrence === "annual") {
          monthlyAmount = monthlyAmount / 12;
        } else if (cost.recurrence === "quarterly") {
          monthlyAmount = monthlyAmount / 3;
        } else if (cost.recurrence === "one-time") {
          // For one-time costs, divide by amortization period if available, otherwise show as monthly
          if (cost.amortization_period) {
            monthlyAmount = monthlyAmount / cost.amortization_period;
          } else {
            monthlyAmount = 0; // Don't include one-time costs without amortization
          }
        }
        // 'monthly' recurrence is already monthly
        return sum + monthlyAmount;
      }, 0);
  };

  const runCostTotal = calculateRunCostTotal();

  // Create trend data with today's date and current run costs
  const today = new Date();
  const trendData: any[] =
    runCostTotal > 0
      ? [
          {
            date: today.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            run: runCostTotal,
            change: 0, // Only show run costs
          },
        ]
      : [];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center py-8">Loading cost data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Error Messages */}
      {Object.keys(errors).length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Some data failed to load:</p>
                <ul className="list-disc list-inside text-sm mt-1">
                  {Object.entries(errors).map(([key, msg]) => (
                    <li key={key}>
                      {key}: {msg}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Always Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Run/KTLO Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(runTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {grandTotal > 0
                ? `${runPercentage.toFixed(1)}% of total`
                : "No costs yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Change/Growth Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(changeTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {grandTotal > 0
                ? `${changePercentage.toFixed(1)}% of total`
                : "No costs yet"}
            </p>
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
            <div className="text-2xl font-bold">
              {formatCurrency(grandTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All costs combined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="classification-filter"
                className="text-sm font-medium"
              >
                Classification:
              </Label>
              <Select
                value={selectedClassification}
                onValueChange={(value) =>
                  setSelectedClassification(value as "all" | "run" | "change")
                }
              >
                <SelectTrigger id="classification-filter" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="run">Run/KTLO</SelectItem>
                  <SelectItem value="change">Change/Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modules.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="module-filter" className="text-sm font-medium">
                  Module:
                </Label>
                <Select
                  value={selectedModuleFilter}
                  onValueChange={setSelectedModuleFilter}
                >
                  <SelectTrigger id="module-filter" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="product-level">
                      Product-level (no module)
                    </SelectItem>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1"></div>
            <Button
              onClick={() => {
                setEditingCost(null);
                setShowCostForm(true);
              }}
            >
              Add Cost
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Tabbed Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Feature Costs</TabsTrigger>
          <TabsTrigger value="tasks">Task Costs</TabsTrigger>
          <TabsTrigger value="direct">Direct Costs</TabsTrigger>
          <TabsTrigger value="resources">Resource Costs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Total Cost Display */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Monthly Run Costs
                    </p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(runCostTotal)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>

              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="run"
                      stroke="#3b82f6"
                      name="Run/KTLO"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No time-based cost data available</p>
                  <p className="text-sm mt-2">
                    Cost trends will appear here when time-based data is
                    available
                  </p>
                </div>
              )}

              {/* Summary Table */}
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Cost Summary by Type</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">Infrastructure Costs</span>
                    <span className="font-bold">
                      {formatCurrency(
                        costs
                          .filter((c) => c.cost_type === "infra")
                          .reduce((sum, c) => {
                            // Convert to monthly equivalent
                            let monthlyAmount = c.amount || 0;
                            if (c.recurrence === "annual") {
                              monthlyAmount = monthlyAmount / 12;
                            } else if (c.recurrence === "quarterly") {
                              monthlyAmount = monthlyAmount / 3;
                            } else if (
                              c.recurrence === "one-time" &&
                              c.amortization_period
                            ) {
                              monthlyAmount =
                                monthlyAmount / c.amortization_period;
                            }
                            return sum + monthlyAmount;
                          }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">Other Direct Costs</span>
                    <span className="font-bold">
                      {formatCurrency(
                        costs
                          .filter((c) => c.cost_type !== "infra")
                          .reduce((sum, c) => {
                            // Convert to monthly equivalent
                            let monthlyAmount = c.amount || 0;
                            if (c.recurrence === "annual") {
                              monthlyAmount = monthlyAmount / 12;
                            } else if (c.recurrence === "quarterly") {
                              monthlyAmount = monthlyAmount / 3;
                            } else if (
                              c.recurrence === "one-time" &&
                              c.amortization_period
                            ) {
                              monthlyAmount =
                                monthlyAmount / c.amortization_period;
                            }
                            return sum + monthlyAmount;
                          }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">Task Costs (Calculated)</span>
                    <span className="font-bold">
                      {formatCurrency(
                        taskCosts.reduce(
                          (sum: number, tc: any) => sum + (tc.total_cost || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">
                      Feature Costs (Aggregated)
                    </span>
                    <span className="font-bold">
                      {formatCurrency(
                        featureCosts.reduce(
                          (sum: number, fc: any) => sum + (fc.total_cost || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Costs Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredFeatureCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium mb-2">No feature costs found</p>
                  <p className="text-sm">
                    Create features and assign tasks with resources to see costs
                    calculated automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeatureCosts.map((featureCost: any) => {
                    const feature = features.find(
                      (f) => f.id === featureCost.feature_id
                    );
                    return (
                      <div
                        key={featureCost.feature_id}
                        className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">
                              {feature?.name ||
                                featureCost.feature_name ||
                                "Unknown Feature"}
                            </h4>
                            {featureCost.cost_classification && (
                              <Badge
                                className={`mt-2 ${getClassificationColor(
                                  featureCost.cost_classification
                                )}`}
                              >
                                {featureCost.cost_classification === "run"
                                  ? "Run/KTLO"
                                  : "Change/Growth"}
                              </Badge>
                            )}
                            <div className="text-sm text-muted-foreground mt-2">
                              {featureCost.task_count || 0} task
                              {featureCost.task_count !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold">
                              {formatCurrency(featureCost.total_cost || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Est:{" "}
                              {formatCurrency(featureCost.estimated_cost || 0)}
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

        {/* Task Costs Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTaskCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium mb-2">No task costs found</p>
                  <p className="text-sm">
                    Assign resources to tasks to calculate costs automatically
                    based on resource rates and task hours.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTaskCosts.map((taskCost: any) => {
                    const task = tasks.find((t) => t.id === taskCost.task_id);
                    const assignedResources =
                      taskCost.assignee_ids
                        ?.map((id: string) =>
                          resources.find((r) => r.id === id)
                        )
                        .filter(Boolean) || [];
                    return (
                      <div
                        key={taskCost.task_id}
                        className="border rounded p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-base">
                              {task?.title ||
                                taskCost.task_title ||
                                "Unknown Task"}
                            </h5>
                            {taskCost.cost_classification && (
                              <Badge
                                className={`mt-1 ${getClassificationColor(
                                  taskCost.cost_classification
                                )}`}
                              >
                                {taskCost.cost_classification === "run"
                                  ? "Run/KTLO"
                                  : "Change/Growth"}
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground mt-2 space-y-1">
                              <div>
                                {taskCost.estimated_hours || 0}h estimated /{" "}
                                {taskCost.actual_hours ||
                                  taskCost.estimated_hours ||
                                  0}
                                h actual
                              </div>
                              {assignedResources.length > 0 && (
                                <div>
                                  Resources:{" "}
                                  {assignedResources
                                    .map((r: Resource) => r.name)
                                    .join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xl font-bold">
                              {formatCurrency(taskCost.total_cost || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Est:{" "}
                              {formatCurrency(taskCost.estimated_cost || 0)}
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

        {/* Direct Costs Tab */}
        <TabsContent value="direct" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Direct Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDirectCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium mb-2">No direct costs found</p>
                  <p className="text-sm mb-4">
                    Direct costs include infrastructure, licenses, vendor
                    services, and other expenses.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingCost(null);
                      setShowCostForm(true);
                    }}
                  >
                    Add Direct Cost
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDirectCosts.map((cost) => (
                    <div
                      key={cost.id}
                      className="border rounded p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h5 className="font-medium text-base">{cost.name}</h5>
                          <div className="text-xs text-muted-foreground mt-1">
                            {String(cost.category || "N/A")} •{" "}
                            {String(cost.cost_type || "N/A")} •{" "}
                            {String(cost.recurrence || "N/A")}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xl font-bold">
                              {formatCurrency(
                                cost.amount || 0,
                                cost.currency || "USD"
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCostEdit(cost)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCostDeleted(cost.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Costs Tab */}
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Direct Resource Costs */}
                <div>
                  <h4 className="font-semibold mb-3">Direct Resource Costs</h4>
                  {!resourceCosts?.direct_resource_costs ||
                  resourceCosts.direct_resource_costs.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border rounded">
                      <p className="text-sm">No direct resource costs</p>
                      <p className="text-xs mt-1">
                        These are costs directly linked to resources in the Cost
                        model
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resourceCosts.direct_resource_costs.map((cost: Cost) => (
                        <div
                          key={cost.id}
                          className="border rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{cost.name}</span>
                            <span className="font-bold">
                              {formatCurrency(
                                cost.amount || 0,
                                cost.currency || "USD"
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Calculated Resource Costs */}
                <div>
                  <h4 className="font-semibold mb-3">
                    Calculated Resource Costs
                  </h4>
                  {!resourceCosts?.calculated_resource_costs ||
                  resourceCosts.calculated_resource_costs.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border rounded">
                      <p className="text-sm">No calculated resource costs</p>
                      <p className="text-xs mt-1">
                        These are costs calculated from resource assignments to
                        tasks (resource rate × task hours)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resourceCosts.calculated_resource_costs.map(
                        (resourceCost: any, idx: number) => {
                          const resource = resources.find(
                            (r) => r.id === resourceCost.resource_id
                          );
                          return (
                            <div
                              key={idx}
                              className="border rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {resource?.name ||
                                    `Resource ${resourceCost.resource_id}`}
                                </span>
                                <div className="text-right">
                                  <span className="font-bold">
                                    {formatCurrency(
                                      resourceCost.total_cost || 0
                                    )}
                                  </span>
                                  <div className="text-xs text-muted-foreground">
                                    Est:{" "}
                                    {formatCurrency(
                                      resourceCost.estimated_cost || 0
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cost Form Modal */}
      {showCostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            {product && (
              <CostForm
                cost={editingCost || undefined}
                product={product}
                moduleId={moduleId}
                onSuccess={handleCostCreated}
                onCancel={() => {
                  setShowCostForm(false);
                  setEditingCost(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
