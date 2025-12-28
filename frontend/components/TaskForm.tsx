'use client';

import { useState, useEffect } from 'react';
import { tasksAPI, resourcesAPI, productsAPI, featuresAPI, phasesAPI, modulesAPI, problemsAPI } from '@/lib/api';
import type { Task, TaskStatus, TaskPriority, Resource, Product, Feature, Phase, Module, CostClassification, Problem } from '@/types';
import AIAssistant from './AIAssistant';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Modal from './Modal';
import FeatureForm from './FeatureForm';
import ProductForm from './ProductForm';
import ModuleForm from './modules/ModuleForm';
import ProblemForm from './discovery/ProblemForm';

interface TaskFormProps {
  task?: Task;
  products: Product[];
  features: Feature[];
  resources: Resource[];
  initialProductId?: string;
  initialModuleId?: string;
  initialProblemId?: string;  // Pre-fill problem_id when creating task from problem
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TaskForm({ task, products, features, resources, initialProductId, initialModuleId, initialProblemId, onSuccess, onCancel }: TaskFormProps) {
  const [productId, setProductId] = useState(task?.product_id || initialProductId || '');
  const [moduleId, setModuleId] = useState(task?.module_id || initialModuleId || '');
  const [featureId, setFeatureId] = useState(task?.feature_id || '');
  const [problemId, setProblemId] = useState(task?.problem_id || initialProblemId || '');
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignee_ids || []);
  const [phaseId, setPhaseId] = useState(task?.phase_id || '');
  const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>(task?.depends_on_task_ids || []);
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split('T')[0] : '');
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(task?.estimated_hours);
  const [cost_classification, setCost_classification] = useState<CostClassification | ''>(task?.cost_classification || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadedFeatures, setLoadedFeatures] = useState<Feature[]>([]);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
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
        } catch (err) {
          console.error('Failed to load products:', err);
          setLoadedProducts([]);
        } finally {
          setLoadingProducts(false);
        }
      } else {
        setLoadedProducts([]); // Use props if available
      }
    };
    loadProductsData();
  }, [products]);

  useEffect(() => {
    const loadPhases = async () => {
      try {
        const data = await phasesAPI.getAll();
        setPhases(data);
      } catch (err) {
        console.error('Failed to load phases:', err);
        setPhases([]);
      }
    };
    loadPhases();
  }, []);

  useEffect(() => {
    const loadModules = async () => {
      if (productId) {
        try {
          const data = await modulesAPI.getByProduct(productId);
          setModules(data);
          // If initialModuleId is provided and we just loaded modules, ensure it's set
          if (initialModuleId && !moduleId && data.some(m => m.id === initialModuleId)) {
            setModuleId(initialModuleId);
          }
        } catch (err) {
          console.error('Failed to load modules:', err);
          setModules([]);
        }
      } else {
        setModules([]);
      }
    };
    loadModules();
  }, [productId, initialModuleId]);

  useEffect(() => {
    const loadTasks = async () => {
      if (productId) {
        try {
          const data = await tasksAPI.getAll({ product_id: productId });
          // Exclude current task from dependencies list
          const filtered = task ? data.filter(t => t.id !== task.id) : data;
          setAllTasks(filtered);
        } catch (err) {
          console.error('Failed to load tasks:', err);
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
          const data = await featuresAPI.getAll({ product_id: productId });
          setLoadedFeatures(data || []);
        } catch (err) {
          console.error('Failed to load features:', err);
          setLoadedFeatures([]);
        } finally {
          setLoadingFeatures(false);
        }
      } else {
        setLoadedFeatures([]);
      }
    };
    loadFeaturesForProduct();
  }, [productId]);

  // Load problems for selected product
  useEffect(() => {
    const loadProblemsForProduct = async () => {
      if (productId) {
        try {
          setLoadingProblems(true);
          const data = await problemsAPI.getAll({ product_id: productId, module_id: moduleId || undefined });
          setProblems(data || []);
        } catch (err) {
          console.error('Failed to load problems:', err);
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
  const availableProducts = loadedProducts.length > 0 ? loadedProducts : (products || []);
  
  // Use loaded features if available, otherwise fall back to props
  // Filter features by selected product
  const availableFeatures = productId 
    ? (loadedFeatures.length > 0 ? loadedFeatures : features.filter(f => f.product_id === productId))
    : [];

  const handleAssigneeToggle = (resourceId: string) => {
    if (assigneeIds.includes(resourceId)) {
      setAssigneeIds(assigneeIds.filter(id => id !== resourceId));
    } else {
      setAssigneeIds([...assigneeIds, resourceId]);
    }
  };

  const handleAIFill = (fields: Record<string, any>) => {
    if (fields.title) setTitle(fields.title);
    if (fields.description) setDescription(fields.description);
    if (fields.status) setStatus(fields.status);
    if (fields.priority) setPriority(fields.priority);
    if (fields.estimated_hours !== undefined) setEstimatedHours(fields.estimated_hours);
    if (fields.due_date) setDueDate(fields.due_date.split('T')[0]);
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
        title,
        description: description || undefined,
        status,
        priority,
        assignee_ids: assigneeIds,
        depends_on_task_ids: dependsOnTaskIds,
        due_date: dueDate || undefined,
        estimated_hours: estimatedHours,
        cost_classification: cost_classification || undefined,
      };

      if (task) {
        await tasksAPI.update(task.id, taskData);
      } else {
        await tasksAPI.create(taskData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

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
        <h3 style={{ 
          margin: 0,
          fontSize: 'clamp(16px, 4vw, 20px)',
          fontWeight: 600,
          flex: '1 1 200px'
        }}>
          {task ? 'Edit Task' : 'Create Task'}
        </h3>
        {!task && (
          <div style={{ flexShrink: 0 }}>
            <AIAssistant
              formType="task"
              context={{ productId, moduleId, moduleName: modules.find(m => m.id === moduleId)?.name }}
              section="execution"
              fieldOptions={{
                status: { options: ['todo', 'in_progress', 'blocked', 'done'], labels: { todo: 'To Do', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done' } },
                priority: { options: ['low', 'medium', 'high', 'critical'], labels: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' } }
              }}
              initialPrompt={moduleId ? `Create a task for module "${modules.find(m => m.id === moduleId)?.name || 'selected module'}": ` : 'Create a task: '}
              onFillFields={handleAIFill}
            />
          </div>
        )}
      </div>
      
      {error && (
        <div className="error" style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          color: '#c33', 
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Label htmlFor="product_id">Product *</Label>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setShowProductModal(true)}
            style={{
              padding: '0',
              fontSize: '12px',
              height: 'auto',
              textDecoration: 'underline',
            }}
          >
            Add Product
          </Button>
        </div>
        {loadingProducts ? (
          <div style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: '#f8f9fa',
            color: '#666',
          }}>
            Loading products...
          </div>
        ) : (
          <Select
            value={productId || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                setProductId('');
              } else {
                setProductId(value);
                setModuleId(''); // Reset module when product changes
                setFeatureId(''); // Reset feature when product changes
                setProblemId(''); // Reset problem when product changes
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
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            No products found. Click "Add Product" to create one.
          </p>
        )}
      </div>

      {productId && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Label htmlFor="module_id">Module (optional)</Label>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setShowModuleModal(true)}
              style={{
                padding: '0',
                fontSize: '12px',
                height: 'auto',
                textDecoration: 'underline',
              }}
            >
              Add Module
            </Button>
          </div>
          <Select
            value={moduleId || 'none'}
            onValueChange={(value) => {
              setModuleId(value === 'none' ? '' : value);
              setProblemId(''); // Reset problem when module changes
            }}
          >
            <SelectTrigger id="module_id">
              <SelectValue placeholder="No module (product-level)" />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 9999 }}>
              <SelectItem value="none">No module (product-level)</SelectItem>
              {modules.length > 0 ? (
                modules.map((module) => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.name} {module.is_default && '(Default)'}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No modules available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {modules.length === 0 && (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              No modules found. Click "Add Module" to create one.
            </p>
          )}
        </div>
      )}

      {productId && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Label htmlFor="feature_id">Feature (optional)</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setShowFeatureModal(true)}
                style={{
                  padding: '0',
                  fontSize: '12px',
                  height: 'auto',
                  textDecoration: 'underline',
                }}
              >
                Add Feature
              </Button>
            </div>
            {loadingFeatures ? (
              <div style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                color: '#666',
              }}>
                Loading features...
              </div>
            ) : (
              <Select
                value={featureId || 'none'}
                onValueChange={(value) => setFeatureId(value === 'none' ? '' : value)}
                disabled={!productId}
              >
                <SelectTrigger id="feature_id" style={{ width: '100%' }}>
                  <SelectValue placeholder="Select a feature" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 9999 }}>
                  <SelectItem value="none">No feature</SelectItem>
                  {availableFeatures.length > 0 ? (
                    availableFeatures.map((feature) => (
                      <SelectItem key={feature.id} value={feature.id}>
                        {feature.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No features available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {!loadingFeatures && availableFeatures.length === 0 && productId && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                No features found. Click "Add Feature" to create one.
              </p>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Label htmlFor="problem_id">Customer Problem (optional)</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setShowProblemModal(true)}
                style={{
                  padding: '0',
                  fontSize: '12px',
                  height: 'auto',
                  textDecoration: 'underline',
                }}
              >
                Add Problem
              </Button>
            </div>
            {loadingProblems ? (
              <div style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                color: '#666',
              }}>
                Loading problems...
              </div>
            ) : (
              <Select
                value={problemId || 'none'}
                onValueChange={(value) => setProblemId(value === 'none' ? '' : value)}
                disabled={!productId}
              >
                <SelectTrigger id="problem_id" style={{ width: '100%' }}>
                  <SelectValue placeholder="Select a problem" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 9999 }}>
                  <SelectItem value="none">No problem</SelectItem>
                  {problems.length > 0 ? (
                    problems.map((problem) => (
                      <SelectItem key={problem.id} value={problem.id}>
                        {problem.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No problems available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {!loadingProblems && problems.length === 0 && productId && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                No problems found. Click "Add Problem" to create one.
              </p>
            )}
          </div>
        </>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Phase (optional)
        </label>
        <select
          value={phaseId}
          onChange={(e) => setPhaseId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
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

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Title *
        </label>
        <input
          type="text"
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
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Description
        </label>
        <textarea
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px', 
        marginBottom: '16px' 
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Status *
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Priority *
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Assignees
        </label>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          border: '1px solid #ddd', 
          borderRadius: '6px', 
          padding: '12px' 
        }}>
          {resources.length === 0 ? (
            <p style={{ color: '#666', fontSize: '13px' }}>No resources available. Create resources first.</p>
          ) : (
            resources.map((resource) => (
              <label
                key={resource.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: assigneeIds.includes(resource.id) ? '#e7f3ff' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(resource.id)}
                  onChange={() => handleAssigneeToggle(resource.id)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  {resource.name} ({resource.type})
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Depends On (optional)
        </label>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          border: '1px solid #ddd', 
          borderRadius: '6px', 
          padding: '12px' 
        }}>
          {!productId ? (
            <p style={{ color: '#666', fontSize: '13px' }}>Select a product first to see available tasks.</p>
          ) : allTasks.length === 0 ? (
            <p style={{ color: '#666', fontSize: '13px' }}>No other tasks available for this product.</p>
          ) : (
            allTasks.map((t) => (
              <label
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: dependsOnTaskIds.includes(t.id) ? '#fff3cd' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={dependsOnTaskIds.includes(t.id)}
                  onChange={() => {
                    if (dependsOnTaskIds.includes(t.id)) {
                      setDependsOnTaskIds(dependsOnTaskIds.filter(id => id !== t.id));
                    } else {
                      setDependsOnTaskIds([...dependsOnTaskIds, t.id]);
                    }
                  }}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px' }}>
                  {t.title} ({t.status})
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Due Date (optional)
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
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

      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 500,
          fontSize: '14px'
        }}>
          Cost Classification (Optional)
        </label>
        <select
          value={cost_classification}
          onChange={(e) => setCost_classification(e.target.value as CostClassification | '')}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        >
          <option value="">Not specified</option>
          <option value="run">Run/KTLO (Keep The Lights On)</option>
          <option value="change">Change/Growth (New Feature Development)</option>
        </select>
        <p style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
          Run/KTLO = Ongoing maintenance. Change/Growth = New feature development.
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            minWidth: '80px',
            flex: '1 1 auto',
            maxWidth: '150px',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim() || !productId}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: loading || !title.trim() || !productId ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !title.trim() || !productId ? 'not-allowed' : 'pointer',
            minWidth: '80px',
            flex: '1 1 auto',
            maxWidth: '150px',
          }}
        >
          {loading ? 'Saving...' : task ? 'Update' : 'Create'}
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
              console.error('Failed to reload products:', err);
            }
          }}
          onCancel={() => setShowProductModal(false)}
        />
      </Modal>

      {/* Module Modal */}
      {productId && (() => {
        const currentProduct = availableProducts.find(p => p.id === productId);
        return currentProduct ? (
          <Modal
            isOpen={showModuleModal}
            onClose={() => setShowModuleModal(false)}
            title="Create Module"
          >
            <ModuleForm
              module={null}
              productId={productId}
              onSuccess={async () => {
                setShowModuleModal(false);
                // Reload modules after creating
                try {
                  const data = await modulesAPI.getByProduct(productId);
                  setModules(data || []);
                } catch (err) {
                  console.error('Failed to reload modules:', err);
                }
              }}
              onCancel={() => setShowModuleModal(false)}
            />
          </Modal>
        ) : null;
      })()}

      {/* Feature Modal */}
      {productId && (() => {
        const currentProduct = availableProducts.find(p => p.id === productId);
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
                // Reload features after creating
                try {
                  const data = await featuresAPI.getAll({ product_id: productId });
                  setLoadedFeatures(data || []);
                } catch (err) {
                  console.error('Failed to reload features:', err);
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
                  const data = await problemsAPI.getAll({ product_id: productId, module_id: moduleId || undefined });
                  setProblems(data || []);
                } catch (err) {
                  console.error('Failed to reload problems:', err);
                }
              } catch (err) {
                console.error('Failed to create problem:', err);
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

