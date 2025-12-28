'use client';

import { useState, useEffect, useMemo } from 'react';
import { productsAPI, modulesAPI, insightsAPI, tasksAPI, problemsAPI, stakeholdersAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Problem, ProblemStatus, ProblemPriority, Product, Module, Insight, Task, Stakeholder } from '@/types';
import AIAssistant from '../AIAssistant';

interface ProblemFormProps {
  problem?: Problem;
  productId: string;
  moduleId?: string;  // Optional - if provided, problem will be module-specific
  onSubmit: (problem: Omit<Problem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  onCreateTask?: (problemId: string) => void;  // Callback to create a task for this problem
}

export default function ProblemForm({ problem, productId, moduleId, onSubmit, onCancel, onCreateTask }: ProblemFormProps) {
  const [title, setTitle] = useState(problem?.title || '');
  const [description, setDescription] = useState(problem?.description || '');
  const [status, setStatus] = useState<ProblemStatus>(problem?.status || 'identified');
  const [priority, setPriority] = useState<ProblemPriority>(problem?.priority || 'medium');
  const [severity, setSeverity] = useState<string>(problem?.severity || 'medium');
  const [insightIds, setInsightIds] = useState<string[]>(problem?.insight_ids || []);
  const [taskIds, setTaskIds] = useState<string[]>(problem?.task_ids || []);
  const [affectedStakeholderIds, setAffectedStakeholderIds] = useState<string[]>(problem?.affected_stakeholders || []);
  const [selectedInsightId, setSelectedInsightId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedStakeholderId, setSelectedStakeholderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load product, module, insights, tasks, and stakeholders data
  const [product, setProduct] = useState<Product | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, [productId, moduleId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [productData, modulesData, insightsData, tasksData, stakeholdersData] = await Promise.all([
        productsAPI.getById(productId),
        modulesAPI.getAll({ product_id: productId }),
        insightsAPI.getAll({ product_id: productId, module_id: moduleId }),
        tasksAPI.getAll({ product_id: productId, module_id: moduleId }),
        stakeholdersAPI.getByProduct(productId, moduleId),
      ]);
      setProduct(productData);
      setModules(modulesData);
      if (moduleId) {
        const selectedModule = modulesData.find(m => m.id === moduleId);
        setModule(selectedModule || null);
      }
      setInsights(insightsData);
      setTasks(tasksData);
      setStakeholders(stakeholdersData);
      
      // Load linked tasks if problem exists
      if (problem?.task_ids && problem.task_ids.length > 0) {
        const linkedTasksData = await Promise.all(
          problem.task_ids.map(id => tasksAPI.getById(id).catch(() => null))
        );
        setLinkedTasks(linkedTasksData.filter(t => t !== null) as Task[]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load product or module data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddInsight = () => {
    if (selectedInsightId && !insightIds.includes(selectedInsightId)) {
      setInsightIds([...insightIds, selectedInsightId]);
      setSelectedInsightId('');
    }
  };

  const handleRemoveInsight = (id: string) => {
    setInsightIds(insightIds.filter(i => i !== id));
  };

  const handleAddStakeholder = () => {
    if (selectedStakeholderId && !affectedStakeholderIds.includes(selectedStakeholderId)) {
      setAffectedStakeholderIds([...affectedStakeholderIds, selectedStakeholderId]);
      setSelectedStakeholderId('');
    }
  };

  const handleRemoveStakeholder = (id: string) => {
    setAffectedStakeholderIds(affectedStakeholderIds.filter(s => s !== id));
  };

  const handleAddTask = async () => {
    if (!selectedTaskId || !problem?.id) return;
    
    try {
      await problemsAPI.linkTask(problem.id, selectedTaskId);
      // Reload linked tasks
      const updatedTask = await tasksAPI.getById(selectedTaskId);
      if (updatedTask) {
        setLinkedTasks([...linkedTasks, updatedTask]);
        setTaskIds([...taskIds, selectedTaskId]);
      }
      setSelectedTaskId('');
    } catch (err) {
      console.error('Failed to link task:', err);
      setError('Failed to link task');
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    if (!problem?.id) return;
    
    try {
      await problemsAPI.unlinkTask(problem.id, taskId);
      setLinkedTasks(linkedTasks.filter(t => t.id !== taskId));
      setTaskIds(taskIds.filter(id => id !== taskId));
    } catch (err) {
      console.error('Failed to unlink task:', err);
      setError('Failed to unlink task');
    }
  };

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.title) setTitle(fields.title);
    if (fields.description) setDescription(fields.description);
    if (fields.status) setStatus(fields.status as ProblemStatus);
    if (fields.priority) setPriority(fields.priority as ProblemPriority);
    if (fields.severity) setSeverity(fields.severity);
    if (fields.insight_ids && Array.isArray(fields.insight_ids)) {
      setInsightIds(fields.insight_ids);
    }
  };

  // Build initial prompt with product and module context
  const initialPrompt = useMemo(() => {
    if (!product) return '';
    let prompt = `Create a customer problem for product "${product.name}"`;
    
    if (module) {
      prompt += ` in module "${module.name}"`;
    } else if (moduleId) {
      prompt += ` in the selected module`;
    } else {
      prompt += ` (product-level, no module)`;
    }
    
    prompt += `. `;
    return prompt;
  }, [product?.name, module?.name, moduleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const problemData = {
        product_id: productId,
        module_id: moduleId || undefined,  // Include module_id if provided
        title,
        description: description || undefined,
        insight_ids: insightIds.length > 0 ? insightIds : [],
        task_ids: taskIds.length > 0 ? taskIds : [],
        affected_stakeholders: affectedStakeholderIds.length > 0 ? affectedStakeholderIds : undefined,
        status,
        priority,
        severity,
      };
      
      await onSubmit(problemData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save problem');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const availableInsights = insights.filter(i => !insightIds.includes(i.id));
  const availableStakeholders = stakeholders.filter(s => !affectedStakeholderIds.includes(s.id));

  return (
    <form onSubmit={handleSubmit} style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, flex: '1 1 200px', fontSize: 'clamp(16px, 4vw, 20px)' }}>
          {problem ? 'Edit Problem' : 'Create Problem'}
        </h3>
        {!problem && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="problem"
              section="discovery"
              context={{ 
                product, 
                productId: productId,
                moduleId: moduleId || undefined,
                module: module,
                moduleName: module?.name
              }}
              initialPrompt={initialPrompt}
              onFillFields={handleAIFill}
            />
          </div>
        )}
      </div>

      {product && (
        <div className="mb-4 p-3 bg-muted dark:bg-muted rounded-md text-sm">
          <strong>Product:</strong> {product.name}
          {(module || moduleId) && (
            <>
              <br />
              <strong>Module:</strong> {module?.name || modules.find(m => m.id === moduleId)?.name || 'Unknown'}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="error" style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <Label htmlFor="title" style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Title *
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Label htmlFor="description" style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Description
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <Label htmlFor="status" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Status
          </Label>
          <Select value={status} onValueChange={(value) => setStatus(value as ProblemStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="validating">Validating</SelectItem>
              <SelectItem value="prioritized">Prioritized</SelectItem>
              <SelectItem value="addressed">Addressed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Priority
          </Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as ProblemPriority)}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="severity" style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Severity *
          </Label>
          <Select value={severity} onValueChange={(value) => setSeverity(value)}>
            <SelectTrigger id="severity" className="w-full">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Linked Tasks
        </Label>
        {linkedTasks.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {linkedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2 bg-muted dark:bg-muted rounded-md">
                <span className="flex-1 text-sm">
                  {task.title}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveTask(task.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
        {problem && (() => {
          const availableTasks = tasks.filter(t => !taskIds.includes(t.id));
          return availableTasks.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="flex-1 min-w-[200px]">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {availableTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                onClick={handleAddTask}
                disabled={!selectedTaskId}
              >
                Add Task
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {tasks.length === 0 
                ? 'No tasks available. Create tasks first to link them to problems.'
                : 'All available tasks are already linked.'}
            </p>
          );
        })()}
        {problem && onCreateTask && (
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onCreateTask(problem.id)}
            className="mt-2"
          >
            Create New Task for This Problem
          </Button>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Linked Insights
        </Label>
        {insightIds.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insightIds.map((id) => {
              const insight = insights.find(i => i.id === id);
              return (
                <div key={id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                }}>
                  <span style={{ flex: 1, fontSize: '14px' }}>
                    {insight ? insight.title : `Insight ${id}`}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveInsight(id)}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {availableInsights.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Select value={selectedInsightId} onValueChange={setSelectedInsightId}>
              <SelectTrigger className="flex-1 min-w-[200px]">
                <SelectValue placeholder="Select an insight" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {availableInsights.map((insight) => (
                  <SelectItem key={insight.id} value={insight.id}>
                    {insight.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              type="button" 
              onClick={handleAddInsight}
              disabled={!selectedInsightId}
            >
              Add Insight
            </Button>
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            {insights.length === 0 
              ? 'No insights available. Create insights first to link them to problems.'
              : 'All available insights are already linked.'}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Affected Stakeholders
        </Label>
        {affectedStakeholderIds.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {affectedStakeholderIds.map((id) => {
              const stakeholder = stakeholders.find(s => s.id === id);
              return (
                <div key={id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                }}>
                  <span style={{ flex: 1, fontSize: '14px' }}>
                    {stakeholder ? `${stakeholder.name} (${stakeholder.email})` : `Stakeholder ${id}`}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveStakeholder(id)}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {availableStakeholders.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Select value={selectedStakeholderId} onValueChange={setSelectedStakeholderId}>
              <SelectTrigger className="flex-1 min-w-[200px]">
                <SelectValue placeholder="Select a stakeholder" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {availableStakeholders.map((stakeholder) => (
                  <SelectItem key={stakeholder.id} value={stakeholder.id}>
                    {stakeholder.name} ({stakeholder.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              type="button" 
              onClick={handleAddStakeholder}
              disabled={!selectedStakeholderId}
            >
              Add Stakeholder
            </Button>
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            {stakeholders.length === 0 
              ? 'No stakeholders available. Add stakeholders first to link them to problems.'
              : 'All available stakeholders are already selected.'}
          </p>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        marginTop: '24px'
      }}>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !title.trim()}
        >
          {loading ? 'Saving...' : problem ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

