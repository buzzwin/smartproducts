'use client';

import { useState, useEffect, useMemo } from 'react';
import { tasksAPI } from '@/lib/api';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface ProgressTrackingProps {
  productId: string;
  moduleId?: string;
}

export default function ProgressTracking({ productId, moduleId }: ProgressTrackingProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [productId, moduleId]);

  const loadTasks = async () => {
    try {
      const params: { product_id: string; module_id?: string } = { product_id: productId };
      if (moduleId) params.module_id = moduleId;
      const data = await tasksAPI.getAll(params);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks by module if provided
  const filteredTasks = useMemo(() => {
    if (!moduleId) return tasks;
    return tasks.filter(t => t.module_id === moduleId);
  }, [tasks, moduleId]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalEstimated = filteredTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const totalActual = filteredTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const completed = filteredTasks.filter(t => t.status === 'done').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const todo = filteredTasks.filter(t => t.status === 'todo').length;
    const blocked = filteredTasks.filter(t => t.status === 'blocked').length;
    
    const completionRate = filteredTasks.length > 0 
      ? (completed / filteredTasks.length) * 100 
      : 0;

    return {
      totalEstimated,
      totalActual,
      remaining: totalEstimated - totalActual,
      completed,
      inProgress,
      todo,
      blocked,
      completionRate,
    };
  }, [filteredTasks]);

  // Calculate burndown data (by task completion order)
  const burndownData = useMemo(() => {
    const tasksWithHours = filteredTasks
      .filter(t => t.estimated_hours)
      .sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return dateA - dateB;
      });

    let cumulativeEstimated = 0;
    let cumulativeActual = 0;

    return tasksWithHours.map((t, idx) => {
      cumulativeEstimated += t.estimated_hours || 0;
      cumulativeActual += t.actual_hours || 0;
      return {
        day: idx + 1,
        task: t.title.substring(0, 20),
        estimated: cumulativeEstimated,
        actual: cumulativeActual,
        remaining: cumulativeEstimated - cumulativeActual,
      };
    });
  }, [filteredTasks]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredTasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));
  }, [filteredTasks]);

  const COLORS = ['#28a745', '#007bff', '#6c757d', '#dc3545'];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading progress data...</div>
        </CardContent>
      </Card>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            No tasks found. Create tasks to see progress tracking.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Estimated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEstimated.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actual Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {metrics.totalActual.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {metrics.remaining > 0 ? metrics.remaining.toFixed(1) : '0'}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Burndown Chart */}
      {burndownData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Burndown Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="task" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="estimated" 
                  stroke="#8884d8" 
                  name="Estimated (cumulative)" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#82ca9d" 
                  name="Actual (cumulative)" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="remaining" 
                  stroke="#ffc658" 
                  name="Remaining" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Status Distribution */}
      {statusData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

