'use client';

import { useState, useEffect, useCallback } from 'react';
import { metricsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  Target, 
  CheckSquare, 
  ArrowLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';

interface MetricsViewProps {
  productId: string;
  moduleId?: string;
}

interface MetricsSummary {
  scope: 'product' | 'module';
  product_id: string;
  module_id?: string;
  module_name?: string;
  counts: {
    problems: number;
    features: number;
    tasks: number;
  };
  task_status: {
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
  };
  modules?: Array<{
    module_id: string;
    module_name: string;
    counts: {
      problems: number;
      features: number;
      tasks: number;
    };
    task_status: {
      todo: number;
      in_progress: number;
      blocked: number;
      done: number;
    };
  }>;
}

export default function MetricsView({ productId, moduleId }: MetricsViewProps) {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Internal state for drill-down (only used when viewing product-level, no moduleId prop)
  const [drillDownModuleId, setDrillDownModuleId] = useState<string | null>(null);

  // Use moduleId prop if provided, otherwise use drill-down state
  const activeModuleId = moduleId || drillDownModuleId || undefined;

  useEffect(() => {
    // Reset drill-down when moduleId prop changes
    if (moduleId) {
      setDrillDownModuleId(null);
    }
  }, [moduleId]);

  const loadSummary = useCallback(async () => {
    const currentModuleId = moduleId || drillDownModuleId || undefined;
    try {
      setLoading(true);
      setError(null);
      const data = await metricsAPI.getSummaryCounts(productId, currentModuleId);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, moduleId, drillDownModuleId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleModuleClick = (clickedModuleId: string) => {
    // Only allow drill-down when viewing product-level (no moduleId prop)
    if (!moduleId) {
      setDrillDownModuleId(clickedModuleId);
    }
  };

  const handleBackToProduct = () => {
    setDrillDownModuleId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done':
        return 'Done';
      case 'in_progress':
        return 'In Progress';
      case 'blocked':
        return 'Blocked';
      case 'todo':
        return 'To Do';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">No metrics data available</div>
      </div>
    );
  }

  // Determine if we're in module view (either from prop or drill-down)
  const isModuleView = activeModuleId !== undefined;
  // Only show back button if we drilled down (not when module is selected from top)
  const showBackButton = drillDownModuleId !== null && !moduleId;
  const totalTasks = summary.counts.tasks;
  const taskCompletionRate = totalTasks > 0 
    ? Math.round((summary.task_status.done / totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with back button for drill-down module view */}
      {showBackButton && summary.module_name && (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToProduct}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Product View
          </Button>
          <div className="text-sm text-muted-foreground">
            Viewing metrics for: <strong>{summary.module_name}</strong>
          </div>
        </div>
      )}
      
      {/* Show module name when module is selected from top dropdown */}
      {moduleId && summary.module_name && !showBackButton && (
        <div className="text-sm text-muted-foreground">
          Viewing metrics for: <strong>{summary.module_name}</strong>
        </div>
      )}

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Customer Problems</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.counts.problems}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isModuleView ? 'Problems in this module' : 'Total problems'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Features</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.counts.features}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isModuleView ? 'Features in this module' : 'Total features'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Tasks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.counts.tasks}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isModuleView ? 'Tasks in this module' : 'Total tasks'}
            </p>
            {totalTasks > 0 && (
              <div className="mt-2">
                <div className="text-sm font-medium">{taskCompletionRate}% Complete</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1 dark:bg-gray-700">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${taskCompletionRate}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Status Breakdown */}
      {totalTasks > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Task Status Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary.task_status).map(([status, count]) => (
                <div key={status} className="text-center p-4 border rounded-lg">
                  <Badge className={getStatusColor(status)}>
                    {getStatusLabel(status)}
                  </Badge>
                  <div className="text-2xl font-bold mt-2">{count}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0}% of total
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Breakdown (only shown in product view, not when module is selected from top) */}
      {!moduleId && !drillDownModuleId && summary.modules && summary.modules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Module Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Click on a module to view detailed metrics
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.modules.map((module) => (
                <div
                  key={module.module_id}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleModuleClick(module.module_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{module.module_name}</h3>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Problems</div>
                          <div className="text-xl font-bold">{module.counts.problems}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Features</div>
                          <div className="text-xl font-bold">{module.counts.features}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Tasks</div>
                          <div className="text-xl font-bold">{module.counts.tasks}</div>
                        </div>
                      </div>
                      {module.counts.tasks > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {Object.entries(module.task_status).map(([status, count]) => (
                            count > 0 && (
                              <Badge key={status} variant="outline" className={getStatusColor(status)}>
                                {getStatusLabel(status)}: {count}
                              </Badge>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

