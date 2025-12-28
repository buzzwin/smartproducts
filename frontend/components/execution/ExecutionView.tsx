'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Task } from '@/types';
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

  // Calculate task summary metrics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  // Calculate hours metrics
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const totalActualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
  const remainingHours = totalEstimatedHours - totalActualHours;

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

      {/* Hours Summary (if applicable) */}
      {totalEstimatedHours > 0 && (
        <Card className="bg-card text-card-foreground border border-border">
          <CardHeader>
            <CardTitle>Hours Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-lg font-semibold">{totalEstimatedHours.toFixed(1)}h</div>
                <div className="text-sm text-muted-foreground">Total Estimated</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {totalActualHours.toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Actual Hours</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {remainingHours > 0 ? remainingHours.toFixed(1) : '0'}h
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                moduleId={moduleId} 
                onUpdate={onUpdate} 
              />
            </TabsContent>

            <TabsContent value="chart" className="mt-6">
              <ProgressTracking 
                productId={productId} 
                moduleId={moduleId} 
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <TaskTimelineView 
                productId={productId} 
                moduleId={moduleId} 
                tasks={tasks}
                onUpdate={onUpdate}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

