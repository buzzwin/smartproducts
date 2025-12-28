'use client';

import { useState, useEffect } from 'react';
import { featuresAPI } from '@/lib/api';
import type { Feature } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FeatureComparisonProps {
  productId: string;
  featureIds: string[];
}

export default function FeatureComparison({ productId, featureIds }: FeatureComparisonProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, [productId, featureIds]);

  const loadFeatures = async () => {
    try {
      const allFeatures = await featuresAPI.getAll({ product_id: productId });
      setFeatures(allFeatures.filter(f => featureIds.includes(f.id)));
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading features...</div>;
  }

  if (features.length === 0) {
    return <p className="text-sm text-muted-foreground">No features selected for comparison.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>RICE Score</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Effort</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.id}>
                <TableCell className="font-medium">{feature.name}</TableCell>
                <TableCell>{(feature as any).rice_score ? ((feature as any).rice_score as number).toFixed(2) : 'N/A'}</TableCell>
                <TableCell>{(feature as any).value_score || 'N/A'}</TableCell>
                <TableCell>{(feature as any).effort_score || 'N/A'}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded text-xs bg-secondary">
                    {feature.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

