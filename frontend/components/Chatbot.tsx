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
  const [resources, setResources] = useState<Resource[]>([]);
  const [editingEntity, setEditingEntity] = useState<ExtractedEntity | null>(
    null
  );
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

  // Load phases and other data when chatbot opens
  useEffect(() => {
    if (open) {
      loadPhases();
      if (productId) {
        loadProductData();
      }
    }
  }, [open, productId]);

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
      const [productsData, featuresData, resourcesData] = await Promise.all([
        productsAPI.getAll(),
        productId
          ? featuresAPI.getAll({ product_id: productId })
          : Promise.resolve([]),
        resourcesAPI.getAll(),
      ]);
      setProducts(productsData);
      setFeatures(featuresData);
      setResources(resourcesData);
    } catch (err) {
      console.error("Failed to load product data:", err);
    }
  };

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
          productId,
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
    setEditingEntity(entity);
  };

  const handleCloseEdit = () => {
    setEditingEntity(null);
  };

  const handleEditSuccess = async () => {
    // Remove from preview after successful edit
    if (editingEntity) {
      setPreviewEntities((prev) =>
        prev.filter((e) => e.id !== editingEntity.id)
      );
    }
    const entityType = editingEntity?.entityType;
    setEditingEntity(null);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Entity created successfully!",
        timestamp: new Date(),
      },
    ]);
    // Dispatch refresh event
    window.dispatchEvent(
      new CustomEvent("entityCreated", {
        detail: { type: entityType },
      })
    );
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
                {previewEntities.map((entity) => (
                  <Card key={entity.id} className="mb-2">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 items-center">
                          <CardTitle className="text-sm">
                            {getEntityDisplayName(entity)}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {entity.entityType}
                          </Badge>
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
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddEntity(entity)}
                            disabled={creating[entity.id || ""]}
                            className="h-7 text-xs"
                          >
                            {creating[entity.id || ""] ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDiscardEntity(entity.id || "")}
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
                ))}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleAddAll}
                    disabled={Object.values(creating).some((v) => v)}
                    className="text-xs"
                  >
                    {Object.values(creating).some((v) => v) ? (
                      <>
                        <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-1 w-3 h-3" />
                        Add All
                      </>
                    )}
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
              task={
                {
                  id: "",
                  product_id: editingEntity.data.product_id || productId || "",
                  module_id: editingEntity.data.module_id || moduleId,
                  feature_id: editingEntity.data.feature_id,
                  problem_id: editingEntity.data.problem_id,
                  phase_id: editingEntity.data.phase_id,
                  title: editingEntity.data.title || "",
                  description: editingEntity.data.description,
                  status: editingEntity.data.status || "todo",
                  priority: editingEntity.data.priority || "medium",
                  assignee_ids: editingEntity.data.assignee_ids || [],
                  depends_on_task_ids:
                    editingEntity.data.depends_on_task_ids || [],
                  estimated_hours: editingEntity.data.estimated_hours,
                  due_date: editingEntity.data.due_date,
                  cost_classification: editingEntity.data.cost_classification,
                } as Task
              }
              products={products}
              features={features}
              resources={resources}
              initialProductId={editingEntity.data.product_id || productId}
              initialModuleId={editingEntity.data.module_id || moduleId}
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
          {editingEntity.entityType === "problem" &&
            editingEntity.data.product_id && (
              <ProblemForm
                problem={
                  {
                    id: "",
                    product_id: editingEntity.data.product_id,
                    module_id: editingEntity.data.module_id,
                    title: editingEntity.data.title || "",
                    description: editingEntity.data.description,
                    status: editingEntity.data.status || "identified",
                    priority: editingEntity.data.priority || "medium",
                  } as any
                }
                productId={editingEntity.data.product_id}
                moduleId={editingEntity.data.module_id || moduleId}
                onSubmit={handleEditSuccess}
                onCancel={handleCloseEdit}
              />
            )}
        </Modal>
      )}
    </>
  );
}
