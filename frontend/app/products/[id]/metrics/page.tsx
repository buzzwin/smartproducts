'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { metricsAPI, productsAPI } from '@/lib/api';
import type { Metric, Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProductMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productData, metricsData] = await Promise.all([
        productsAPI.getById(productId),
        metricsAPI.getByProduct(productId).catch(() => []),
      ]);
      
      setProduct(productData);
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="loading">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-6">
        <div className="error">Product not found</div>
      </div>
    );
  }

  const onTrackMetrics = metrics.filter(
    m => m.current_value !== null && m.current_value !== undefined && 
         m.target_value !== null && m.target_value !== undefined &&
         m.current_value >= m.target_value
  ).length;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{product.name} - Metrics</h1>
        {product.description && (
          <p className="text-muted-foreground mt-2">{product.description}</p>
        )}
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leading Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.filter(m => m.type === 'leading').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lagging Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.filter(m => m.type === 'lagging').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onTrackMetrics}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.length > 0 ? Math.round((onTrackMetrics / metrics.length) * 100) : 0}% of metrics
            </p>
          </CardContent>
        </Card>
      </div>

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No metrics found for this product.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const progress = metric.target_value && metric.current_value !== null && metric.current_value !== undefined
              ? Math.min((metric.current_value / metric.target_value) * 100, 100)
              : 0;
            const isOnTrack = metric.current_value !== null && metric.current_value !== undefined &&
                              metric.target_value !== null && metric.target_value !== undefined &&
                              metric.current_value >= metric.target_value;

            return (
              <Card key={metric.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{metric.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      metric.type === 'leading' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {metric.type}
                    </span>
                    {isOnTrack && (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                        On Track
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current</span>
                      <span className="font-semibold">
                        {metric.current_value !== null && metric.current_value !== undefined
                          ? `${metric.current_value} ${metric.unit || ''}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-semibold">
                        {metric.target_value} {metric.unit || ''}
                      </span>
                    </div>
                    {metric.target_value && metric.current_value !== null && metric.current_value !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              isOnTrack ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {progress.toFixed(1)}% complete
                        </p>
                      </div>
                    )}
                    {metric.tracking_frequency && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Tracked: {metric.tracking_frequency}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

