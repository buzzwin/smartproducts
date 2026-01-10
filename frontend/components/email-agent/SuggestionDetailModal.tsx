"use client";

import { useState, useEffect } from "react";
import Modal from "../Modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emailAgentAPI, productsAPI, modulesAPI, tasksAPI } from "@/lib/api";
import type { ProcessedEmail, Product, Module, Task, Resource } from "@/types";
import { Check, X, Send, Link as LinkIcon, Trash2, Plus } from "lucide-react";
import FeatureForm from "../FeatureForm";
import TaskForm from "../TaskForm";
import { resourcesAPI } from "@/lib/api";

interface SuggestionDetailModalProps {
  suggestion: ProcessedEmail;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function SuggestionDetailModal({
  suggestion,
  isOpen,
  onClose,
  onUpdate,
}: SuggestionDetailModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [matchingTasks, setMatchingTasks] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>(suggestion.suggested_data || {});
  const [selectedProductId, setSelectedProductId] = useState<string>(
    suggestion.suggested_data?.product_id || ""
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    suggestion.suggested_data?.module_id || ""
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    suggestion.correlated_task_id || ""
  );
  const [updateStatus, setUpdateStatus] = useState(false);
  const [addComment, setAddComment] = useState(false);
  const [responseText, setResponseText] = useState(
    formData.suggested_response_text || ""
  );
  const [ccEmails, setCcEmails] = useState<string>("");
  const [selectedCcResources, setSelectedCcResources] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset form state when modal opens
      const suggestedData = suggestion.suggested_data || {};
      setFormData(suggestedData);
      setSelectedProductId(suggestedData.product_id || "");
      setSelectedModuleId(suggestedData.module_id || "");
      loadData();
    }
  }, [isOpen, suggestion.id]);

  // Load modules when product changes
  useEffect(() => {
    const loadModulesForProduct = async () => {
      if (selectedProductId) {
        try {
          const modulesData = await modulesAPI.getByProduct(selectedProductId);
          setModules(modulesData || []);
        } catch (error) {
          console.error("Failed to load modules:", error);
          setModules([]);
        }
      } else {
        setModules([]);
      }
    };
    loadModulesForProduct();
  }, [selectedProductId]);

  // Load matching tasks when product is selected for task/feature suggestions
  useEffect(() => {
    const loadMatchingTasks = async () => {
      if (selectedProductId && (suggestion.suggested_entity_type === "task" || suggestion.suggested_entity_type === "feature")) {
        setLoadingMatches(true);
        try {
          const data = await emailAgentAPI.getMatchingTasks(
            suggestion.id,
            selectedProductId,
            selectedModuleId || undefined
          );
          setMatchingTasks(data.matches || []);
        } catch (error) {
          console.error("Failed to load matching tasks:", error);
          setMatchingTasks([]);
        } finally {
          setLoadingMatches(false);
        }
      } else {
        setMatchingTasks([]);
      }
    };
    loadMatchingTasks();
  }, [selectedProductId, selectedModuleId, suggestion.id, suggestion.suggested_entity_type]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, tasksData, resourcesData] = await Promise.all([
        productsAPI.getAll(),
        tasksAPI.getAll(),
        resourcesAPI.getAll(),
      ]);
      setProducts(productsData || []);
      setTasks(tasksData || []);
      setResources(resourcesData || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const overrides: any = {};

      if (suggestion.suggested_entity_type === "feature" || suggestion.suggested_entity_type === "task") {
        if (selectedProductId) overrides.product_id = selectedProductId;
        if (selectedModuleId) overrides.module_id = selectedModuleId;
        // Merge other form fields
        Object.assign(overrides, formData);
      } else if (suggestion.suggested_entity_type === "response") {
        if (responseText) overrides.response_text = responseText;
      } else if (suggestion.suggested_entity_type === "correlate_task") {
        overrides.task_id = selectedTaskId;
        overrides.update_status = updateStatus;
        overrides.add_comment = addComment;
        if (updateStatus && formData.status) {
          overrides.status = formData.status;
        }
        if (addComment && formData.comment_text) {
          overrides.comment_text = formData.comment_text;
        }
      }

      await emailAgentAPI.approveSuggestion(suggestion.id, overrides);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to approve suggestion:", error);
      alert("Failed to approve suggestion. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendResponse = async () => {
    setSaving(true);
    try {
      // Combine resource emails and manually entered emails
      const resourceEmails = selectedCcResources
        .map((id) => {
          const resource = resources.find((r) => r.id === id);
          return resource?.email;
        })
        .filter((email): email is string => !!email);
      
      const manualEmails = ccEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      
      const allCcEmails = [...resourceEmails, ...manualEmails].join(", ");
      
      await emailAgentAPI.sendResponse(
        suggestion.id, 
        responseText, 
        undefined, 
        allCcEmails || undefined
      );
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to send response:", error);
      alert("Failed to send response. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCorrelate = async () => {
    if (!selectedTaskId) {
      alert("Please select a task to correlate with.");
      return;
    }
    setSaving(true);
    try {
      await emailAgentAPI.correlateToTask(
        suggestion.id,
        selectedTaskId,
        updateStatus,
        formData.status,
        addComment,
        formData.comment_text
      );
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to correlate:", error);
      alert("Failed to correlate email to task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this suggestion?")) {
      return;
    }
    setSaving(true);
    try {
      await emailAgentAPI.rejectSuggestion(suggestion.id);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to reject suggestion:", error);
      alert("Failed to reject suggestion. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this suggestion? This action cannot be undone.")) {
      return;
    }
    setSaving(true);
    try {
      await emailAgentAPI.deleteSuggestion(suggestion.id);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to delete suggestion:", error);
      alert("Failed to delete suggestion. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Email Suggestion: ${suggestion.subject}`}>
      <div className="space-y-6">
        {/* Email Context */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Email Context</h3>
          <div className="space-y-1 text-sm mb-3">
            <div>
              <strong>From:</strong> {suggestion.from_email}
            </div>
            <div>
              <strong>Subject:</strong> {suggestion.subject}
            </div>
            <div>
              <strong>Date:</strong> {new Date(suggestion.received_date).toLocaleString()}
            </div>
          </div>
          {suggestion.email_body && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">Email Content:</div>
              <div className="text-sm whitespace-pre-wrap max-h-96 overflow-y-auto bg-muted/30 p-3 rounded">
                {suggestion.email_body}
              </div>
            </div>
          )}
          {suggestion.email_html && !suggestion.email_body && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">Email Content (HTML):</div>
              <div 
                className="text-sm max-h-96 overflow-y-auto bg-muted/30 p-3 rounded prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: suggestion.email_html }}
              />
            </div>
          )}
        </div>

        {/* Entity Type Badge */}
        <div>
          <Badge variant="outline">{suggestion.suggested_entity_type}</Badge>
        </div>

        {/* Feature/Task Creation */}
        {(suggestion.suggested_entity_type === "feature" || suggestion.suggested_entity_type === "task") && (
          <div className="space-y-4">
            <div>
              <Label>Select Product</Label>
              <Select
                value={selectedProductId || undefined}
                onValueChange={async (value) => {
                  setSelectedProductId(value);
                  setFormData({ ...formData, product_id: value });
                  // Load modules for selected product
                  try {
                    const modulesData = await modulesAPI.getByProduct(value);
                    setModules(modulesData || []);
                  } catch (error) {
                    console.error("Failed to load modules:", error);
                    setModules([]);
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading products..." : "Select product"} />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {products.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No products available
                    </div>
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProductId && (
              <div className="space-y-3">
                {/* Show matching tasks if found */}
                {loadingMatches ? (
                  <div className="text-sm text-muted-foreground">Checking for matching tasks...</div>
                ) : matchingTasks.length > 0 && (
                  <div className="border rounded p-3 bg-blue-50 dark:bg-blue-950">
                    <div className="text-sm font-medium mb-2">Found {matchingTasks.length} matching task{matchingTasks.length > 1 ? 's' : ''}:</div>
                    {matchingTasks.map((match) => (
                      <div key={match.task_id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{match.task_title}</div>
                          <div className="text-xs text-muted-foreground">
                            Confidence: {(match.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Update existing task with new information
                            try {
                              const task = await tasksAPI.get(match.task_id);
                              const updatedDescription = task.description 
                                ? `${task.description}\n\n--- Update from email ---\n${formData.description || suggestion.email_body || ''}`
                                : formData.description || suggestion.email_body || '';
                              
                              await tasksAPI.update(match.task_id, {
                                ...task,
                                description: updatedDescription,
                              });
                              
                              // Mark suggestion as correlated
                              await emailAgentAPI.correlateToTask(
                                suggestion.id,
                                match.task_id,
                                false,
                                undefined,
                                true,
                                formData.description || suggestion.email_body || ''
                              );
                              
                              if (onUpdate) onUpdate();
                              onClose();
                            } catch (error) {
                              console.error("Failed to update task:", error);
                              alert("Failed to update task. Please try again.");
                            }
                          }}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Update Task
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowFeatureForm(true)}
                    className="flex-1"
                    disabled={!selectedProductId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add as Feature
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowTaskForm(true)}
                    className="flex-1"
                    disabled={!selectedProductId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add as Task
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Response Form - Available for all email types */}
        <div className="space-y-4 border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold">Email Response</h3>
          <div className="space-y-4">
            <div>
              <Label>Response Text</Label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-emails">CC (optional)</Label>
              
              {/* Resource Selection */}
              <div>
                <Label htmlFor="cc-resources" className="text-sm font-normal text-muted-foreground">
                  Select from Resources
                </Label>
                <div className="mt-1 max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                  {resources.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No resources available</p>
                  ) : (
                    resources
                      .filter((r) => r.email) // Only show resources with email
                      .map((resource) => (
                        <label
                          key={resource.id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                        >
                          <Checkbox
                            checked={selectedCcResources.includes(resource.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCcResources([...selectedCcResources, resource.id]);
                              } else {
                                setSelectedCcResources(
                                  selectedCcResources.filter((id) => id !== resource.id)
                                );
                              }
                            }}
                          />
                          <span className="text-sm">
                            {resource.name} {resource.email && `(${resource.email})`}
                          </span>
                        </label>
                      ))
                  )}
                </div>
              </div>

              {/* Manual Email Entry */}
              <div>
                <Label htmlFor="cc-emails" className="text-sm font-normal text-muted-foreground">
                  Or enter emails manually
                </Label>
                <Input
                  id="cc-emails"
                  type="text"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate multiple emails with commas
                </p>
              </div>

              {/* Preview of combined CC */}
              {(selectedCcResources.length > 0 || ccEmails.trim()) && (
                <div className="mt-2 p-2 bg-muted/30 rounded text-sm">
                  <div className="font-medium mb-1">CC Recipients:</div>
                  <div className="text-muted-foreground">
                    {[
                      ...selectedCcResources
                        .map((id) => {
                          const resource = resources.find((r) => r.id === id);
                          return resource?.email;
                        })
                        .filter((email): email is string => !!email),
                      ...ccEmails
                        .split(",")
                        .map((e) => e.trim())
                        .filter((e) => e.length > 0),
                    ].join(", ") || "None"}
                  </div>
                </div>
              )}
            </div>
            {formData.tone && (
              <div>
                <Label>Tone</Label>
                <Badge variant="outline">{formData.tone}</Badge>
              </div>
            )}
            {formData.key_points && formData.key_points.length > 0 && (
              <div>
                <Label>Key Points</Label>
                <ul className="list-disc list-inside">
                  {formData.key_points.map((point: string, idx: number) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Correlation Form */}
        {suggestion.suggested_entity_type === "correlate_task" && (
          <div className="space-y-4">
            <div>
              <Label>Correlated Task</Label>
              <Select
                value={selectedTaskId || undefined}
                onValueChange={setSelectedTaskId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {tasks.length === 0 ? (
                    <SelectItem value="no-tasks" disabled>
                      No tasks available
                    </SelectItem>
                  ) : (
                    tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {formData.confidence_score && (
              <div>
                <Label>Confidence Score</Label>
                <Badge variant="outline">
                  {(formData.confidence_score * 100).toFixed(0)}%
                </Badge>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-status"
                checked={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.checked)}
              />
              <Label htmlFor="update-status" className="cursor-pointer">
                Update Task Status
              </Label>
            </div>
            {updateStatus && (
              <div>
                <Label>New Status</Label>
                <Select
                  value={formData.status || "todo"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-comment"
                checked={addComment}
                onChange={(e) => setAddComment(e.target.checked)}
              />
              <Label htmlFor="add-comment" className="cursor-pointer">
                Add Comment
              </Label>
            </div>
            {addComment && (
              <div>
                <Label>Comment Text</Label>
                <Textarea
                  value={formData.comment_text || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, comment_text: e.target.value })
                  }
                  rows={4}
                />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-between">
          <Button 
            variant="ghost" 
            onClick={handleDelete} 
            disabled={saving}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {suggestion.status === "pending" && (
              <>
                <Button variant="destructive" onClick={handleReject} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                {/* Primary action button based on entity type */}
                {suggestion.suggested_entity_type === "response" ? (
                  <Button onClick={handleSendResponse} disabled={saving || !responseText.trim()}>
                    <Send className="h-4 w-4 mr-1" />
                    Send Response
                  </Button>
                ) : (
                  <>
                    {/* For task/feature/correlate: show primary action button */}
                    {suggestion.suggested_entity_type === "correlate_task" ? (
                      <Button onClick={handleCorrelate} disabled={saving || !selectedTaskId}>
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Correlate
                      </Button>
                    ) : (
                      <Button onClick={handleApprove} disabled={saving}>
                        <Check className="h-4 w-4 mr-1" />
                        Approve & Create
                      </Button>
                    )}
                    {/* Send Response button - available as secondary action for task/feature/correlate emails */}
                    {responseText.trim() && (
                      <Button variant="outline" onClick={handleSendResponse} disabled={saving}>
                        <Send className="h-4 w-4 mr-1" />
                        Send Response
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feature Form Modal - rendered outside suggestion modal to avoid nesting */}
      {showFeatureForm && selectedProductId && products.length > 0 && (
        <Modal
          isOpen={showFeatureForm}
          onClose={() => {
            setShowFeatureForm(false);
            if (onUpdate) onUpdate();
          }}
          title="Create Feature from Email"
        >
          <FeatureForm
            product={products.find(p => p.id === selectedProductId)!}
            initialModuleId={selectedModuleId || undefined}
            initialName={formData.name || suggestion.subject}
            initialDescription={formData.description || suggestion.email_body || ""}
            onSuccess={async () => {
              // Mark suggestion as created
              try {
                await emailAgentAPI.approveSuggestion(suggestion.id, {
                  product_id: selectedProductId,
                  module_id: selectedModuleId || undefined,
                });
              } catch (error) {
                console.error("Failed to update suggestion status:", error);
              }
              setShowFeatureForm(false);
              if (onUpdate) onUpdate();
            }}
            onCancel={() => {
              setShowFeatureForm(false);
            }}
          />
        </Modal>
      )}

      {/* Task Form Modal - rendered outside suggestion modal to avoid nesting */}
      {showTaskForm && selectedProductId && products.length > 0 && (
        <Modal
          isOpen={showTaskForm}
          onClose={() => {
            setShowTaskForm(false);
            if (onUpdate) onUpdate();
          }}
          title="Create Task from Email"
        >
          <TaskForm
            products={products}
            features={[]}
            resources={resources}
            initialProductId={selectedProductId}
            initialModuleId={selectedModuleId || undefined}
            initialTitle={formData.title || formData.name || suggestion.subject}
            initialDescription={formData.description || suggestion.email_body || ""}
            initialStatus={formData.status || "todo"}
            initialPriority={formData.priority || "medium"}
            onSuccess={async () => {
              // Mark suggestion as created
              try {
                await emailAgentAPI.approveSuggestion(suggestion.id, {
                  product_id: selectedProductId,
                  module_id: selectedModuleId || undefined,
                });
              } catch (error) {
                console.error("Failed to update suggestion status:", error);
              }
              setShowTaskForm(false);
              if (onUpdate) onUpdate();
            }}
            onCancel={() => {
              setShowTaskForm(false);
            }}
          />
        </Modal>
      )}
    </Modal>
  );
}

