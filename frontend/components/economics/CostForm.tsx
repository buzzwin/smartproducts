"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  unifiedCostsAPI,
  resourcesAPI,
  modulesAPI,
  featuresAPI,
} from "@/lib/api";
import type {
  Cost,
  Product,
  Module,
  Feature,
  CostScope,
  CostCategory,
  CostType,
  CostRecurrence,
  CostClassification,
  Resource,
} from "@/types";
import Modal from "../Modal";
import FeatureForm from "../FeatureForm";
import AIAssistant from "../AIAssistant";
import VendorSelector from "../VendorSelector";

interface CostFormProps {
  cost?: Cost;
  product: Product;
  moduleId?: string; // Optional - for module-level costs
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CostForm({
  cost,
  product,
  moduleId,
  onSuccess,
  onCancel,
}: CostFormProps) {
  const [name, setName] = useState<string>(cost?.name || "");
  const [scope, setScope] = useState<CostScope>(
    (cost?.scope as CostScope) || "product"
  );
  const [scopeId, setScopeId] = useState<string>(cost?.scope_id || "");
  const [category, setCategory] = useState<string>(
    (cost?.category as unknown as string) || "build"
  );
  const [costType, setCostType] = useState<string>(
    (cost?.cost_type as unknown as string) || "labor"
  );
  const [amount, setAmount] = useState<string>(cost?.amount?.toString() || "0");
  const [currency, setCurrency] = useState<string>(cost?.currency || "USD");
  const [recurrence, setRecurrence] = useState<CostRecurrence>(
    (cost?.recurrence as CostRecurrence) || "monthly"
  );
  const [amortizationPeriod, setAmortizationPeriod] = useState<string>(
    cost?.amortization_period?.toString() || ""
  );
  const [description, setDescription] = useState<string>(
    cost?.description || ""
  );
  const [resourceId, setResourceId] = useState<string>(cost?.resource_id || "");
  const [module_id, setModule_id] = useState<string>(
    cost?.module_id || "" // Default to empty (Product Level) - don't use moduleId prop
  );
  const [cost_classification, setCost_classification] = useState<string>(
    (cost?.cost_classification as unknown as string) || ""
  );
  const [vendorId, setVendorId] = useState<string>(cost?.vendor_id || "");
  const [resources, setResources] = useState<Resource[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
    loadModules();
  }, [product.id]);

  // Don't auto-set module_id from prop - always default to Product Level (empty)

  // Load features when scope is 'feature' and module_id is set
  useEffect(() => {
    if (scope === "feature" && module_id) {
      loadFeatures();
    } else if (scope === "feature" && !module_id) {
      // Load product-level features if no module is selected
      loadFeatures();
    } else {
      setFeatures([]);
    }
  }, [scope, module_id, product.id]);

  const loadResources = async () => {
    try {
      const data = await resourcesAPI.getAll();
      setResources(data);
    } catch (err) {
      console.error("Failed to load resources:", err);
    }
  };

  const loadModules = useCallback(async () => {
    try {
      console.log("CostForm: Loading modules for product", product.id);
      const data = await modulesAPI.getByProduct(product.id);
      console.log("CostForm: Loaded modules", data?.length || 0, data);
      setModules(data || []);
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
    }
  }, [product.id]);

  // Listen for module creation/deletion events from other components
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
        console.log("CostForm: Module change event received", {
          eventType: event.type,
          detail: customEvent.detail,
          currentProductId: product.id,
        });
        // Force reload modules with fresh data
        await loadModules();
        console.log("CostForm: Modules reloaded after", event.type);
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
  }, [product.id, loadModules]);

  const loadFeatures = async () => {
    try {
      setLoadingFeatures(true);
      const params: { product_id: string; module_id?: string } = {
        product_id: product.id,
      };
      if (module_id) {
        params.module_id = module_id;
      }
      const data = await featuresAPI.getAll(params);
      setFeatures(data || []);
    } catch (err) {
      console.error("Failed to load features:", err);
      setFeatures([]);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.name) setName(fields.name);
    if (fields.scope) setScope(fields.scope as CostScope);
    if (fields.category) setCategory(fields.category);
    if (fields.cost_type) setCostType(fields.cost_type);
    if (fields.amount !== undefined && fields.amount !== null)
      setAmount(fields.amount.toString());
    if (fields.currency) setCurrency(fields.currency);
    if (fields.recurrence) setRecurrence(fields.recurrence as CostRecurrence);
    if (fields.cost_classification)
      setCost_classification(fields.cost_classification);
    if (fields.description) setDescription(fields.description);
    if (
      fields.amortization_period !== undefined &&
      fields.amortization_period !== null
    ) {
      setAmortizationPeriod(fields.amortization_period.toString());
    }
  };

  // Build initial prompt with product and module context
  const initialPrompt = useMemo(() => {
    const selectedModule = modules.find((m) => m.id === module_id);
    let prompt = `Create a cost for product "${product.name}"`;

    if (selectedModule) {
      prompt += ` in module "${selectedModule.name}"`;
    } else if (module_id) {
      prompt += ` in the selected module`;
    } else {
      prompt += ` (product-level)`;
    }

    prompt += `. `;
    return prompt;
  }, [product.name, module_id, modules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate that feature is selected when scope is 'feature'
    if (scope === "feature" && !scopeId) {
      setError("Please select a feature or create a new one.");
      setLoading(false);
      return;
    }

    // Validate that resource is selected when scope is 'resource'
    if (scope === "resource" && !resourceId) {
      setError("Please select a resource.");
      setLoading(false);
      return;
    }

    try {
      // When scope is 'module', use module_id as scope_id
      // When scope is 'resource', use resource_id as scope_id
      let finalScopeId: string | undefined;
      if (scope === "module") {
        finalScopeId = module_id || undefined;
      } else if (scope === "resource") {
        finalScopeId = resourceId || undefined;
      } else {
        finalScopeId = scopeId || undefined;
      }

      const costData = {
        product_id: product.id,
        module_id: module_id || undefined,
        name,
        scope,
        scope_id: finalScopeId,
        category: category as unknown as CostCategory,
        cost_type: costType as unknown as CostType,
        amount: parseFloat(amount),
        currency,
        recurrence: recurrence,
        amortization_period: amortizationPeriod
          ? parseInt(amortizationPeriod)
          : undefined,
        description: description || undefined,
        resource_id: resourceId || undefined,
        vendor_id: vendorId || undefined,
        cost_classification: (cost_classification || undefined) as
          | CostClassification
          | undefined,
      };

      // Validate required fields before sending
      if (!recurrence) {
        setError("Recurrence is required");
        setLoading(false);
        return;
      }

      if (cost) {
        await unifiedCostsAPI.update(cost.id, costData);
      } else {
        await unifiedCostsAPI.create(costData);
      }
      onSuccess();
    } catch (err) {
      // Error message is already formatted by fetchAPI
      setError(err instanceof Error ? err.message : "Failed to save cost");
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
            flex: "1 1 200px",
            fontSize: "clamp(16px, 4vw, 20px)",
          }}
        >
          {cost ? "Edit Cost" : "Create Cost"}
        </h3>
        {!cost && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="cost"
              section="economics"
              context={{
                product,
                productId: product.id,
                moduleId: module_id || undefined,
                module: modules.find((m) => m.id === module_id),
                moduleName: modules.find((m) => m.id === module_id)?.name,
              }}
              fieldOptions={{
                scope: {
                  options: [
                    "product",
                    "module",
                    "feature",
                    "resource",
                    "hardware",
                    "software",
                    "database",
                    "consulting",
                  ],
                  labels: {
                    product: "Product",
                    module: "Module",
                    feature: "Feature",
                    resource: "Resource",
                    hardware: "Hardware",
                    software: "Software",
                    database: "Database",
                    consulting: "Consulting",
                  },
                },
                category: {
                  options: ["build", "run", "maintain", "scale", "overhead"],
                  labels: {
                    build: "Build",
                    run: "Run",
                    maintain: "Maintain",
                    scale: "Scale",
                    overhead: "Overhead",
                  },
                },
                cost_type: {
                  options: ["labor", "infra", "license", "vendor", "other"],
                  labels: {
                    labor: "Labor",
                    infra: "Infrastructure",
                    license: "License",
                    vendor: "Vendor",
                    other: "Other",
                  },
                },
                recurrence: {
                  options: ["one-time", "monthly", "quarterly", "annual"],
                  labels: {
                    "one-time": "One-time",
                    monthly: "Monthly",
                    quarterly: "Quarterly",
                    annual: "Annual",
                  },
                },
                cost_classification: {
                  options: ["run", "change"],
                  labels: {
                    run: "Run/KTLO",
                    change: "Change/Growth",
                  },
                },
              }}
              initialPrompt={initialPrompt}
              onFillFields={handleAIFill}
            />
          </div>
        )}
      </div>

      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "hsl(var(--muted))",
          borderRadius: "6px",
          fontSize: "14px",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        <strong style={{ color: "hsl(var(--foreground))" }}>Product:</strong>{" "}
        {product.name}
      </div>

      {modules.length > 0 && (
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
              Module (Optional)
            </label>
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
          <select
            value={module_id}
            onChange={(e) => setModule_id(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              boxSizing: "border-box",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
          >
            <option value="">Product-level (no module)</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
          <p
            style={{
              marginTop: "4px",
              fontSize: "12px",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Leave empty for product-level costs, or select a module for
            module-specific costs.
          </p>
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
          onChange={(e) => setCost_classification(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: "14px",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            boxSizing: "border-box",
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
        >
          <option value="">Not specified</option>
          <option value="run">Run/KTLO (Keep The Lights On)</option>
          <option value="change">
            Change/Growth (New Feature Development)
          </option>
        </select>
        <p
          style={{
            marginTop: "4px",
            fontSize: "12px",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          Run/KTLO = Ongoing maintenance. Change/Growth = New feature
          development.
        </p>
      </div>

      {error && (
        <div
          className="error"
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "hsl(var(--destructive) / 0.1)",
            border: "1px solid hsl(var(--destructive) / 0.3)",
            borderRadius: "6px",
            color: "hsl(var(--destructive))",
            fontSize: "14px",
          }}
        >
          {error}
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
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            boxSizing: "border-box",
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
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
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 500,
              fontSize: "14px",
            }}
          >
            Scope *
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as CostScope)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              boxSizing: "border-box",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
          >
            <option value="product">Product</option>
            <option value="module">Module</option>
            <option value="feature">Feature</option>
            <option value="resource">Resource</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="database">Database</option>
            <option value="consulting">Consulting</option>
          </select>
        </div>

        {scope === "feature" && (
          <div>
            <div style={{ marginBottom: "8px" }}>
              <button
                type="button"
                onClick={() => setShowFeatureModal(true)}
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
                + Create New Feature
              </button>
            </div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Feature *
            </label>
            {loadingFeatures ? (
              <div
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Loading features...
              </div>
            ) : features.length > 0 ? (
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                }}
              >
                <option value="">Select a feature</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.name}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  padding: "12px",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  backgroundColor: "hsl(var(--muted))",
                }}
              >
                <p
                  style={{
                    margin: "0",
                    fontSize: "14px",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  No features found{module_id ? " for this module" : ""}.
                </p>
              </div>
            )}
          </div>
        )}
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
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 500,
              fontSize: "14px",
            }}
          >
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              boxSizing: "border-box",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
          >
            <option value="build">Build</option>
            <option value="run">Run</option>
            <option value="maintain">Maintain</option>
            <option value="scale">Scale</option>
            <option value="overhead">Overhead</option>
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
            Cost Type *
          </label>
          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              boxSizing: "border-box",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
          >
            <option value="labor">Labor</option>
            <option value="infra">Infrastructure</option>
            <option value="license">License</option>
            <option value="vendor">Vendor</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {costType === "vendor" && (
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 500,
              fontSize: "14px",
            }}
          >
            Vendor (Optional)
          </label>
          <VendorSelector
            value={vendorId}
            onValueChange={setVendorId}
          />
          <p
            style={{
              marginTop: "4px",
              fontSize: "12px",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Select a vendor for this cost, or create/manage vendors using the buttons above.
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
            Amount *
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              boxSizing: "border-box",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
          />
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
            Currency *
          </label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              boxSizing: "border-box",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
          />
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
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 500,
              fontSize: "14px",
            }}
          >
            Recurrence *
          </label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as CostRecurrence)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              boxSizing: "border-box",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
            }}
          >
            <option value="one-time">One-time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        {recurrence === "one-time" && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Amortization Period (months)
            </label>
            <input
              type="number"
              value={amortizationPeriod}
              onChange={(e) => setAmortizationPeriod(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                boxSizing: "border-box",
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
              }}
            />
          </div>
        )}
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
          Resource {scope === "resource" ? "*" : "(optional)"}
        </label>
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          required={scope === "resource"}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: "14px",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            boxSizing: "border-box",
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
        >
          <option value="">None</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name}
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
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: "14px",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            boxSizing: "border-box",
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "24px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            backgroundColor: "hsl(var(--secondary))",
            color: "hsl(var(--secondary-foreground))",
            cursor: "pointer",
            minWidth: "100px",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: loading
              ? "hsl(var(--muted))"
              : "hsl(var(--primary))",
            color: loading
              ? "hsl(var(--muted-foreground))"
              : "hsl(var(--primary-foreground))",
            cursor: loading ? "not-allowed" : "pointer",
            minWidth: "100px",
          }}
        >
          {loading ? "Saving..." : cost ? "Update" : "Create"}
        </button>
      </div>

      {/* Feature Creation Modal */}
      <Modal
        isOpen={showFeatureModal}
        onClose={() => setShowFeatureModal(false)}
        title="Create Feature"
      >
        <FeatureForm
          product={product}
          initialModuleId={module_id || undefined}
          onSuccess={async () => {
            setShowFeatureModal(false);
            await loadFeatures();
            // Optionally set the newly created feature as selected
            // This would require getting the created feature ID, which is complex
            // For now, just reload features and let user select
          }}
          onCancel={() => setShowFeatureModal(false)}
        />
      </Modal>
    </form>
  );
}
