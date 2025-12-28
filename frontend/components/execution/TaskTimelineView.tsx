'use client';

import { useState, useEffect, useMemo } from 'react';
import { featuresAPI, workstreamsAPI, productsAPI } from '@/lib/api';
import type { Task, Feature, Workstream, Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF, formatRoadmapData } from '@/lib/export';

interface TaskTimelineViewProps {
  productId: string;
  moduleId?: string;
  tasks: Task[];
  onUpdate?: () => void;
}

type GroupBy = 'feature' | 'workstream' | 'status';

export default function TaskTimelineView({ productId, moduleId, tasks, onUpdate }: TaskTimelineViewProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('feature');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [featuresData, workstreamsData, productData] = await Promise.all([
        featuresAPI.getAll({ product_id: productId, module_id: moduleId }),
        workstreamsAPI.getAll({ product_id: productId }),
        productsAPI.getById(productId),
      ]);
      setFeatures(featuresData);
      setWorkstreams(workstreamsData);
      setProduct(productData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks by module if provided
  const filteredTasks = useMemo(() => {
    if (!moduleId) return tasks;
    return tasks.filter(t => t.module_id === moduleId);
  }, [tasks, moduleId]);

  // Get date range for timeline
  const dateRange = useMemo(() => {
    const tasksWithDates = filteredTasks.filter(t => t.due_date);
    if (tasksWithDates.length === 0) {
      const today = new Date();
      return { start: today, end: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) };
    }

    const dates = tasksWithDates.map(t => new Date(t.due_date!));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 30);
    
    return { start: minDate, end: maxDate };
  }, [filteredTasks]);

  const getDaysBetween = (start: Date, end: Date): number => {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTaskPosition = (task: Task): { left: number; width: number } => {
    if (!task.due_date) {
      return { left: 0, width: 0 };
    }

    const taskDate = new Date(task.due_date);
    const daysFromStart = getDaysBetween(dateRange.start, taskDate);
    const totalDays = getDaysBetween(dateRange.start, dateRange.end);
    
    const left = (daysFromStart / totalDays) * 100;
    const width = 5;
    
    return { left: Math.max(0, Math.min(95, left)), width };
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      case 'low': return '#28a745';
      case 'medium': return '#ffc107';
      case 'high': return '#fd7e14';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Group tasks based on groupBy selection
  const groupedTasks = useMemo(() => {
    if (groupBy === 'feature') {
      const grouped: Record<string, Task[]> = {};
      filteredTasks.forEach(task => {
        const key = task.feature_id || 'unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      });
      return grouped;
    } else if (groupBy === 'workstream') {
      const grouped: Record<string, Task[]> = {};
      filteredTasks.forEach(task => {
        const key = task.workstream_id || 'unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      });
      return grouped;
    } else {
      // status
      const grouped: Record<string, Task[]> = {};
      filteredTasks.forEach(task => {
        const key = task.status || 'unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      });
      return grouped;
    }
  }, [filteredTasks, groupBy]);

  const getGroupName = (groupId: string): string => {
    if (groupId === 'unassigned') return 'Unassigned';
    
    if (groupBy === 'feature') {
      const feature = features.find(f => f.id === groupId);
      return feature?.name || groupId;
    } else if (groupBy === 'workstream') {
      const workstream = workstreams.find(w => w.id === groupId);
      return workstream?.name || groupId;
    } else {
      return groupId.charAt(0).toUpperCase() + groupId.slice(1).replace('_', ' ');
    }
  };

  const handleExportCSV = () => {
    if (!product) return;
    const roadmapData = formatRoadmapData(
      [product],
      features,
      filteredTasks
    );
    exportToCSV(roadmapData, `timeline-${product.name.replace(/\s+/g, '-').toLowerCase()}`);
  };

  const handleExportPDF = () => {
    let content = `
      <div class="card">
        <h2>Task Timeline</h2>
        <p><strong>Group By:</strong> ${groupBy}</p>
        <p><strong>Total Tasks:</strong> ${filteredTasks.length}</p>
      </div>
      <div class="card">
        <h3>Timeline Tasks</h3>
        <table>
          <tr>
            <th>${groupBy === 'feature' ? 'Feature' : groupBy === 'workstream' ? 'Workstream' : 'Status'}</th>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due Date</th>
          </tr>
    `;
    
    Object.entries(groupedTasks).forEach(([groupId, groupTasks]) => {
      groupTasks.forEach(task => {
        content += `
          <tr>
            <td>${getGroupName(groupId)}</td>
            <td>${task.title}</td>
            <td>${task.status}</td>
            <td>${task.priority}</td>
            <td>${task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
          </tr>
        `;
      });
    });
    
    content += '</table></div>';
    exportToPDF('Task Timeline', content);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading timeline...</div>
        </CardContent>
      </Card>
    );
  }

  const tasksWithDates = filteredTasks.filter(t => t.due_date);
  const totalDays = getDaysBetween(dateRange.start, dateRange.end);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Group by:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="feature">Feature</option>
            <option value="workstream">Workstream</option>
            <option value="status">Status</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {tasksWithDates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              No tasks with due dates found. Add due dates to tasks to see them on the timeline.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Timeline View</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Timeline Header */}
            <div className="mb-4 pb-2 border-b border-border">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{formatDate(dateRange.start)}</span>
                <span>{formatDate(dateRange.end)}</span>
              </div>
              <div className="relative h-2 bg-muted rounded">
                {/* Timeline scale markers */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const position = (i / 4) * 100;
                  const date = new Date(
                    dateRange.start.getTime() + (dateRange.end.getTime() - dateRange.start.getTime()) * (i / 4)
                  );
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-2 border-l border-foreground/20"
                      style={{ left: `${position}%` }}
                    >
                      <div className="absolute top-3 left-0 transform -translate-x-1/2 text-xs whitespace-nowrap">
                        {formatDate(date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grouped Tasks */}
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([groupId, groupTasks]) => {
                const tasksWithDatesInGroup = groupTasks.filter(t => t.due_date);
                if (tasksWithDatesInGroup.length === 0) return null;

                return (
                  <div key={groupId} className="space-y-2">
                    <div className="font-semibold text-sm mb-2">
                      {getGroupName(groupId)} ({tasksWithDatesInGroup.length} tasks)
                    </div>
                    <div className="relative h-12 bg-muted/30 rounded border border-border">
                      {tasksWithDatesInGroup.map((task) => {
                        const position = getTaskPosition(task);
                        return (
                          <div
                            key={task.id}
                            className="absolute top-1/2 transform -translate-y-1/2"
                            style={{
                              left: `${position.left}%`,
                              width: `${Math.max(2, position.width)}%`,
                            }}
                            title={`${task.title} - ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}`}
                          >
                            <div
                              className="h-8 rounded px-2 flex items-center justify-center text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: getStatusColor(task.status),
                                minWidth: '60px',
                              }}
                            >
                              <span className="truncate">{task.title.substring(0, 15)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Task List View (below timeline) */}
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-semibold mb-4">Task Details</h3>
              <div className="space-y-2">
                {Object.entries(groupedTasks).map(([groupId, groupTasks]) => (
                  <div key={groupId} className="space-y-1">
                    <div className="font-medium text-sm text-muted-foreground">
                      {getGroupName(groupId)}
                    </div>
                    {groupTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 p-2 rounded border border-border hover:bg-muted/50"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: getPriorityColor(task.priority) + '20',
                              color: getPriorityColor(task.priority),
                            }}
                          >
                            {task.priority}
                          </span>
                          <span
                            className="px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: getStatusColor(task.status) }}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

