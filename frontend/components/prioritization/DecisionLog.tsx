'use client';

import { useState, useEffect } from 'react';
import { decisionsAPI } from '@/lib/api';
import type { Decision } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DecisionLogProps {
  featureId: string;
}

export default function DecisionLog({ featureId }: DecisionLogProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDecisions();
  }, [featureId]);

  const loadDecisions = async () => {
    try {
      const data = await decisionsAPI.getByEntity('feature', featureId);
      setDecisions(data);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading decisions...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Decision History</h3>
      {decisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
      ) : (
        decisions.map((decision) => (
          <Card key={decision.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{decision.title}</CardTitle>
                <Badge>{decision.decision_type}</Badge>
              </div>
              {decision.decision_date && (
                <CardDescription>
                  {new Date(decision.decision_date).toLocaleDateString()} by {decision.decision_maker || 'Unknown'}
                </CardDescription>
              )}
            </CardHeader>
            {decision.description && (
              <CardContent>
                <p className="text-sm">{decision.description}</p>
                {decision.rationale && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">Rationale:</p>
                    <p className="text-xs text-muted-foreground">{decision.rationale}</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

