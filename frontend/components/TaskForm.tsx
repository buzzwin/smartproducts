"use client";

import { useState, useEffect, useCallback } from "react";
import {
  tasksAPI,
  resourcesAPI,
  productsAPI,
  featuresAPI,
  phasesAPI,
  modulesAPI,
  problemsAPI,
  workstreamsAPI,
} from "@/lib/api";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  Resource,
  Product,
  Feature,
  Phase,
  Module,
  CostClassification,
  Problem,
  Workstream,
} from "@/types";
import AIAssistant from "./AIAssistant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Modal from "./Modal";
import FeatureForm from "./FeatureForm";
import ProductForm from "./ProductForm";
import ProblemForm from "./discovery/ProblemForm";
import DiagramInput from "./diagrams/DiagramInput";
import DrawIORenderer from "./diagrams/DrawIORenderer";

interface TaskFormProps {
  task?: Task;
  products: Product[];
  features: Feature[];
  resources: Resource[];
  initialProductId?: string;
  initialModuleId?: string;
  initialProblemId?: string; // Pre-fill problem_id when creating task from problem
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TaskForm({
  task,
  products,
  features,
  resources,
  initialProductId,
  initialModuleId,
  initialProblemId,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const [productId, setProductId] = useState(
    task?.product_id || initialProductId || ""
  );
  const [moduleId, setModuleId] = useState(
    task?.module_id || initialModuleId || ""
  );
  const [featureId, setFeatureId] = useState(task?.feature_id || "");
  const [problemId, setProblemId] = useState(
    task?.problem_id || initialProblemId || ""
  );
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "todo");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority || "medium"
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assignee_ids || []
  );
  const [phaseId, setPhaseId] = useState(task?.phase_id || "");
  const [workstreamId, setWorkstreamId] = useState(task?.workstream_id || "");
  const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>(
    task?.depends_on_task_ids || []
  );
  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.split("T")[0] : ""
  );
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(
    task?.estimated_hours
  );
  const [cost_classification, setCost_classification] = useState<
    CostClassification | ""
  >(task?.cost_classification || "");
  const [diagram_xml, setDiagram_xml] = useState(task?.diagram_xml || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadedFeatures, setLoadedFeatures] = useState<Feature[]>([]);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProblems, setLoadingProblems] = useState(false);

  // Load products if not provided or empty
  useEffect(() => {
    const loadProductsData = async () => {
      if (!products || products.length === 0) {
        try {
          setLoadingProducts(true);
          const data = await productsAPI.getAll();
          setLoadedProducts(data || []);
          // Set first product as default if no product is selected and no initialProductId
          if (
            data &&
            data.length > 0 &&
            !productId &&
            !initialProductId &&
            !task?.product_id
          ) {
            setProductId(data[0].id);
          }
        } catch (err) {
          console.error("Failed to load products:", err);
          setLoadedProducts([]);
        } finally {
          setLoadingProducts(false);
        }
      } else {
        setLoadedProducts(products);
        // Set first product as default if no product is selected and no initialProductId
        if (
          products.length > 0 &&
          !productId &&
          !initialProductId &&
          !task?.product_id
        ) {
          setProductId(products[0].id);
        }
      }
    };
    loadProductsData();
  }, [products, productId, initialProductId, task?.product_id]);

  useEffect(() => {
    const loadPhases = async () => {
      try {
        const data = await phasesAPI.getAll();
        setPhases(data);
      } catch (err) {
        console.error("Failed to load phases:", err);
        setPhases([]);
      }
    };
    loadPhases();
  }, []);

  useEffect(() => {
    const loadWorkstreams = async () => {
      try {
        const data = await workstreamsAPI.getAll();
        setWorkstreams(data);
      } catch (err) {
        console.error("Failed to load workstreams:", err);
        setWorkstreams([]);
      }
    };
    loadWorkstreams();
  }, []);

  const loadModules = useCallback(async () => {
    if (productId) {
      try {
        const data = await modulesAPI.getByProduct(productId);
        setModules(data || []);
        // If initialModuleId is provided and we just loaded modules, ensure it's set
        // Note: We use setModuleId with a function to get the current moduleId value
        setModuleId((currentModuleId) => {
          if (
            initialModuleId &&
            !currentModuleId &&
            data &&
            data.some((m) => m.id === initialModuleId)
          ) {
            return initialModuleId;
          }
          return currentModuleId;
        });
      } catch (err) {
        console.error("Failed to load modules:", err);
        setModules([]);
      }
    } else {
      setModules([]);
    }
  }, [productId, initialModuleId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Listen for module creation/update/deletion events from other components
  useEffect(() => {
    const handleModuleChange = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        moduleId?: string;
        productId?: string;
      }>;
      // Only refresh if we have a productId and the event is for the current product (or no productId specified)
      if (productId) {
        if (
          !customEvent.detail?.productId ||
          customEvent.detail.productId === productId
        ) {
          // Force reload modules with fresh data
          await loadModules();
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
  }, [productId, loadModules]);

  useEffect(() => {
    const loadTasks = async () => {
      if (productId) {
        try {
          const data = await tasksAPI.getAll({ product_id: productId });
          // Exclude current task from dependencies list
          const filtered = task ? data.filter((t) => t.id !== task.id) : data;
          setAllTasks(filtered);
        } catch (err) {
          console.error("Failed to load tasks:", err);
          setAllTasks([]);
        }
      } else {
        setAllTasks([]);
      }
    };
    loadTasks();
  }, [productId, task]);

  useEffect(() => {
    const loadFeaturesForProduct = async () => {
      if (productId) {
        try {
          setLoadingFeatures(true);
          // Filter features by both product and module if module is selected
          const params: { product_id: string; module_id?: string } = {
            product_id: productId,
          };
          if (moduleId) {
            params.module_id = moduleId;
          }
          const data = await featuresAPI.getAll(params);
          setLoadedFeatures(data || []);
        } catch (err) {
          console.error("Failed to load features:", err);
          setLoadedFeatures([]);
        } finally {
          setLoadingFeatures(false);
        }
      } else {
        setLoadedFeatures([]);
      }
    };
    loadFeaturesForProduct();
  }, [productId, moduleId]);

  // Load problems for selected product
  useEffect(() => {
    const loadProblemsForProduct = async () => {
      if (productId) {
        try {
          setLoadingProblems(true);
          const data = await problemsAPI.getAll({
            product_id: productId,
            module_id: moduleId || undefined,
          });
          setProblems(data || []);
        } catch (err) {
          console.error("Failed to load problems:", err);
          setProblems([]);
        } finally {
          setLoadingProblems(false);
        }
      } else {
        setProblems([]);
      }
    };
    loadProblemsForProduct();
  }, [productId, moduleId]);

  // Use loaded products if props are empty, otherwise use props
  const availableProducts =
    loadedProducts.length > 0 ? loadedProducts : products || [];

  // Use loaded features if available, otherwise fall back to props
  // Filter features by selected product and module
  const availableFeatures = productId
    ? loadedFeatures.length > 0
      ? loadedFeatures
      : features.filter((f) => {
          const matchesProduct = f.product_id === productId;
          // If module is selected, feature must belong to that module
          // If no module is selected, show product-level features (module_id is null/empty)
          if (moduleId) {
            return matchesProduct && f.module_id === moduleId;
          } else {
            return matchesProduct && (!f.module_id || f.module_id === "");
          }
        })
    : [];

  const handleAssigneeToggle = (resourceId: string) => {
    if (assigneeIds.includes(resourceId)) {
      setAssigneeIds(assigneeIds.filter((id) => id !== resourceId));
    } else {
      setAssigneeIds([...assigneeIds, resourceId]);
    }
  };

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.title) setTitle(fields.title);
    if (fields.description) setDescription(fields.description);
    if (fields.status) setStatus(fields.status);
    if (fields.priority) setPriority(fields.priority);
    if (fields.estimated_hours !== undefined)
      setEstimatedHours(fields.estimated_hours);
    if (fields.due_date) setDueDate(fields.due_date.split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const taskData = {
        product_id: productId,
        module_id: moduleId || undefined,
        feature_id: featureId || undefined,
        problem_id: problemId || undefined,
        phase_id: phaseId || undefined,
        workstream_id: workstreamId || undefined,
        title,
        description: description || undefined,
        status,
        priority,
        assignee_ids: assigneeIds,
        depends_on_task_ids: dependsOnTaskIds,
        due_date: dueDate || undefined,
        estimated_hours: estimatedHours,
        cost_classification: cost_classification || undefined,
        diagram_xml:
          diagram_xml && diagram_xml.trim() ? diagram_xml.trim() : undefined,
      };

      if (task) {
        await tasksAPI.update(task.id, taskData);
      } else {
        await tasksAPI.create(taskData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "clamp(16px, 4vw, 24px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "clamp(16px, 4vw, 20px)",
            fontWeight: 600,
            flex: "1 1 200px",
          }}
        >
          {task ? "Edit Task" : "Create Task"}
        </h3>
        {!task && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="task"
              context={{
                productId,
                productName: availableProducts.find((p) => p.id === productId)
                  ?.name,
                moduleId,
                moduleName: modules.find((m) => m.id === moduleId)?.name,
                featureId,
                featureName: availableFeatures.find((f) => f.id === featureId)
                  ?.name,
                phaseId,
                phaseName: phases.find((p) => p.id === phaseId)?.name,
              }}
              section="execution"
              fieldOptions={{
                status: {
                  options: ["todo", "in_progress", "blocked", "done"],
                  labels: {
                    todo: "To Do",
                    in_progress: "In Progress",
                    blocked: "Blocked",
                    done: "Done",
                  },
                },
                priority: {
                  options: ["low", "medium", "high", "critical"],
                  labels: {
                    low: "Low",
                    medium: "Medium",
                    high: "High",
                    critical: "Critical",
                  },
                },
              }}
              initialPrompt={(() => {
                const parts: string[] = [];
                if (productId) {
                  const productName = availableProducts.find(
                    (p) => p.id === productId
                  )?.name;
                  if (productName) parts.push(`product "${productName}"`);
                }
                if (moduleId) {
                  const moduleName = modules.find(
                    (m) => m.id === moduleId
                  )?.name;
                  if (moduleName) parts.push(`module "${moduleName}"`);
                }
                if (featureId) {
                  const featureName = availableFeatures.find(
                    (f) => f.id === featureId
                  )?.name;
                  if (featureName) parts.push(`feature "${featureName}"`);
                }
                if (phaseId) {
                  const phaseName = phases.find((p) => p.id === phaseId)?.name;
                  if (phaseName) parts.push(`phase "${phaseName}"`);
                }
                if (parts.length > 0) {
                  return `Create a task for ${parts.join(", ")}: `;
                }
                return "Create a task: ";
              })()}
              onFillFields={handleAIFill}
            />
          </div>
        )}
      </div>

      {error && (
        <div
          className="error"
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            color: "#c33",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {diagram_xml && diagram_xml.trim() && (
        <div style={{ marginBottom: "16px" }}>
          <DrawIORenderer xmlContent={diagram_xml} />
        </div>
      )}

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="diagram">Diagram</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <Label htmlFor="product_id">Product *</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setShowProductModal(true)}
                style={{
                  padding: "0",
                  fontSize: "12px",
                  height: "auto",
                  textDecoration: "underline",
                }}
              >
                Add Product
              </Button>
            </div>
            {loadingProducts ? (
              <div
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "#f8f9fa",
                  color: "#666",
                }}
              >
                Loading products...
              </div>
            ) : (
              <Select
                value={productId || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setProductId("");
                  } else {
                    setProductId(value);
                    setModuleId(""); // Reset module when product changes
                    setFeatureId(""); // Reset feature when product changes
                    setProblemId(""); // Reset problem when product changes
                  }
                }}
                required
                disabled={!!initialProductId}
              >
                <SelectTrigger id="product_id">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 9999 }}>
                  {availableProducts.length > 0 ? (
                    availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No products available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {!loadingProducts && availableProducts.length === 0 && (
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                No products found. Click "Add Product" to create one.
              </p>
            )}
          </div>

          {productId && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <Label htmlFor="module_id">
                  Module (optional)
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--muted-foreground))",
                      fontWeight: "normal",
                    }}
                  >
                    ({modules.length} available)
                  </span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    // Dispatch event to navigate to module management
                    window.dispatchEvent(
                      new CustomEvent("navigateToModules", {
                        detail: { productId },
                      })
                    );
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
                    backgroundColor: "transparent",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary))",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  + Manage Modules
                </button>
              </div>
              <Select
                value={
                  moduleId && modules.some((m) => m.id === moduleId)
                    ? moduleId
                    : "none"
                }
                onValueChange={(value) => {
                  setModuleId(value === "none" ? "" : value);
                  setFeatureId(""); // Reset feature when module changes
                  setProblemId(""); // Reset problem when module changes
                }}
              >
                <SelectTrigger id="module_id">
                  <SelectValue placeholder="No module (product-level)" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 9999 }}>
                  {modules.length > 0 ? (
                    <>
                      <SelectItem value="none">
                        No module (product-level)
                      </SelectItem>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name} {module.is_default && "(Default)"}
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    <SelectItem value="none" disabled>
                      No modules available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {modules.length === 0 && (
                <p
                  style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
                >
                  No modules found. Click "Add Module" to create one.
                </p>
              )}
            </div>
          )}

          {productId && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <Label htmlFor="feature_id">Feature (optional)</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setShowFeatureModal(true)}
                    style={{
                      padding: "0",
                      fontSize: "12px",
                      height: "auto",
                      textDecoration: "underline",
                    }}
                  >
                    Add Feature
                  </Button>
                </div>
                {loadingFeatures ? (
                  <div
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      backgroundColor: "#f8f9fa",
                      color: "#666",
                    }}
                  >
                    Loading features...
                  </div>
                ) : (
                  <Select
                    value={
                      featureId &&
                      availableFeatures.some((f) => f.id === featureId)
                        ? featureId
                        : "none"
                    }
                    onValueChange={(value) =>
                      setFeatureId(value === "none" ? "" : value)
                    }
                    disabled={!productId}
                  >
                    <SelectTrigger id="feature_id" style={{ width: "100%" }}>
                      <SelectValue placeholder="Select a feature" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 9999 }}>
                      {availableFeatures.length > 0 ? (
                        <>
                          <SelectItem value="none">No feature</SelectItem>
                          {availableFeatures.map((feature) => (
                            <SelectItem key={feature.id} value={feature.id}>
                              {feature.name}
                            </SelectItem>
                          ))}
                        </>
                      ) : (
                        <SelectItem value="none" disabled>
                          No features available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {!loadingFeatures &&
                  availableFeatures.length === 0 &&
                  productId && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "4px",
                      }}
                    >
                      No features found. Click "Add Feature" to create one.
                    </p>
                  )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <Label htmlFor="problem_id">
                    Customer Problem (optional)
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setShowProblemModal(true)}
                    style={{
                      padding: "0",
                      fontSize: "12px",
                      height: "auto",
                      textDecoration: "underline",
                    }}
                  >
                    Add Problem
                  </Button>
                </div>
                {loadingProblems ? (
                  <div
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      backgroundColor: "#f8f9fa",
                      color: "#666",
                    }}
                  >
                    Loading problems...
                  </div>
                ) : (
                  <Select
                    value={
                      problemId && problems.some((p) => p.id === problemId)
                        ? problemId
                        : "none"
                    }
                    onValueChange={(value) =>
                      setProblemId(value === "none" ? "" : value)
                    }
                    disabled={!productId}
                  >
                    <SelectTrigger id="problem_id" style={{ width: "100%" }}>
                      <SelectValue placeholder="Select a problem" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 9999 }}>
                      {problems.length > 0 ? (
                        <>
                          <SelectItem value="none">No problem</SelectItem>
                          {problems.map((problem) => (
                            <SelectItem key={problem.id} value={problem.id}>
                              {problem.title}
                            </SelectItem>
                          ))}
                        </>
                      ) : (
                        <SelectItem value="none" disabled>
                          No problems available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {!loadingProblems && problems.length === 0 && productId && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    No problems found. Click "Add Problem" to create one.
                  </p>
                )}
              </div>
            </>
          )}

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Phase (optional)
              </label>
              <button
                type="button"
                onClick={() => {
                  // Dispatch event to navigate to phases management
                  window.dispatchEvent(new CustomEvent("navigateToPhases"));
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  backgroundColor: "transparent",
                  color: "hsl(var(--primary))",
                  border: "1px solid hsl(var(--primary))",
                  borderRadius: "4px",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                + Manage Phases
              </button>
            </div>
            <select
              value={
                phaseId && phases.some((p) => p.id === phaseId) ? phaseId : ""
              }
              onChange={(e) => setPhaseId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            >
              <option value="">No phase</option>
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label
                style={{
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Workstream (optional)
              </label>
            </div>
            <select
              value={
                workstreamId && workstreams.some((w) => w.id === workstreamId)
                  ? workstreamId
                  : ""
              }
              onChange={(e) => setWorkstreamId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            >
              <option value="">No workstream</option>
              {workstreams.map((workstream) => (
                <option key={workstream.id} value={workstream.id}>
                  {workstream.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Assignees
            </label>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              {resources.length === 0 ? (
                <p style={{ color: "#666", fontSize: "13px" }}>
                  No resources available. Create resources first.
                </p>
              ) : (
                resources.map((resource) => (
                  <label
                    key={resource.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      backgroundColor: assigneeIds.includes(resource.id)
                        ? "#e7f3ff"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(resource.id)}
                      onChange={() => handleAssigneeToggle(resource.id)}
                      style={{ marginRight: "8px" }}
                    />
                    <span style={{ fontSize: "14px" }}>
                      {resource.name} ({resource.type})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Depends On (optional)
            </label>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              {!productId ? (
                <p style={{ color: "#666", fontSize: "13px" }}>
                  Select a product first to see available tasks.
                </p>
              ) : allTasks.length === 0 ? (
                <p style={{ color: "#666", fontSize: "13px" }}>
                  No other tasks available for this product.
                </p>
              ) : (
                allTasks.map((t) => (
                  <label
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      backgroundColor: dependsOnTaskIds.includes(t.id)
                        ? "#fff3cd"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={dependsOnTaskIds.includes(t.id)}
                      onChange={() => {
                        if (dependsOnTaskIds.includes(t.id)) {
                          setDependsOnTaskIds(
                            dependsOnTaskIds.filter((id) => id !== t.id)
                          );
                        } else {
                          setDependsOnTaskIds([...dependsOnTaskIds, t.id]);
                        }
                      }}
                      style={{ marginRight: "8px" }}
                    />
                    <span style={{ fontSize: "14px" }}>
                      {t.title} ({t.status})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Due Date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Estimated Hours (optional)
            </label>
            <input
              type="number"
              value={estimatedHours || ""}
              onChange={(e) =>
                setEstimatedHours(
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              min="0"
              step="0.5"
              placeholder="Enter estimate in hours"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Estimated hours for this task
            </p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Cost Classification (Optional)
            </label>
            <select
              value={cost_classification}
              onChange={(e) =>
                setCost_classification(
                  e.target.value as CostClassification | ""
                )
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            >
              <option value="">Not specified</option>
              <option value="run">Run/KTLO (Keep The Lights On)</option>
              <option value="change">
                Change/Growth (New Feature Development)
              </option>
            </select>
            <p style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
              Run/KTLO = Ongoing maintenance. Change/Growth = New feature
              development.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="diagram" className="mt-4">
          <DiagramInput
            value={diagram_xml}
            onChange={setDiagram_xml}
            label="Diagram XML (Draw.io)"
          />
        </TabsContent>
      </Tabs>

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          marginTop: "16px",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor: "#6c757d",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            minWidth: "80px",
            flex: "1 1 auto",
            maxWidth: "150px",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim() || !productId}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor:
              loading || !title.trim() || !productId ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor:
              loading || !title.trim() || !productId
                ? "not-allowed"
                : "pointer",
            minWidth: "80px",
            flex: "1 1 auto",
            maxWidth: "150px",
          }}
        >
          {loading ? "Saving..." : task ? "Update" : "Create"}
        </button>
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title="Create Product"
      >
        <ProductForm
          onSuccess={async () => {
            setShowProductModal(false);
            // Reload products after creating
            try {
              const data = await productsAPI.getAll();
              setLoadedProducts(data || []);
            } catch (err) {
              console.error("Failed to reload products:", err);
            }
          }}
          onCancel={() => setShowProductModal(false)}
        />
      </Modal>

      {/* Feature Modal */}
      {productId &&
        (() => {
          const currentProduct = availableProducts.find(
            (p) => p.id === productId
          );
          return currentProduct ? (
            <Modal
              isOpen={showFeatureModal}
              onClose={() => setShowFeatureModal(false)}
              title="Create Feature"
            >
              <FeatureForm
                product={currentProduct}
                initialModuleId={moduleId || undefined}
                onSuccess={async () => {
                  setShowFeatureModal(false);
                  // Reload features after creating (filtered by product and module)
                  try {
                    const params: { product_id: string; module_id?: string } = {
                      product_id: productId,
                    };
                    if (moduleId) {
                      params.module_id = moduleId;
                    }
                    const data = await featuresAPI.getAll(params);
                    setLoadedFeatures(data || []);
                  } catch (err) {
                    console.error("Failed to reload features:", err);
                  }
                }}
                onCancel={() => setShowFeatureModal(false)}
              />
            </Modal>
          ) : null;
        })()}

      {/* Problem Modal */}
      {productId && (
        <Modal
          isOpen={showProblemModal}
          onClose={() => setShowProblemModal(false)}
          title="Create Customer Problem"
        >
          <ProblemForm
            productId={productId}
            moduleId={moduleId || undefined}
            onSubmit={async (problemData) => {
              try {
                await problemsAPI.create(problemData);
                setShowProblemModal(false);
                // Reload problems after creating
                try {
                  const data = await problemsAPI.getAll({
                    product_id: productId,
                    module_id: moduleId || undefined,
                  });
                  setProblems(data || []);
                } catch (err) {
                  console.error("Failed to reload problems:", err);
                }
              } catch (err) {
                console.error("Failed to create problem:", err);
                throw err;
              }
            }}
            onCancel={() => setShowProblemModal(false)}
          />
        </Modal>
      )}
    </form>
  );
}
