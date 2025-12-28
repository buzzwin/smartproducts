'use client';

import { useEffect, useState } from 'react';
import { costsAPI } from '@/lib/api';
import type { CostItem, CostScenario } from '@/types';

interface ScenarioComparisonProps {
  productId: string;
  scenarios: CostScenario[];
}

export default function ScenarioComparison({ productId, scenarios }: ScenarioComparisonProps) {
  const [costsByScenario, setCostsByScenario] = useState<Record<string, CostItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [productId, scenarios]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load costs for each scenario
      const costsPromises = scenarios.map(async (scenario) => {
        const costs = await costsAPI.getAll({
          product_id: productId,
          scenario_id: scenario.id,
        });
        return { scenarioId: scenario.id, costs };
      });

      const results = await Promise.all(costsPromises);
      const costsMap = results.reduce((acc, { scenarioId, costs }) => {
        acc[scenarioId] = costs;
        return acc;
      }, {} as Record<string, CostItem[]>);

      setCostsByScenario(costsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenario data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading scenario comparison...</div>
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

  // Calculate totals for each scenario
  const scenarioTotals = scenarios.reduce((acc, scenario) => {
    const costs = costsByScenario[scenario.id] || [];
    acc[scenario.id] = {
      name: scenario.name,
      total: costs.reduce((sum, cost) => sum + cost.amount, 0),
      costs,
    };
    return acc;
  }, {} as Record<string, { name: string; total: number; costs: CostItem[] }>);

  // Get all unique cost item names across scenarios
  const allCostNames = new Set<string>();
  Object.values(costsByScenario).forEach((costs) => {
    costs.forEach((cost) => allCostNames.add(cost.name));
  });

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Scenario Comparison</h2>

      <table className="table">
        <thead>
          <tr>
            <th>Cost Item</th>
            {scenarios.map((scenario) => (
              <th key={scenario.id} style={{ textAlign: 'right' }}>
                {scenario.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(allCostNames).map((costName) => (
            <tr key={costName}>
              <td>{costName}</td>
              {scenarios.map((scenario) => {
                const cost = costsByScenario[scenario.id]?.find((c) => c.name === costName);
                return (
                  <td key={scenario.id} style={{ textAlign: 'right' }}>
                    {cost ? (
                      <span className="amount">
                        ${cost.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', borderTop: '2px solid #333' }}>
            <td>Total</td>
            {scenarios.map((scenario) => {
              const total = scenarioTotals[scenario.id]?.total || 0;
              return (
                <td key={scenario.id} style={{ textAlign: 'right' }}>
                  <span className="amount" style={{ fontSize: '16px' }}>
                    ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

