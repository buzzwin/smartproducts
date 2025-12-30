"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { featuresAPI, problemsAPI, modulesAPI, resourcesAPI } from "@/lib/api";
import type {
  Feature,
  Product,
  Problem,
  Module,
  CostClassification,
  Resource,
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
import ResourceForm from "./ResourceForm";
import DiagramInput from "./diagrams/DiagramInput";
import DrawIORenderer from "./diagrams/DrawIORenderer";

interface FeatureFormProps {
  feature?: Feature;
  product: Product;
  initialModuleId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FeatureForm({
  feature,
  product,
  initialModuleId,
  onSuccess,
  onCancel,
}: FeatureFormProps) {
  const [name, setName] = useState(feature?.name || "");
  const [description, setDescription] = useState(feature?.description || "");
  const [owner, setOwner] = useState(feature?.owner || "");
  const [moduleId, setModuleId] = useState(
    feature?.module_id || initialModuleId || ""
  );
  const [parentFeatureId, setParentFeatureId] = useState(
    feature?.parent_feature_id || ""
  );
  const [order, setOrder] = useState<number>(feature?.order || 0);
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>(
    feature?.problem_ids || []
  );
  const [expectedOutcomes, setExpectedOutcomes] = useState<string>(
    JSON.stringify(feature?.expected_outcomes || [], null, 2)
  );
  const [status, setStatus] = useState(feature?.status || "discovery");
  const [cost_classification, setCost_classification] = useState<
    CostClassification | ""
  >(feature?.cost_classification || "");
  const [diagram_xml, setDiagram_xml] = useState(feature?.diagram_xml || "");
  const [modules, setModules] = useState<Module[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModulesAndProblems = useCallback(async () => {
    try {
      setLoadingModules(true);
      console.log("FeatureForm: Loading modules for product:", product.id);
      const [modulesData, problemsData] = await Promise.all([
        modulesAPI.getAll({ product_id: product.id }),
        problemsAPI.getAll({ product_id: product.id }),
      ]);
      console.log(
        "FeatureForm: Modules loaded:",
        modulesData?.length || 0,
        modulesData
      );
      setModules(modulesData || []);
      setProblems(problemsData || []);
    } catch (err) {
      console.error("Failed to load modules/problems:", err);
      setModules([]);
      setProblems([]);
    } finally {
      setLoadingModules(false);
    }
  }, [product.id]);

  useEffect(() => {
    loadModulesAndProblems();
    loadResources();
  }, [loadModulesAndProblems]);

  // Listen for module creation/update/deletion events from other components
  useEffect(() => {
    const handleModuleChange = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        moduleId?: string;
        productId?: string;
      }>;
      // Only refresh if the event is for the current product
      if (
        !customEvent.detail?.productId ||
        customEvent.detail.productId === product.id
      ) {
        console.log("FeatureForm: Module change event received", {
          eventType: event.type,
          detail: customEvent.detail,
          currentProductId: product.id,
        });
        // Force reload modules with fresh data
        await loadModulesAndProblems();
        console.log("FeatureForm: Modules reloaded after", event.type);
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
  }, [product.id, loadModulesAndProblems]);

  useEffect(() => {
    loadFeatures();
  }, [product.id, moduleId]);

  const loadResources = async () => {
    try {
      setLoadingResources(true);
      const resourcesData = await resourcesAPI.getAll();
      setResources(resourcesData || []);
    } catch (err) {
      console.error("Failed to load resources:", err);
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  const loadFeatures = async () => {
    try {
      const params: { product_id: string; module_id?: string } = {
        product_id: product.id,
      };
      if (moduleId) {
        params.module_id = moduleId;
      }
      const featuresData = await featuresAPI.getAll(params);
      // Filter out the current feature if editing (to avoid self-reference)
      const filteredFeatures = feature
        ? featuresData.filter((f) => f.id !== feature.id)
        : featuresData;
      setFeatures(filteredFeatures);
    } catch (err) {
      console.error("Failed to load features:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let parsedOutcomes: string[] = [];
      try {
        parsedOutcomes = expectedOutcomes ? JSON.parse(expectedOutcomes) : [];
      } catch (e) {
        throw new Error("Invalid JSON in expected outcomes field");
      }

      const featureData = {
        product_id: product.id,
        name,
        description: description || undefined,
        owner: owner || undefined,
        module_id: moduleId && moduleId !== "none" ? moduleId : undefined,
        parent_feature_id:
          parentFeatureId && parentFeatureId !== "none"
            ? parentFeatureId
            : undefined,
        order: order || 0,
        problem_ids:
          selectedProblemIds.length > 0 ? selectedProblemIds : undefined,
        expected_outcomes:
          parsedOutcomes.length > 0 ? parsedOutcomes : undefined,
        status: status || undefined,
        cost_classification: cost_classification || undefined,
        diagram_xml:
          diagram_xml && diagram_xml.trim() ? diagram_xml.trim() : undefined,
      };

      if (feature) {
        await featuresAPI.update(feature.id, featureData);
      } else {
        await featuresAPI.create(featureData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feature");
    } finally {
      setLoading(false);
    }
  };

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.name) setName(fields.name);
    if (fields.description) setDescription(fields.description);
    if (fields.owner) setOwner(fields.owner);
    if (fields.module_id) setModuleId(fields.module_id);
    if (fields.parent_feature_id) setParentFeatureId(fields.parent_feature_id);
    if (fields.order !== undefined) setOrder(fields.order);
    if (fields.problem_ids) setSelectedProblemIds(fields.problem_ids);
    if (fields.expected_outcomes) {
      setExpectedOutcomes(JSON.stringify(fields.expected_outcomes, null, 2));
    }
    if (fields.status) setStatus(fields.status);
  };

  // Build initial prompt with product and module context - updates when moduleId changes
  const initialPrompt = useMemo(() => {
    const selectedModule = modules.find((m) => m.id === moduleId);
    let prompt = `Create a feature for product "${product.name}"`;

    if (selectedModule) {
      prompt += ` in module "${selectedModule.name}"`;
    } else if (moduleId) {
      prompt += ` in the selected module`;
    } else {
      prompt += ` (product-level, no module)`;
    }

    prompt += `. `;
    return prompt;
  }, [product.name, moduleId, modules]);

  const toggleProblem = (problemId: string) => {
    setSelectedProblemIds((prev) =>
      prev.includes(problemId)
        ? prev.filter((id) => id !== problemId)
        : [...prev, problemId]
    );
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
            flex: "1 1 200px",
            fontSize: "clamp(16px, 4vw, 20px)",
          }}
        >
          {feature ? "Edit Feature" : "Create Feature"}
        </h3>
        {!feature && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="feature"
              section="prioritization"
              context={{
                product,
                productId: product.id,
                moduleId: moduleId || undefined,
                module: modules.find((m) => m.id === moduleId),
                moduleName: modules.find((m) => m.id === moduleId)?.name,
              }}
              initialPrompt={initialPrompt}
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
            borderRadius: "6px",
            color: "#c33",
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
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
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
                  Owner (optional)
                </label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowResourceModal(true)}
                  style={{
                    padding: "0",
                    fontSize: "12px",
                    height: "auto",
                    textDecoration: "underline",
                  }}
                >
                  Add Resource
                </Button>
              </div>
              {loadingResources ? (
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
                  Loading resources...
                </div>
              ) : (
                <Select
                  value={owner || "none"}
                  onValueChange={(value) =>
                    setOwner(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger style={{ width: "100%" }}>
                    <SelectValue placeholder="Select a resource" />
                  </SelectTrigger>
                  <SelectContent style={{ zIndex: 9999 }}>
                    <SelectItem value="none">No owner</SelectItem>
                    {resources.length > 0 ? (
                      resources.map((resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.name}{" "}
                          {resource.email ? `(${resource.email})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No resources available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              {!loadingResources && resources.length === 0 && (
                <p
                  style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
                >
                  No resources found. Click "Add Resource" to create one.
                </p>
              )}
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              >
                <option value="discovery">Discovery</option>
                <option value="design">Design</option>
                <option value="development">Development</option>
                <option value="shipped">Shipped</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <Label htmlFor="module-select">Module (optional)</Label>
                <button
                  type="button"
                  onClick={() => {
                    // Dispatch event to navigate to module management
                    window.dispatchEvent(
                      new CustomEvent("navigateToModules", {
                        detail: { productId: product.id },
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
              {loadingModules ? (
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
                  Loading modules...
                </div>
              ) : (
                <div style={{ width: "100%" }}>
                  <Select
                    value={moduleId || "none"}
                    onValueChange={(value) => {
                      console.log("Module selected:", value);
                      setModuleId(value === "none" ? "" : value);
                    }}
                  >
                    <SelectTrigger id="module-select" style={{ width: "100%" }}>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 9999 }}>
                      <SelectItem value="none">
                        No module (product-level)
                      </SelectItem>
                      {modules && modules.length > 0 ? (
                        modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.name} {module.is_default && "(Default)"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No modules available (create modules in Management →
                          Modules)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {modules && modules.length === 0 && !loadingModules && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "4px",
                      }}
                    >
                      No modules found. Create modules in Management → Modules.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="parent-feature-select">
                Parent Feature (optional)
              </Label>
              <Select
                value={parentFeatureId || "none"}
                onValueChange={(value) =>
                  setParentFeatureId(value === "none" ? "" : value)
                }
                disabled={features.length === 0}
              >
                <SelectTrigger id="parent-feature-select">
                  <SelectValue placeholder="Select parent feature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {features.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="order-input">Order</Label>
              <input
                id="order-input"
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min="0"
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
          </div>

          {problems.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Linked Problems
              </label>
              <div
                style={{
                  maxHeight: "150px",
                  overflowY: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "8px",
                }}
              >
                {problems.map((problem) => (
                  <label
                    key={problem.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProblemIds.includes(problem.id)}
                      onChange={() => toggleProblem(problem.id)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                    <span>{problem.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
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

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Expected Outcomes (JSON array)
            </label>
            <textarea
              value={expectedOutcomes}
              onChange={(e) => setExpectedOutcomes(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
              placeholder='["Outcome 1", "Outcome 2", ...]'
            />
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
          disabled={loading || !name.trim()}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            backgroundColor: loading || !name.trim() ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: loading || !name.trim() ? "not-allowed" : "pointer",
            minWidth: "80px",
            flex: "1 1 auto",
            maxWidth: "150px",
          }}
        >
          {loading ? "Saving..." : feature ? "Update" : "Create"}
        </button>
      </div>

      <Modal
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        title="Create Resource"
      >
        <ResourceForm
          onSuccess={() => {
            setShowResourceModal(false);
            loadResources();
          }}
          onCancel={() => setShowResourceModal(false)}
        />
      </Modal>
    </form>
  );
}
