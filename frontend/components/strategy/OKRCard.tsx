'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KeyResult } from '@/types';

interface OKRCardProps {
  objective: string;
  keyResults: KeyResult[];
  status?: string;
}

export default function OKRCard({ objective, keyResults, status }: OKRCardProps) {
  const calculateProgress = (kr: KeyResult) => {
    if (!kr.current || !kr.target) return 0;
    const current = parseFloat(kr.current);
    const target = parseFloat(kr.target);
    if (target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{objective}</CardTitle>
          {status && (
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {keyResults.map((kr, index) => {
            const progress = calculateProgress(kr);
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{kr.description}</span>
                  <span className="text-muted-foreground">
                    {kr.current || '0'} / {kr.target}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

