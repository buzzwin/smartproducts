'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Metric } from '@/types';

interface MetricCardProps {
  metric: Metric;
}

export default function MetricCard({ metric }: MetricCardProps) {
  const calculateProgress = () => {
    if (!metric.current_value || !metric.target_value) return 0;
    if (metric.target_value === 0) return 0;
    return Math.min(100, Math.round((metric.current_value / metric.target_value) * 100));
  };

  const progress = calculateProgress();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{metric.name}</CardTitle>
          <span className="text-xs px-2 py-1 rounded bg-secondary">
            {metric.type}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current</span>
            <span className="font-semibold">
              {metric.current_value ?? 'N/A'} {metric.unit || ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target</span>
            <span className="font-semibold">
              {metric.target_value ?? 'N/A'} {metric.unit || ''}
            </span>
          </div>
          {metric.target_value && metric.current_value && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

