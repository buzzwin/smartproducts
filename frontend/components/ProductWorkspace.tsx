"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  productsAPI,
  strategiesAPI,
  problemsAPI,
  insightsAPI,
  featuresAPI,
  releasesAPI,
  stakeholdersAPI,
  metricsAPI,
  tasksAPI,
  modulesAPI,
  unifiedCostsAPI,
} from "@/lib/api";
import type {
  Product,
  Strategy,
  Problem,
  Insight,
  Feature,
  Release,
  Stakeholder,
  Metric,
  Task,
  Module,
  Cost,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  Lightbulb,
  CheckCircle2,
  Users,
  BarChart3,
  DollarSign,
  ChevronRight,
  CheckCircle,
  Circle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import StrategyView from "./strategy/StrategyView";
import ProblemList from "./discovery/ProblemList";
import ProblemInsightView from "./discovery/ProblemInsightView";
import ExecutionView from "./execution/ExecutionView";
import StakeholderList from "./stakeholders/StakeholderList";
import ModuleForm from "./modules/ModuleForm";
import CostView from "./economics/CostView";
import MetricsView from "./metrics/MetricsView";
import Modal from "./Modal";
import ProductForm from "./ProductForm";
import Link from "next/link";
import { Settings, Plus } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";

interface ProductWorkspaceProps {
  onUpdate?: () => void;
}

type WorkflowStep =
  | "overview"
  | "strategy"
  | "discovery"
  | "execution"
  | "stakeholders"
  | "metrics"
  | "cost";

interface StepStatus {
  completed: boolean;
  inProgress: boolean;
  count: number;
}

export default function ProductWorkspace({ onUpdate }: ProductWorkspaceProps) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [activeStep, setActiveStep] = useState<WorkflowStep>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [highlightedCostId, setHighlightedCostId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Module state
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // Data for each step
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  // Handle deep link parameters from URL
  useEffect(() => {
    if (typeof window !== 'undefined' && products.length > 0) {
      // Check URL params
      const urlProduct = searchParams?.get('product');
      const urlModule = searchParams?.get('module');
      const urlStep = searchParams?.get('step');
      const urlCostId = searchParams?.get('costId');
      const urlTaskId = searchParams?.get('taskId');
      
      // Check sessionStorage (set by share pages)
      const sharedProductId = sessionStorage.getItem('sharedProductId');
      const sharedModuleId = sessionStorage.getItem('sharedModuleId');
      const sharedCostId = sessionStorage.getItem('sharedCostId');
      const sharedTaskId = sessionStorage.getItem('sharedTaskId');
      
      const productId = urlProduct || sharedProductId;
      const moduleId = urlModule || sharedModuleId || null;
      const costId = urlCostId || sharedCostId;
      const taskId = urlTaskId || sharedTaskId;
      const step = urlStep || (costId ? 'cost' : taskId ? 'execution' : null);
      
      if (productId) {
        // Find product and set it
        const product = products.find(p => p.id === productId);
        if (product && selectedProductId !== productId) {
          setSelectedProductId(productId);
          
          // Set module if provided
          if (moduleId) {
            setSelectedModuleId(moduleId);
          }
          
          // Set step if provided
          if (step) {
            const validSteps: WorkflowStep[] = ['overview', 'strategy', 'discovery', 'execution', 'stakeholders', 'metrics', 'cost'];
            if (validSteps.includes(step as WorkflowStep)) {
              setActiveStep(step as WorkflowStep);
            }
          }
          
          // Set highlighted items
          if (costId) {
            setHighlightedCostId(costId);
            setActiveStep('cost');
          }
          if (taskId) {
            setHighlightedTaskId(taskId);
            setActiveStep('execution');
          }
          
          // Clear sessionStorage after reading
          if (sharedProductId) sessionStorage.removeItem('sharedProductId');
          if (sharedModuleId) sessionStorage.removeItem('sharedModuleId');
          if (sharedCostId) sessionStorage.removeItem('sharedCostId');
          if (sharedTaskId) sessionStorage.removeItem('sharedTaskId');
        }
      }
    }
  }, [products, searchParams, selectedProductId]);

  // Debug: Log state changes
  useEffect(() => {
    console.log(
      "ProductWorkspace - showCreateProductModal changed to:",
      showCreateProductModal
    );
  }, [showCreateProductModal]);

  const loadModules = useCallback(async () => {
    if (!selectedProductId) return;

    try {
      console.log(
        "ProductWorkspace: Loading modules for product",
        selectedProductId
      );
      const data = await modulesAPI.getByProduct(selectedProductId);
      console.log("ProductWorkspace: Loaded modules", data?.length || 0, data);
      setModules(data);

      // Default to Product-level (no module) - don't auto-select a module
      setSelectedModuleId("");
      setSelectedModule(null);
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedProductId) {
      loadModules();
    }
  }, [selectedProductId, loadModules]);

  // Listen for module creation/update/deletion events from other components
  useEffect(() => {
    const handleModuleChange = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        moduleId?: string;
        productId?: string;
      }>;
      // Only refresh if the event is for the current product
      if (
        selectedProductId &&
        (!customEvent.detail?.productId ||
          customEvent.detail.productId === selectedProductId)
      ) {
        console.log("ProductWorkspace: Module change event received", {
          eventType: event.type,
          detail: customEvent.detail,
          currentProductId: selectedProductId,
        });
        // Force reload modules with fresh data
        await loadModules();
        console.log("ProductWorkspace: Modules reloaded after", event.type);
        // If the deleted module was the selected one, clear selection
        if (
          event.type === "moduleDeleted" &&
          customEvent.detail?.moduleId === selectedModuleId
        ) {
          setSelectedModuleId("");
          setSelectedModule(null);
        }
      }
    };

    window.addEventListener("moduleCreated", handleModuleChange);
    window.addEventListener("moduleUpdated", handleModuleChange);
    window.addEventListener("moduleDeleted", handleModuleChange);
    return () => {
      window.removeEventListener("moduleCreated", handleModuleChange);
      window.removeEventListener("moduleUpdated", handleModuleChange);
      window.removeEventListener("moduleDeleted", handleModuleChange);
    };
  }, [selectedProductId, selectedModuleId, loadModules]);

  useEffect(() => {
    if (selectedProductId) {
      loadProductData();
    }
  }, [selectedProductId, selectedModuleId]);

  useEffect(() => {
    if (selectedModuleId && modules.length > 0) {
      const module = modules.find((m) => m.id === selectedModuleId);
      setSelectedModule(module || null);

      // All modules are available in all steps - no filtering needed
    } else {
      setSelectedModule(null);
    }
  }, [selectedModuleId, modules, activeStep]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productsAPI.getAll();
      setProducts(data);
      if (data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadProductData = async () => {
    if (!selectedProductId) return;

    try {
      // Load product-level strategies (always)
      const productStrategies = await strategiesAPI
        .getByProduct(selectedProductId, undefined)
        .catch(() => []);

      // Load module-level strategies if module is selected
      const moduleStrategies = selectedModuleId
        ? await strategiesAPI
            .getByProduct(selectedProductId, selectedModuleId)
            .catch(() => [])
        : [];

      // Combine strategies for step status calculation
      const allStrategies = [...productStrategies, ...moduleStrategies];

      const [
        problemsData,
        insightsData,
        featuresData,
        releasesData,
        stakeholdersData,
        metricsData,
        tasksData,
        costsData,
      ] = await Promise.all([
        problemsAPI
          .getByProduct(selectedProductId, selectedModuleId || undefined)
          .catch(() => []),
        insightsAPI
          .getByProduct(selectedProductId, selectedModuleId || undefined)
          .catch(() => []),
        featuresAPI.getAll({ product_id: selectedProductId }).catch(() => []), // Features can be module-scoped or product-level
        releasesAPI
          .getByProduct(selectedProductId, selectedModuleId || undefined)
          .catch(() => []),
        stakeholdersAPI
          .getByProduct(selectedProductId, selectedModuleId || undefined)
          .catch(() => []),
        metricsAPI
          .getByProduct(selectedProductId, selectedModuleId || undefined)
          .catch(() => []),
        tasksAPI.getAll({ product_id: selectedProductId }).catch(() => []), // Tasks are feature-scoped, can be module-scoped
        unifiedCostsAPI
          .getAll({
            product_id: selectedProductId,
            module_id: selectedModuleId || undefined,
          })
          .catch(() => []),
      ]);

      setStrategies(allStrategies);
      setProblems(problemsData);
      setInsights(insightsData);
      setFeatures(featuresData);
      setReleases(releasesData);
      setStakeholders(stakeholdersData);
      setMetrics(metricsData);
      setTasks(tasksData);
      setCosts(costsData);
    } catch (err) {
      console.error("Error loading product data:", err);
    }
  };

  const handleModuleChange = (moduleId: string) => {
    setSelectedModuleId(moduleId);
  };

  const handleModuleCreated = async () => {
    await loadModules();
    setShowModuleModal(false);
    setEditingModule(null);
  };

  const handleModuleUpdated = async () => {
    await loadModules();
    setShowModuleModal(false);
    setEditingModule(null);
  };

  const getStepStatus = (step: WorkflowStep): StepStatus => {
    switch (step) {
      case "strategy":
        return {
          completed: strategies.length > 0,
          inProgress: strategies.some((s) => s.status === "draft"),
          count: strategies.length,
        };
      case "discovery":
        return {
          completed: problems.length > 0 || insights.length > 0,
          inProgress: problems.some((p) => p.status === "validating"),
          count: problems.length + insights.length,
        };
      case "execution":
        return {
          completed: tasks.some((t) => t.status === "done"),
          inProgress: tasks.some((t) => t.status === "in_progress"),
          count: tasks.length,
        };
      case "stakeholders":
        return {
          completed: stakeholders.length > 0,
          inProgress: false,
          count: stakeholders.length,
        };
      case "metrics":
        return {
          completed: metrics.length > 0,
          inProgress: metrics.some((m) => m.current_value !== null),
          count: metrics.length,
        };
      case "cost":
        return {
          completed: costs.length > 0,
          inProgress: false,
          count: costs.length,
        };
      default:
        return { completed: false, inProgress: false, count: 0 };
    }
  };

  const getCompletionPercentage = (): number => {
    // Only count enabled steps from the module
    // All modules use all steps
    const allStepIds = [
      "strategy",
      "discovery",
      "execution",
      "stakeholders",
      "metrics",
      "cost",
    ];
    const completedSteps = allStepIds.filter(
      (stepId) => getStepStatus(stepId as WorkflowStep).completed
    ).length;
    return Math.round((completedSteps / allStepIds.length) * 100);
  };

  const allWorkflowSteps = [
    {
      id: "strategy" as WorkflowStep,
      title: "Strategy & Vision",
      description: "Define your product vision, strategy, and OKRs",
      icon: Target,
      color: "blue",
    },
    {
      id: "discovery" as WorkflowStep,
      title: "Customer Discovery",
      description: "Understand problems and gather customer insights",
      icon: Lightbulb,
      color: "yellow",
    },
    {
      id: "execution" as WorkflowStep,
      title: "Execution",
      description: "Track tasks, velocity, and delivery progress",
      icon: CheckCircle2,
      color: "orange",
    },
    {
      id: "stakeholders" as WorkflowStep,
      title: "Stakeholders",
      description: "Manage stakeholders and communication",
      icon: Users,
      color: "pink",
    },
    {
      id: "metrics" as WorkflowStep,
      title: "Metrics & Outcomes",
      description: "Track success metrics and measure outcomes",
      icon: BarChart3,
      color: "indigo",
    },
    {
      id: "cost" as WorkflowStep,
      title: "Costs",
      description: "Track and manage costs at module and product level",
      icon: DollarSign,
      color: "green",
    },
  ];

  // Get workflow steps - all modules use all steps
  const getWorkflowSteps = () => {
    // All modules use all steps in default order
    return allWorkflowSteps;
  };

  const workflowSteps = getWorkflowSteps();

  // Debug: Log activeStep changes
  useEffect(() => {
    console.log("activeStep changed to:", activeStep);
    console.log(
      "workflowSteps:",
      workflowSteps.map((s) => s.id)
    );
  }, [activeStep, workflowSteps]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">No Products Yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first product to get started with product
                management.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  console.log(
                    "Create Product button clicked in ProductWorkspace"
                  );
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Setting showCreateProductModal to true");
                  setShowCreateProductModal(true);
                }}
                onMouseDown={(e) => {
                  console.log("Button mousedown event");
                  e.preventDefault();
                }}
                onMouseUp={(e) => {
                  console.log("Button mouseup event");
                }}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 500,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Create Product
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Create Product Modal - rendered even when no products */}
        <Modal
          isOpen={showCreateProductModal}
          onClose={() => {
            console.log("Create Product modal close clicked");
            setShowCreateProductModal(false);
          }}
          title="Create Product"
        >
          {showCreateProductModal && (
            <ProductForm
              onSuccess={() => {
                console.log(
                  "Product created successfully from ProductWorkspace"
                );
                setShowCreateProductModal(false);
                loadProducts();
                if (onUpdate) onUpdate();
              }}
              onCancel={() => {
                console.log("Product form cancelled from ProductWorkspace");
                setShowCreateProductModal(false);
              }}
            />
          )}
        </Modal>
      </>
    );
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                Product Workspace
              </h1>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {selectedProductId && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedModuleId}
                    onChange={(e) => handleModuleChange(e.target.value)}
                    className="px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Product-level (no module)</option>
                    {modules.length > 0 ? (
                      modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.name} {module.is_default && "(Default)"}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No modules available
                      </option>
                    )}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingModule(null);
                      setShowModuleModal(true);
                    }}
                    title="Create new module"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {selectedModule && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingModule(selectedModule);
                        setShowModuleModal(true);
                      }}
                      title="Edit module"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Completion</div>
                <div className="text-lg font-semibold text-foreground">
                  {completionPercentage}%
                </div>
              </div>
              <Progress value={completionPercentage} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 bg-background">
        {/* Workflow Tabs Navigation */}
        {selectedProductId && (
          <>
            <Tabs
              value={activeStep}
              onValueChange={(value) => {
                console.log(
                  "Tab clicked, value:",
                  value,
                  "current activeStep:",
                  activeStep
                );
                const newStep = value as WorkflowStep;
                console.log("Setting activeStep to:", newStep);
                setActiveStep(newStep);
              }}
              className="w-full"
            >
              <div className="mb-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center gap-2"
                  >
                    Overview
                  </TabsTrigger>
                  {workflowSteps.map((step) => {
                    const Icon = step.icon;
                    const status = getStepStatus(step.id);
                    return (
                      <TabsTrigger
                        key={step.id}
                        value={step.id}
                        className="flex items-center gap-2"
                        onClick={() => {}}
                      >
                        <Icon className="h-4 w-4" />
                        {step.title}
                        {status.count > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {status.count}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-6">
                {/* Product Overview */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedProduct?.name}
                      <Badge variant="outline">
                        {selectedProduct?.description || "No description"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {selectedProduct?.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Workflow Steps */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {workflowSteps.map((step, index) => {
                    const status = getStepStatus(step.id);
                    const Icon = step.icon;

                    return (
                      <Card
                        key={step.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setActiveStep(step.id)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  step.color === "blue"
                                    ? "bg-blue-100 dark:bg-blue-900/30"
                                    : step.color === "yellow"
                                    ? "bg-yellow-100 dark:bg-yellow-900/30"
                                    : step.color === "purple"
                                    ? "bg-purple-100 dark:bg-purple-900/30"
                                    : step.color === "green"
                                    ? "bg-green-100 dark:bg-green-900/30"
                                    : step.color === "orange"
                                    ? "bg-orange-100 dark:bg-orange-900/30"
                                    : step.color === "pink"
                                    ? "bg-pink-100 dark:bg-pink-900/30"
                                    : "bg-indigo-100 dark:bg-indigo-900/30"
                                }`}
                              >
                                <Icon
                                  className={`h-5 w-5 ${
                                    step.color === "blue"
                                      ? "text-blue-600 dark:text-blue-400"
                                      : step.color === "yellow"
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : step.color === "purple"
                                      ? "text-purple-600 dark:text-purple-400"
                                      : step.color === "green"
                                      ? "text-green-600 dark:text-green-400"
                                      : step.color === "orange"
                                      ? "text-orange-600 dark:text-orange-400"
                                      : step.color === "pink"
                                      ? "text-pink-600 dark:text-pink-400"
                                      : "text-indigo-600 dark:text-indigo-400"
                                  }`}
                                />
                              </div>
                              <div>
                                <CardTitle className="text-lg">
                                  {step.title}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {status.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                              ) : status.inProgress ? (
                                <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                              )}
                              {status.count > 0 && (
                                <Badge variant="secondary">
                                  {status.count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {status.completed
                                ? "Completed"
                                : status.inProgress
                                ? "In Progress"
                                : "Not Started"}
                            </span>
                            <Button variant="ghost" size="sm">
                              Open <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      {!getStepStatus("strategy").completed && (
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setActiveStep("strategy")}
                        >
                          <Target className="mr-2 h-4 w-4" />
                          Start with Strategy
                        </Button>
                      )}
                      {!getStepStatus("discovery").completed && (
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setActiveStep("discovery")}
                        >
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Gather Customer Insights
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {workflowSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <TabsContent key={step.id} value={step.id} className="mt-6">
                    {/* Step Header */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-3xl font-bold flex items-center gap-2">
                            <Icon className="h-8 w-8" />
                            {step.title}
                          </h2>
                          <p className="text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        </div>
                        {(() => {
                          const currentIndex = workflowSteps.findIndex(
                            (s) => s.id === step.id
                          );
                          const hasNext =
                            currentIndex >= 0 &&
                            currentIndex < workflowSteps.length - 1;
                          return (
                            hasNext && (
                              <Button
                                onClick={() => {
                                  setActiveStep(
                                    workflowSteps[currentIndex + 1].id
                                  );
                                }}
                              >
                                Next Step{" "}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            )
                          );
                        })()}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="space-y-6">
                      {step.id === "strategy" && selectedProductId && (
                        <StrategyView
                          productId={selectedProductId}
                          moduleId={selectedModuleId || undefined}
                          moduleName={selectedModule?.name}
                        />
                      )}
                      {step.id === "discovery" && selectedProductId && (
                        <div className="space-y-6">
                          <ProblemInsightView
                            productId={selectedProductId}
                            moduleId={selectedModuleId || undefined}
                          />
                          <ProblemList
                            productId={selectedProductId}
                            moduleId={selectedModuleId || undefined}
                          />
                        </div>
                      )}
                      {step.id === "execution" && selectedProductId && (
                        <ExecutionView
                          productId={selectedProductId}
                          moduleId={selectedModuleId || undefined}
                          tasks={tasks}
                          onUpdate={loadProductData}
                        />
                      )}
                      {step.id === "stakeholders" && selectedProductId && (
                        <StakeholderList
                          productId={selectedProductId}
                          moduleId={selectedModuleId || undefined}
                        />
                      )}
                      {step.id === "metrics" && selectedProductId && (
                        <MetricsView
                          productId={selectedProductId}
                          moduleId={selectedModuleId || undefined}
                        />
                      )}
                      {step.id === "cost" && selectedProductId && (
                        <>
                          <CostView
                            productId={selectedProductId}
                            moduleId={selectedModuleId || undefined}
                            highlightedCostId={highlightedCostId}
                          />
                        </>
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}
      </div>

      {/* Module Modal */}
      <Modal
        isOpen={showModuleModal}
        onClose={() => {
          setShowModuleModal(false);
          setEditingModule(null);
        }}
        title={editingModule ? "Edit Module" : "Create Module"}
      >
        <ModuleForm
          module={editingModule}
          productId={selectedProductId}
          onSuccess={editingModule ? handleModuleUpdated : handleModuleCreated}
          onCancel={() => {
            setShowModuleModal(false);
            setEditingModule(null);
          }}
        />
      </Modal>

      {/* Create Product Modal */}
      <Modal
        isOpen={showCreateProductModal}
        onClose={() => {
          console.log("Create Product modal close clicked");
          setShowCreateProductModal(false);
        }}
        title="Create Product"
      >
        {showCreateProductModal && (
          <ProductForm
            onSuccess={() => {
              console.log("Product created successfully from ProductWorkspace");
              setShowCreateProductModal(false);
              loadProducts();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => {
              console.log("Product form cancelled from ProductWorkspace");
              setShowCreateProductModal(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
