'use client';

import { useState, useEffect } from 'react';
import { problemsAPI, insightsAPI } from '@/lib/api';
import type { Problem, Insight } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';

interface ProblemInsightViewProps {
  productId: string;
  moduleId?: string;  // Optional - if provided, loads module-specific data
}

export default function ProblemInsightView({ productId, moduleId }: ProblemInsightViewProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [productId, moduleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [problemsData, insightsData] = await Promise.all([
        problemsAPI.getByProduct(productId, moduleId),
        insightsAPI.getByProduct(productId, moduleId),
      ]);
      setProblems(problemsData);
      setInsights(insightsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkInsight = async (problemId: string, insightId: string) => {
    try {
      await problemsAPI.linkInsight(problemId, insightId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to link insight');
    }
  };

  const getInsightById = (id: string) => insights.find(i => i.id === id);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Problems & Insights</h2>
      
      {problems.map((problem) => {
        const linkedInsights = (problem.insight_ids || []).map(id => getInsightById(id)).filter(Boolean) as Insight[];
        return (
          <Card key={problem.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{problem.title}</CardTitle>
                  <CardDescription>{problem.description}</CardDescription>
                </div>
                <Badge variant={problem.priority === 'critical' ? 'destructive' : 'secondary'}>
                  {problem.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Linked Insights ({linkedInsights.length})</h3>
                  {linkedInsights.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No insights linked yet</p>
                  ) : (
                    <div className="space-y-2">
                      {linkedInsights.map((insight) => (
                        <div key={insight.id} className="p-2 border rounded">
                          <p className="font-medium">{insight.title}</p>
                          {insight.description && (
                            <p className="text-sm text-muted-foreground">{insight.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Available Insights</h3>
                  <div className="space-y-2">
                    {insights
                      .filter(i => !(problem.insight_ids || []).includes(i.id))
                      .map((insight) => (
                        <div key={insight.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{insight.title}</p>
                            {insight.description && (
                              <p className="text-sm text-muted-foreground">{insight.description}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLinkInsight(problem.id, insight.id)}
                          >
                            <Link2 className="h-4 w-4 mr-1" />
                            Link
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

