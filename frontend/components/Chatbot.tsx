"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  X,
  Check,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  productsAPI,
  modulesAPI,
  featuresAPI,
  tasksAPI,
  resourcesAPI,
  phasesAPI,
  workstreamsAPI,
  problemsAPI,
  strategiesAPI,
  unifiedCostsAPI,
} from "@/lib/api";
import type {
  Product,
  Module,
  Feature,
  Task,
  Resource,
  Phase,
  Workstream,
  Problem,
} from "@/types";
import Modal from "./Modal";
import TaskForm from "./TaskForm";
import FeatureForm from "./FeatureForm";
import ProductForm from "./ProductForm";
import ProblemForm from "./discovery/ProblemForm";
import ResourceForm from "./ResourceForm";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ExtractedEntity {
  entityType: string;
  data: Record<string, any>;
  confidence: number;
  id?: string; // For tracking in preview
  possibleTypes?: string[]; // Alternative entity types if uncertain
}

interface ChatbotProps {
  productId?: string;
  moduleId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function Chatbot({
  productId,
  moduleId,
  open: controlledOpen,
  onOpenChange,
}: ChatbotProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. Tell me what you'd like to create - I can help you create products, modules, features, tasks, resources, phases, and more. Just describe what you need, and I'll show you a preview!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewEntities, setPreviewEntities] = useState<ExtractedEntity[]>([]);
  const [creating, setCreating] = useState<Record<string, boolean>>({});
  const [phases, setPhases] = useState<Phase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [editingEntity, setEditingEntity] = useState<ExtractedEntity | null>(
    null
  );
  // Selected context for AI assistant
  const [selectedProductId, setSelectedProductId] = useState<string>(
    productId || ""
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    moduleId || ""
  );
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync props with selected state when they change
  useEffect(() => {
    if (productId && productId !== selectedProductId) {
      setSelectedProductId(productId);
    }
    if (moduleId && moduleId !== selectedModuleId) {
      setSelectedModuleId(moduleId);
    }
  }, [productId, moduleId]);

  // Load phases and other data when chatbot opens - optimized to load all data upfront
  useEffect(() => {
    if (open) {
      // Load all data in parallel for better performance
      Promise.all([
        loadPhases(),
        loadProductData(), // Load all products, not just for specific productId
      ]).catch((err) => {
        console.error("Failed to load initial data:", err);
      });
    }
  }, [open]);

  const loadPhases = async () => {
    try {
      const data = await phasesAPI.getAll();
      setPhases(data);
    } catch (err) {
      console.error("Failed to load phases:", err);
    }
  };

  const loadProductData = async () => {
    try {
      // Load all products and resources upfront for better UX
      const [productsData, resourcesData] = await Promise.all([
        productsAPI.getAll(),
        resourcesAPI.getAll(),
      ]);
      setProducts(productsData);
      setResources(resourcesData);

      // Load modules and features if productId is available
      if (productId || selectedProductId) {
        const prodId = selectedProductId || productId;
        if (prodId) {
          try {
            const [modulesData, featuresData] = await Promise.all([
              modulesAPI.getByProduct(prodId),
              featuresAPI.getAll({ product_id: prodId }),
            ]);
            setModules(modulesData);
            setFeatures(featuresData);
          } catch (err) {
            console.error("Failed to load modules/features:", err);
            setModules([]);
            setFeatures([]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load product data:", err);
    }
  };

  // Load modules when product is selected
  const loadModulesForProduct = async (prodId: string) => {
    if (!prodId) {
      setModules([]);
      setFeatures([]);
      setSelectedModuleId("");
      setSelectedFeatureId("");
      return;
    }
    try {
      const modulesData = await modulesAPI.getByProduct(prodId);
      setModules(modulesData);
      // Reset module and feature selection when product changes
      setSelectedModuleId("");
      setSelectedFeatureId("");
      setFeatures([]);
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
    }
  };

  // Load features when module is selected
  const loadFeaturesForModule = async (prodId: string, modId: string) => {
    if (!prodId || !modId) {
      if (!modId) {
        // If no module, load all features for product
        try {
          const featuresData = await featuresAPI.getAll({ product_id: prodId });
          setFeatures(featuresData);
        } catch (err) {
          console.error("Failed to load features:", err);
          setFeatures([]);
        }
      }
      setSelectedFeatureId("");
      return;
    }
    try {
      const featuresData = await featuresAPI.getAll({
        product_id: prodId,
        module_id: modId,
      });
      setFeatures(featuresData);
      // Reset feature selection when module changes
      setSelectedFeatureId("");
    } catch (err) {
      console.error("Failed to load features:", err);
      setFeatures([]);
    }
  };

  // Handle product selection change
  useEffect(() => {
    if (selectedProductId) {
      loadModulesForProduct(selectedProductId);
    } else {
      setModules([]);
      setFeatures([]);
    }
  }, [selectedProductId]);

  // Handle module selection change
  useEffect(() => {
    if (selectedProductId && selectedModuleId) {
      loadFeaturesForModule(selectedProductId, selectedModuleId);
    } else if (selectedProductId && !selectedModuleId) {
      // Load all features for product if no module selected
      loadFeaturesForModule(selectedProductId, "");
    }
  }, [selectedModuleId, selectedProductId]);

  // Match phase reference to actual phase
  const matchPhase = (phaseRef: string): Phase | null => {
    if (!phaseRef || phases.length === 0) return null;

    const lowerRef = phaseRef.toLowerCase().trim();

    // Try exact name match
    let phase = phases.find((p) => p.name.toLowerCase() === lowerRef);
    if (phase) return phase;

    // Try "Phase 1", "phase 1", "1" pattern
    const numberMatch = lowerRef.match(/phase\s*(\d+)|^(\d+)$/);
    if (numberMatch) {
      const phaseNumber = parseInt(numberMatch[1] || numberMatch[2], 10);
      // Match by order (assuming order starts at 0 or 1)
      phase = phases.find(
        (p) => p.order === phaseNumber - 1 || p.order === phaseNumber
      );
      if (phase) return phase;
      // Or match by name containing the number
      phase = phases.find(
        (p) =>
          p.name.toLowerCase().includes(`phase ${phaseNumber}`) ||
          p.name.toLowerCase().includes(`${phaseNumber}`)
      );
      if (phase) return phase;
    }

    // Try partial name match
    phase = phases.find((p) => p.name.toLowerCase().includes(lowerRef));
    if (phase) return phase;

    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Check for commands
    const lowerInput = input.toLowerCase().trim();
    if (
      lowerInput === "add" ||
      lowerInput === "create" ||
      lowerInput === "save"
    ) {
      await handleAddAll();
      setLoading(false);
      return;
    }

    if (
      lowerInput === "discard" ||
      lowerInput === "cancel" ||
      lowerInput === "ignore"
    ) {
      setPreviewEntities([]);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Discarded all preview entities.",
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
      return;
    }

    if (lowerInput.startsWith("edit ")) {
      const entityId = lowerInput.replace("edit ", "").trim();
      const entity = previewEntities.find((e) => e.id === entityId);
      if (entity) {
        handleEdit(entity);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Entity ${entityId} not found in preview.`,
            timestamp: new Date(),
          },
        ]);
      }
      setLoading(false);
      return;
    }

    try {
      // Call extraction API
      const response = await fetch("/api/ai/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          conversationHistory: messages.slice(-5), // Last 5 messages for context
          productId: selectedProductId || productId,
          moduleId: selectedModuleId || moduleId,
          featureId: selectedFeatureId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const result = await response.json();

      // Add entities to preview
      if (result.entities && result.entities.length > 0) {
        const newEntities = result.entities.map(
          (entity: any, index: number) => {
            // Match phase if phase_id is a string reference (e.g., "Phase 1")
            if (
              entity.entityType === "task" &&
              entity.data.phase_id &&
              typeof entity.data.phase_id === "string"
            ) {
              const matchedPhase = matchPhase(entity.data.phase_id);
              if (matchedPhase) {
                entity.data.phase_id = matchedPhase.id;
              } else {
                // If phase not found, try to extract from the original message
                const phaseRef = entity.data.phase_id;
                const matchedPhase2 = matchPhase(phaseRef);
                if (matchedPhase2) {
                  entity.data.phase_id = matchedPhase2.id;
                } else {
                  // Remove invalid phase_id
                  delete entity.data.phase_id;
                }
              }
            }
            return {
              ...entity,
              id: `preview-${Date.now()}-${index}`,
            };
          }
        );
        setPreviewEntities((prev) => [...prev, ...newEntities]);
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            result.message || "I've extracted some entities from your message.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAll = async () => {
    if (previewEntities.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "No entities to add. Please describe what you'd like to create first.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    for (const entity of previewEntities) {
      await handleAddEntity(entity);
    }
  };

  const handleAddEntity = async (entity: ExtractedEntity) => {
    if (creating[entity.id || ""]) return;

    setCreating((prev) => ({ ...prev, [entity.id || ""]: true }));

    try {
      // Add product_id/module_id if available
      const entityData = { ...entity.data };
      if (productId && !entityData.product_id) {
        entityData.product_id = productId;
      }
      if (moduleId && !entityData.module_id) {
        entityData.module_id = moduleId;
      }

      // Set default values for required fields that might be missing
      if (entity.entityType === "task") {
        if (!entityData.status) {
          entityData.status = "todo";
        }
        if (!entityData.priority) {
          entityData.priority = "medium";
        }
        if (!entityData.assignee_ids) {
          entityData.assignee_ids = [];
        }
      } else if (entity.entityType === "problem") {
        if (!entityData.status) {
          entityData.status = "identified";
        }
        if (!entityData.priority) {
          entityData.priority = "medium";
        }
      } else if (entity.entityType === "strategy") {
        if (!entityData.status) {
          entityData.status = "draft";
        }
      } else if (entity.entityType === "phase") {
        if (entityData.order === undefined || entityData.order === null) {
          entityData.order = 0;
        }
      } else if (entity.entityType === "resource") {
        if (!entityData.skills) {
          entityData.skills = [];
        }
      } else if (entity.entityType === "cost") {
        if (!entityData.currency) {
          entityData.currency = "USD";
        }
      }

      let created: any;
      // Type assertion needed since AI extraction may not match exact types
      const typedData = entityData as any;

      switch (entity.entityType) {
        case "product":
          created = await productsAPI.create(typedData);
          break;
        case "module":
          if (!typedData.product_id) {
            throw new Error("Module requires a product_id");
          }
          created = await modulesAPI.create(typedData);
          break;
        case "feature":
          if (!typedData.product_id) {
            throw new Error("Feature requires a product_id");
          }
          created = await featuresAPI.create(typedData);
          break;
        case "task":
          if (!typedData.product_id) {
            throw new Error("Task requires a product_id");
          }
          created = await tasksAPI.create(typedData);
          break;
        case "resource":
          created = await resourcesAPI.create(typedData);
          break;
        case "phase":
          created = await phasesAPI.create(typedData);
          break;
        case "workstream":
          if (!typedData.product_id) {
            throw new Error("Workstream requires a product_id");
          }
          created = await workstreamsAPI.create(typedData);
          break;
        case "problem":
          if (!typedData.product_id) {
            throw new Error("Problem requires a product_id");
          }
          created = await problemsAPI.create(typedData);
          break;
        case "strategy":
          if (!typedData.product_id) {
            throw new Error("Strategy requires a product_id");
          }
          created = await strategiesAPI.create(typedData);
          break;
        case "cost":
          if (!typedData.product_id) {
            throw new Error("Cost requires a product_id");
          }
          created = await unifiedCostsAPI.create(typedData);
          break;
        default:
          throw new Error(`Unknown entity type: ${entity.entityType}`);
      }

      // Remove from preview
      setPreviewEntities((prev) => prev.filter((e) => e.id !== entity.id));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Created ${entity.entityType}: ${
            created.name || created.title || created.id
          }`,
          timestamp: new Date(),
        },
      ]);

      // Dispatch refresh event
      window.dispatchEvent(
        new CustomEvent("entityCreated", {
          detail: { type: entity.entityType },
        })
      );
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Failed to create ${entity.entityType}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setCreating((prev) => {
        const next = { ...prev };
        delete next[entity.id || ""];
        return next;
      });
    }
  };

  const handleEdit = (entity: ExtractedEntity) => {
    // Load features if editing a task/feature and product_id is available
    if (
      (entity.entityType === "task" || entity.entityType === "feature") &&
      entity.data.product_id
    ) {
      // Load features for the product if not already loaded
      loadFeaturesForModule(
        entity.data.product_id,
        entity.data.module_id || ""
      );
    }
    setEditingEntity(entity);
  };

  const handleEntityTypeChange = (entityId: string, newType: string) => {
    setPreviewEntities((prev) =>
      prev.map((entity) =>
        entity.id === entityId ? { ...entity, entityType: newType } : entity
      )
    );
  };

  const getPossibleEntityTypes = (entity: ExtractedEntity): string[] => {
    // If entity has possibleTypes, use those
    if (entity.possibleTypes && entity.possibleTypes.length > 0) {
      return entity.possibleTypes;
    }

    // Otherwise, suggest types based on confidence and data structure
    const possibleTypes: string[] = [entity.entityType];

    // If confidence is low, suggest similar types
    if (entity.confidence < 0.7) {
      if (
        entity.entityType === "task" ||
        entity.entityType === "feature" ||
        entity.entityType === "problem"
      ) {
        // These are often confused
        if (!possibleTypes.includes("task")) possibleTypes.push("task");
        if (!possibleTypes.includes("feature")) possibleTypes.push("feature");
        if (!possibleTypes.includes("problem")) possibleTypes.push("problem");
      }
    }

    return possibleTypes;
  };

  const handleCloseEdit = () => {
    setEditingEntity(null);
  };

  const handleEditSuccess = async () => {
    // Remove from preview after successful edit
    if (editingEntity) {
      const entityType = editingEntity.entityType;
      const entityName =
        editingEntity.data.name || editingEntity.data.title || entityType;
      const currentEntity = editingEntity;

      setPreviewEntities((prev) => {
        const remaining = prev.filter((e) => e.id !== currentEntity.id);
        // If there are more entities in preview, automatically show the next one for editing
        if (remaining.length > 0) {
          // Small delay to allow the modal to close first
          setTimeout(() => {
            handleEdit(remaining[0]);
          }, 100);
        }
        return remaining;
      });

      setEditingEntity(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Created ${entityType}: ${entityName}`,
          timestamp: new Date(),
        },
      ]);
      // Dispatch refresh event
      window.dispatchEvent(
        new CustomEvent("entityCreated", {
          detail: { type: entityType },
        })
      );
    }
  };

  const handleDiscardEntity = (entityId: string) => {
    setPreviewEntities((prev) => prev.filter((e) => e.id !== entityId));
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Discarded entity from preview.",
        timestamp: new Date(),
      },
    ]);
  };

  const getEntityDisplayName = (entity: ExtractedEntity): string => {
    return (
      entity.data.name ||
      entity.data.title ||
      `${entity.entityType} (${entity.id?.slice(-6)})`
    );
  };

  return (
    <>
      {controlledOpen === undefined && (
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          size="sm"
          className="fixed right-4 bottom-4 z-50 rounded-full shadow-lg"
        >
          <MessageSquare className="mr-2 w-5 h-5" />
          AI Chatbot
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center">
              <MessageSquare className="w-5 h-5" />
              AI Entity Creation Chatbot
            </DialogTitle>
            <DialogDescription>
              Describe what you want to create, and I'll extract it and show you
              a preview. Say "add" to create, "edit" to modify, or "discard" to
              cancel.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col flex-1 min-h-0">
            {/* Messages */}
            <div className="overflow-y-auto flex-1 p-4 mb-4 space-y-4 rounded-lg bg-muted/30">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-lg border bg-background">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preview Section */}
            {previewEntities.length > 0 && (
              <div className="overflow-y-auto p-4 mb-4 space-y-2 max-h-64 bg-blue-50 rounded-lg border dark:bg-blue-950">
                <h4 className="mb-2 text-sm font-semibold">
                  Preview ({previewEntities.length} entity
                  {previewEntities.length !== 1 ? "ies" : "y"})
                </h4>
                {previewEntities.map((entity) => {
                  const possibleTypes = getPossibleEntityTypes(entity);
                  const showTypeSelector =
                    entity.confidence < 0.9 || possibleTypes.length > 1;
                  const entityTypes = [
                    "product",
                    "module",
                    "feature",
                    "task",
                    "problem",
                    "strategy",
                    "resource",
                    "phase",
                    "workstream",
                    "cost",
                  ];

                  return (
                    <Card key={entity.id} className="mb-2">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap gap-2 justify-between items-center">
                          <div className="flex flex-wrap gap-2 items-center">
                            <CardTitle className="text-sm">
                              {getEntityDisplayName(entity)}
                            </CardTitle>
                            {showTypeSelector ? (
                              <Select
                                value={entity.entityType}
                                onValueChange={(newType) =>
                                  handleEntityTypeChange(
                                    entity.id || "",
                                    newType
                                  )
                                }
                              >
                                <SelectTrigger className="h-6 text-xs w-auto min-w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[10001]">
                                  {entityTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type.charAt(0).toUpperCase() +
                                        type.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {entity.entityType}
                              </Badge>
                            )}
                            <Badge
                              variant={
                                entity.confidence > 0.7
                                  ? "default"
                                  : entity.confidence > 0.4
                                  ? "secondary"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {Math.round(entity.confidence * 100)}% confident
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(entity)}
                              className="h-7 text-xs"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDiscardEntity(entity.id || "")
                              }
                              className="h-7 text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription className="text-xs">
                          <pre className="overflow-x-auto p-2 text-xs rounded bg-muted">
                            {JSON.stringify(entity.data, null, 2)}
                          </pre>
                        </CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Edit all entities - show modal for first one, then user can proceed
                      if (previewEntities.length > 0) {
                        handleEdit(previewEntities[0]);
                      }
                    }}
                    className="text-xs"
                  >
                    <Edit2 className="mr-1 w-3 h-3" />
                    Edit All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewEntities([]);
                      setMessages((prev) => [
                        ...prev,
                        {
                          role: "assistant",
                          content: "Discarded all preview entities.",
                          timestamp: new Date(),
                        },
                      ]);
                    }}
                    className="text-xs"
                  >
                    <X className="mr-1 w-3 h-3" />
                    Discard All
                  </Button>
                </div>
              </div>
            )}

            {/* Context Selectors */}
            <div className="grid grid-cols-3 gap-2 p-3 mb-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Product
                </label>
                <Select
                  value={selectedProductId || undefined}
                  onValueChange={(value) => {
                    setSelectedProductId(value === "none" ? "" : value);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="none">None</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Module
                </label>
                <Select
                  value={selectedModuleId || undefined}
                  onValueChange={(value) => {
                    setSelectedModuleId(value === "none" ? "" : value);
                  }}
                  disabled={!selectedProductId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="none">None</SelectItem>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Feature
                </label>
                <Select
                  value={selectedFeatureId || undefined}
                  onValueChange={(value) => {
                    setSelectedFeatureId(value === "none" ? "" : value);
                  }}
                  disabled={!selectedProductId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select feature" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="none">None</SelectItem>
                    {features.map((feature) => (
                      <SelectItem key={feature.id} value={feature.id}>
                        {feature.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe what you want to create... (e.g., 'Create a task to implement user authentication')"
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal for different entity types */}
      {editingEntity && (
        <Modal
          isOpen={!!editingEntity}
          onClose={handleCloseEdit}
          title={`Edit ${editingEntity.entityType}`}
        >
          {editingEntity.entityType === "task" && (
            <TaskForm
              task={undefined}
              products={[]}
              features={[]}
              resources={resources}
              initialProductId={editingEntity.data.product_id || productId}
              initialModuleId={editingEntity.data.module_id || moduleId}
              initialProblemId={editingEntity.data.problem_id}
              initialFeatureId={editingEntity.data.feature_id}
              initialPhaseId={editingEntity.data.phase_id}
              initialWorkstreamId={editingEntity.data.workstream_id}
              initialTitle={editingEntity.data.title}
              initialDescription={editingEntity.data.description}
              initialStatus={editingEntity.data.status || "todo"}
              initialPriority={editingEntity.data.priority || "medium"}
              initialAssigneeIds={editingEntity.data.assignee_ids || []}
              initialDependsOnTaskIds={
                editingEntity.data.depends_on_task_ids || []
              }
              initialDueDate={editingEntity.data.due_date}
              initialEstimatedHours={editingEntity.data.estimated_hours}
              initialCostClassification={editingEntity.data.cost_classification}
              onSuccess={handleEditSuccess}
              onCancel={handleCloseEdit}
            />
          )}
          {editingEntity.entityType === "feature" &&
            editingEntity.data.product_id && (
              <FeatureForm
                feature={
                  {
                    id: "",
                    product_id: editingEntity.data.product_id,
                    module_id: editingEntity.data.module_id,
                    name: editingEntity.data.name || "",
                    description: editingEntity.data.description,
                    priority: editingEntity.data.priority,
                    status: editingEntity.data.status,
                  } as any
                }
                product={
                  products.find(
                    (p) => p.id === editingEntity.data.product_id
                  ) || products[0]
                }
                initialModuleId={editingEntity.data.module_id || moduleId}
                onSuccess={handleEditSuccess}
                onCancel={handleCloseEdit}
              />
            )}
          {editingEntity.entityType === "product" && (
            <ProductForm
              product={
                {
                  id: "",
                  name: editingEntity.data.name || "",
                  description: editingEntity.data.description,
                  status: editingEntity.data.status || "active",
                } as any
              }
              onSuccess={handleEditSuccess}
              onCancel={handleCloseEdit}
            />
          )}
          {editingEntity.entityType === "problem" && (
            <ProblemForm
              problem={
                {
                  id: "",
                  product_id: editingEntity.data.product_id || productId || "",
                  module_id: editingEntity.data.module_id || moduleId,
                  title: editingEntity.data.title || "",
                  description: editingEntity.data.description,
                  status: editingEntity.data.status || "identified",
                  priority: editingEntity.data.priority || "medium",
                } as any
              }
              productId={editingEntity.data.product_id || productId || ""}
              moduleId={editingEntity.data.module_id || moduleId}
              onSubmit={async (problemData) => {
                try {
                  // Ensure product_id is set (required)
                  if (!problemData.product_id) {
                    problemData.product_id = productId || "";
                  }
                  if (!problemData.product_id) {
                    throw new Error(
                      "Product ID is required to create a problem"
                    );
                  }

                  // Create the problem via API
                  await problemsAPI.create(problemData);

                  // Then call handleEditSuccess to clean up and show success message
                  handleEditSuccess();
                } catch (err) {
                  console.error("Failed to create problem:", err);
                  throw err; // Re-throw so ProblemForm can show the error
                }
              }}
              onCancel={handleCloseEdit}
            />
          )}
          {editingEntity.entityType === "resource" && (
            <ResourceForm
              resource={
                {
                  id: "",
                  name: editingEntity.data.name || "",
                  type: editingEntity.data.type || "individual",
                  skills: editingEntity.data.skills || [],
                  email: editingEntity.data.email,
                  description: editingEntity.data.description,
                } as Resource
              }
              onSuccess={handleEditSuccess}
              onCancel={handleCloseEdit}
            />
          )}
        </Modal>
      )}
    </>
  );
}
