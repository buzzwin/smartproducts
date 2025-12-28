'use client';

import { useState, useEffect } from 'react';
import { featuresAPI, decisionsAPI } from '@/lib/api';
import type { Feature } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PrioritizationMatrixProps {
  productId: string;
}

export default function PrioritizationMatrix({ productId }: PrioritizationMatrixProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, [productId]);

  const loadFeatures = async () => {
    try {
      const data = await featuresAPI.getAll({ product_id: productId });
      setFeatures(data.filter(f => (f as any).value_score && (f as any).effort_score));
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  };

  const data = features.map(f => ({
    name: f.name,
    value: (f as any).value_score || 0,
    effort: (f as any).effort_score || 0,
    id: f.id,
  }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Value vs Effort Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="effort" name="Effort" label={{ value: 'Effort', position: 'insideBottom', offset: -5 }} />
            <YAxis type="number" dataKey="value" name="Value" label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Features" data={data} fill="#8884d8">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

