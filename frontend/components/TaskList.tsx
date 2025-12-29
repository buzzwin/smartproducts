'use client';

import { useState, useEffect } from 'react';
import { tasksAPI, resourcesAPI, productsAPI, featuresAPI, workstreamsAPI, phasesAPI, modulesAPI } from '@/lib/api';
import type { Task, Resource, Product, Feature, Workstream, Phase, Module } from '@/types';
import TaskForm from './TaskForm';
import Modal from './Modal';

interface TaskListProps {
  productId?: string; // Optional - if provided, pre-filter tasks by this product
  moduleId?: string; // Optional - if provided, pre-filter tasks by this module
  initialFilterModuleId?: string; // Optional - initial module filter from parent
  initialFilterStatus?: string; // Optional - initial status filter from parent
  initialFilterAssigneeId?: string; // Optional - initial assignee filter from parent
  hideFilters?: boolean; // Optional - hide filter UI when filters are managed by parent
  onUpdate?: () => void;
}

export default function TaskList({ 
  productId, 
  moduleId, 
  initialFilterModuleId,
  initialFilterStatus,
  initialFilterAssigneeId,
  hideFilters = false,
  onUpdate 
}: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterModuleId, setFilterModuleId] = useState<string>(initialFilterModuleId || moduleId || '');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus || '');
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>(initialFilterAssigneeId || '');

  useEffect(() => {
    if (moduleId && !filterModuleId) {
      setFilterModuleId(moduleId);
    }
  }, [moduleId]);

  // Sync filters with parent component
  useEffect(() => {
    if (initialFilterModuleId !== undefined) {
      setFilterModuleId(initialFilterModuleId);
    }
  }, [initialFilterModuleId]);

  useEffect(() => {
    if (initialFilterStatus !== undefined) {
      setFilterStatus(initialFilterStatus);
    }
  }, [initialFilterStatus]);

  useEffect(() => {
    if (initialFilterAssigneeId !== undefined) {
      setFilterAssigneeId(initialFilterAssigneeId);
    }
  }, [initialFilterAssigneeId]);

  useEffect(() => {
    loadData();
  }, [productId, filterModuleId, filterStatus, filterAssigneeId]);

  useEffect(() => {
    // Load modules for the current product
    if (productId) {
      loadModules();
    }
  }, [productId]);

  const loadModules = async () => {
    try {
      if (productId) {
        const modulesData = await modulesAPI.getByProduct(productId);
        setModules(modulesData);
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tasksData, resourcesData, productsData, featuresData, workstreamsData, phasesData] = await Promise.all([
        (async () => {
          const params: { product_id?: string; module_id?: string; status?: string; assignee_id?: string } = {};
          if (productId) params.product_id = productId;
          if (filterModuleId) params.module_id = filterModuleId;
          if (filterStatus) params.status = filterStatus;
          if (filterAssigneeId) params.assignee_id = filterAssigneeId;
          return tasksAPI.getAll(params);
        })(),
        resourcesAPI.getAll(),
        productsAPI.getAll(),
        featuresAPI.getAll(),
        workstreamsAPI.getAll(),
        phasesAPI.getAll(),
      ]);
      
      setTasks(tasksData);
      setResources(resourcesData);
      setProducts(productsData);
      setFeatures(featuresData);
      setWorkstreams(workstreamsData);
      setPhases(phasesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getResourceName = (resourceId: string): string => {
    const resource = resources.find(r => r.id === resourceId);
    return resource ? resource.name : resourceId;
  };

  const getWorkstreamName = (workstreamId: string): string => {
    const workstream = workstreams.find(w => w.id === workstreamId);
    return workstream ? workstream.name : workstreamId;
  };

  const getPhaseName = (phaseId: string): string => {
    const phase = phases.find(p => p.id === phaseId);
    return phase ? phase.name : phaseId;
  };

  const getTaskTitle = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : taskId;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'todo': return '#6c757d';
      case 'in_progress': return '#007bff';
      case 'blocked': return '#dc3545';
      case 'done': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'low': return '#6c757d';
      case 'medium': return '#ffc107';
      case 'high': return '#fd7e14';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      setDeletingId(id);
      await tasksAPI.delete(id);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Tasks</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + Add Task
        </button>
      </div>

      {!hideFilters && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
              Filter by Module
            </label>
            <select
              value={filterModuleId}
              onChange={(e) => setFilterModuleId(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">All Modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
              Filter by Assignee
            </label>
            <select
              value={filterAssigneeId}
              onChange={(e) => setFilterAssigneeId(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">All Assignees</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          No tasks found. Create your first task!
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Product</th>
              <th>Feature</th>
              <th>Workstream</th>
              <th>Phase</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assignees</th>
              <th>Depends On</th>
              <th>Due Date</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const product = products.find(p => p.id === task.product_id);
              const feature = task.feature_id ? features.find(f => f.id === task.feature_id) : null;
              const workstream = task.workstream_id ? workstreams.find(w => w.id === task.workstream_id) : null;
              const phase = task.phase_id ? phases.find(p => p.id === task.phase_id) : null;
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              
              return (
                <tr key={task.id}>
                  <td style={{ fontWeight: 500 }}>{task.title}</td>
                  <td>{product?.name || task.product_id}</td>
                  <td>{feature?.name || '-'}</td>
                  <td>{workstream?.name || '-'}</td>
                  <td>{phase?.name || '-'}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: getStatusColor(task.status) + '20',
                        color: getStatusColor(task.status),
                      }}
                    >
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: getPriorityColor(task.priority) + '20',
                        color: getPriorityColor(task.priority),
                      }}
                    >
                      {task.priority.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {task.assignee_ids && task.assignee_ids.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {task.assignee_ids.map((assigneeId) => (
                          <span
                            key={assigneeId}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              backgroundColor: '#e7f3ff',
                              color: '#0066cc',
                              borderRadius: '12px',
                              fontSize: '11px',
                            }}
                          >
                            {getResourceName(assigneeId)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {task.depends_on_task_ids && task.depends_on_task_ids.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {task.depends_on_task_ids.map((depTaskId) => (
                          <span
                            key={depTaskId}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              borderRadius: '12px',
                              fontSize: '11px',
                            }}
                            title={getTaskTitle(depTaskId)}
                          >
                            {getTaskTitle(depTaskId).substring(0, 20)}{getTaskTitle(depTaskId).length > 20 ? '...' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ color: isOverdue ? '#dc3545' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setEditingTask(task)}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '8px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={deletingId === task.id}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        backgroundColor: deletingId === task.id ? '#ccc' : '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: deletingId === task.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {deletingId === task.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Task"
      >
        <TaskForm
          products={products}
          features={features}
          resources={resources}
          initialProductId={productId}
          initialModuleId={moduleId || filterModuleId}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
            if (onUpdate) onUpdate();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        {editingTask && (
          <TaskForm
            task={editingTask}
            products={products}
            features={features}
            resources={resources}
            onSuccess={() => {
              setEditingTask(null);
              loadData();
              if (onUpdate) onUpdate();
            }}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Modal>
    </div>
  );
}

