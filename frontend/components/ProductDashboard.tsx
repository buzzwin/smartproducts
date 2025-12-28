'use client';

import { useEffect, useState } from 'react';
import { tasksAPI, costsAPI, strategiesAPI, problemsAPI, decisionsAPI, releasesAPI, stakeholdersAPI, metricsAPI } from '@/lib/api';
import type { Task, Product, CostTotals, Strategy, Problem, Decision, Release, Stakeholder, Metric } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportToCSV, exportToPDF, formatDashboardData } from '@/lib/export';
import { Download, FileText } from 'lucide-react';

interface ProductDashboardProps {
  products: Product[];
}

export default function ProductDashboard({ products }: ProductDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costTotals, setCostTotals] = useState<Record<string, CostTotals>>({});
  const [strategies, setStrategies] = useState<Record<string, Strategy[]>>({});
  const [problems, setProblems] = useState<Record<string, Problem[]>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision[]>>({});
  const [releases, setReleases] = useState<Record<string, Release[]>>({});
  const [stakeholders, setStakeholders] = useState<Record<string, Stakeholder[]>>({});
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [products]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all tasks
      const tasksData = await tasksAPI.getAll();
      setTasks(tasksData);
      
      // Load cost totals for each product
      const totalsPromises = products.map(async (product) => {
        try {
          const totals = await costsAPI.getTotals({ product_id: product.id });
          return { productId: product.id, totals };
        } catch {
          return { productId: product.id, totals: null };
        }
      });
      
      const totalsResults = await Promise.all(totalsPromises);
      const totalsMap: Record<string, CostTotals> = {};
      totalsResults.forEach(({ productId, totals }) => {
        if (totals) {
          totalsMap[productId] = totals;
        }
      });
      setCostTotals(totalsMap);

      // Load data for all 7 areas
      const [allStrategies, allProblems, allDecisions, allReleases, allStakeholders, allMetrics] = await Promise.all([
        Promise.all(products.map(p => strategiesAPI.getByProduct(p.id).catch(() => []))),
        Promise.all(products.map(p => problemsAPI.getByProduct(p.id).catch(() => []))),
        Promise.all(products.map(p => decisionsAPI.getAll().catch(() => []))),
        Promise.all(products.map(p => releasesAPI.getByProduct(p.id).catch(() => []))),
        Promise.all(products.map(p => stakeholdersAPI.getByProduct(p.id).catch(() => []))),
        Promise.all(products.map(p => metricsAPI.getByProduct(p.id).catch(() => []))),
      ]);

      const strategiesMap: Record<string, Strategy[]> = {};
      const problemsMap: Record<string, Problem[]> = {};
      const decisionsMap: Record<string, Decision[]> = {};
      const releasesMap: Record<string, Release[]> = {};
      const stakeholdersMap: Record<string, Stakeholder[]> = {};
      const metricsMap: Record<string, Metric[]> = {};

      products.forEach((p, idx) => {
        strategiesMap[p.id] = allStrategies[idx];
        problemsMap[p.id] = allProblems[idx];
        decisionsMap[p.id] = allDecisions[idx].filter(d => {
          // Filter decisions by checking if any feature belongs to this product
          return true; // Simplified - would need feature lookup
        });
        releasesMap[p.id] = allReleases[idx];
        stakeholdersMap[p.id] = allStakeholders[idx];
        metricsMap[p.id] = allMetrics[idx];
      });

      setStrategies(strategiesMap);
      setProblems(problemsMap);
      setDecisions(decisionsMap);
      setReleases(releasesMap);
      setStakeholders(stakeholdersMap);
      setMetrics(metricsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatusCounts = (productId: string) => {
    const productTasks = tasks.filter(t => t.product_id === productId);
    return {
      todo: productTasks.filter(t => t.status === 'todo').length,
      in_progress: productTasks.filter(t => t.status === 'in_progress').length,
      blocked: productTasks.filter(t => t.status === 'blocked').length,
      done: productTasks.filter(t => t.status === 'done').length,
      total: productTasks.length,
    };
  };

  const getTotalCost = (productId: string): number => {
    const totals = costTotals[productId];
    if (!totals || !totals.totals) return 0;
    return Object.values(totals.totals).reduce((sum, val) => sum + val, 0);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'todo': return '#6c757d';
      case 'in_progress': return '#007bff';
      case 'blocked': return '#dc3545';
      case 'done': return '#28a745';
      default: return '#6c757d';
    }
  };

  const handleExportCSV = (product: Product) => {
    const productTasks = tasks.filter(t => t.product_id === product.id);
    const dashboardData = formatDashboardData([product], productTasks, []);
    exportToCSV(dashboardData, `dashboard-${product.name.replace(/\s+/g, '-').toLowerCase()}`);
  };

  const handleExportPDF = (product: Product) => {
    const statusCounts = getTaskStatusCounts(product.id);
    const totalCost = getTotalCost(product.id);
    const productStrategies = strategies[product.id] || [];
    const productProblems = problems[product.id] || [];
    const productReleases = releases[product.id] || [];
    const productMetrics = metrics[product.id] || [];

    const content = `
      <div class="card">
        <h2>${product.name}</h2>
        ${product.description ? `<p>${product.description}</p>` : ''}
        <p><strong>Total Cost of Ownership:</strong> $${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
      
      <div class="card">
        <h3>Task Status Summary</h3>
        <table>
          <tr><th>Status</th><th>Count</th></tr>
          <tr><td>To Do</td><td>${statusCounts.todo}</td></tr>
          <tr><td>In Progress</td><td>${statusCounts.in_progress}</td></tr>
          <tr><td>Blocked</td><td>${statusCounts.blocked}</td></tr>
          <tr><td>Done</td><td>${statusCounts.done}</td></tr>
          <tr><td><strong>Total</strong></td><td><strong>${statusCounts.total}</strong></td></tr>
        </table>
      </div>

      <div class="card">
        <h3>Product Management Overview</h3>
        <table>
          <tr><th>Area</th><th>Count</th></tr>
          <tr><td>Strategy Documents</td><td>${productStrategies.length}</td></tr>
          <tr><td>Problems Identified</td><td>${productProblems.length}</td></tr>
          <tr><td>Releases Planned</td><td>${productReleases.length}</td></tr>
          <tr><td>Metrics Tracked</td><td>${productMetrics.length}</td></tr>
        </table>
      </div>
    `;

    exportToPDF(`Dashboard - ${product.name}`, content);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
          No products available. Import a CSV file or create products.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {products.map((product) => {
        const statusCounts = getTaskStatusCounts(product.id);
        const totalCost = getTotalCost(product.id);
        
        return (
          <div key={product.id} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', marginBottom: '8px' }}>{product.name}</h2>
                {product.description && (
                  <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>{product.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCSV(product)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download size={14} />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPDF(product)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={14} />
                    PDF
                  </Button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Cost of Ownership</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#007bff' }}>
                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Task Status Summary */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
                  Task Status Summary
                </h3>
                {statusCounts.total === 0 ? (
                  <p style={{ color: '#666', fontSize: '14px' }}>No tasks for this product</p>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getStatusColor('todo') }}></div>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>To Do</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>{statusCounts.todo}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getStatusColor('in_progress') }}></div>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>In Progress</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>{statusCounts.in_progress}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getStatusColor('blocked') }}></div>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>Blocked</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>{statusCounts.blocked}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getStatusColor('done') }}></div>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>Done</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>{statusCounts.done}</span>
                    </div>
                    <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '2px solid #007bff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#007bff' }}>Total Tasks</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#007bff' }}>{statusCounts.total}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cost Summary */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
                  Cost Breakdown
                </h3>
                {totalCost === 0 ? (
                  <p style={{ color: '#666', fontSize: '14px' }}>No cost data available</p>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {costTotals[product.id] && costTotals[product.id].totals ? (
                      Object.entries(costTotals[product.id].totals).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{key}</span>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: '#28a745' }}>
                            ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#666', fontSize: '14px' }}>No cost breakdown available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Overview Cards for All 7 Areas */}
              <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
                  Product Management Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Strategy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{strategies[product.id]?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Strategy docs</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Discovery</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{problems[product.id]?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Problems identified</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Prioritization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{decisions[product.id]?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Decisions made</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Roadmap</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{releases[product.id]?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Releases planned</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Execution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statusCounts.done}</div>
                      <p className="text-xs text-muted-foreground">Tasks completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Stakeholders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stakeholders[product.id]?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Stakeholders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics[product.id]?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Metrics tracked</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

