'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Task, Module, Resource } from '@/types';
import { modulesAPI, resourcesAPI } from '@/lib/api';
import TaskList from '../TaskList';
import ProgressTracking from './ProgressTracking';
import TaskTimelineView from './TaskTimelineView';
import { List, BarChart3, Calendar } from 'lucide-react';

interface ExecutionViewProps {
  productId: string;
  moduleId?: string;
  tasks: Task[];
  onUpdate?: () => void;
}

type ViewMode = 'list' | 'chart' | 'timeline';

export default function ExecutionView({ productId, moduleId, tasks, onUpdate }: ExecutionViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterModuleId, setFilterModuleId] = useState<string>(moduleId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('all');
  const [modules, setModules] = useState<Module[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Load modules and resources for filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setLoadingFilters(true);
        const [modulesData, resourcesData] = await Promise.all([
          modulesAPI.getByProduct(productId).catch(() => []),
          resourcesAPI.getAll().catch(() => [])
        ]);
        setModules(modulesData);
        setResources(resourcesData);
      } catch (err) {
        console.error('Failed to load filter data:', err);
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilters();
  }, [productId]);

  // Update filterModuleId when moduleId prop changes
  useEffect(() => {
    if (moduleId && filterModuleId === 'all') {
      setFilterModuleId(moduleId);
    }
  }, [moduleId, filterModuleId]);

  // Filter tasks based on filter state
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Filter by module
    if (filterModuleId && filterModuleId !== 'all') {
      filtered = filtered.filter(t => t.module_id === filterModuleId);
    }

    // Filter by status
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Filter by assignee
    if (filterAssigneeId && filterAssigneeId !== 'all') {
      filtered = filtered.filter(t => 
        t.assignee_ids && t.assignee_ids.includes(filterAssigneeId)
      );
    }

    return filtered;
  }, [tasks, filterModuleId, filterStatus, filterAssigneeId]);

  // Calculate task summary metrics from filtered tasks
  const totalTasks = filteredTasks.length;
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
  const todoTasks = filteredTasks.filter(t => t.status === 'todo').length;
  const blockedTasks = filteredTasks.filter(t => t.status === 'blocked').length;

  // Calculate hours metrics from filtered tasks
  const totalEstimatedHours = filteredTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Task Summary Cards - Always Visible */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="bg-card text-card-foreground border border-border">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card className="bg-card text-card-foreground border border-border">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressTasks}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card className="bg-card text-card-foreground border border-border">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasks}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-card text-card-foreground border border-border">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{todoTasks}</div>
            <div className="text-sm text-muted-foreground">To Do</div>
          </CardContent>
        </Card>
        {blockedTasks > 0 && (
          <Card className="bg-card text-card-foreground border border-border">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{blockedTasks}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </CardContent>
          </Card>
        )}
        {totalEstimatedHours > 0 && (
          <Card className="bg-card text-card-foreground border border-border">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalEstimatedHours.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">Estimated</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-module">Filter by Module</Label>
              <Select
                value={filterModuleId}
                onValueChange={(value) => setFilterModuleId(value)}
              >
                <SelectTrigger id="filter-module" className="mt-1">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-status">Filter by Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(value) => setFilterStatus(value)}
              >
                <SelectTrigger id="filter-status" className="mt-1">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-assignee">Filter by Assignee</Label>
              <Select
                value={filterAssigneeId}
                onValueChange={(value) => setFilterAssigneeId(value)}
              >
                <SelectTrigger id="filter-assignee" className="mt-1">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardContent className="pt-6">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Progress Tracker
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <TaskList 
                productId={productId} 
                moduleId={filterModuleId !== 'all' ? filterModuleId : moduleId}
                initialFilterModuleId={filterModuleId !== 'all' ? filterModuleId : ''}
                initialFilterStatus={filterStatus !== 'all' ? filterStatus : ''}
                initialFilterAssigneeId={filterAssigneeId !== 'all' ? filterAssigneeId : ''}
                hideFilters={true}
                onUpdate={onUpdate} 
              />
            </TabsContent>

            <TabsContent value="chart" className="mt-6">
              <ProgressTracking 
                productId={productId} 
                moduleId={filterModuleId !== 'all' ? filterModuleId : moduleId}
                tasks={filteredTasks}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <TaskTimelineView 
                productId={productId} 
                moduleId={filterModuleId !== 'all' ? filterModuleId : moduleId} 
                tasks={filteredTasks}
                onUpdate={onUpdate}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

