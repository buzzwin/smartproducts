"use client";

import { useState, useEffect } from "react";
import { unifiedCostsAPI } from "@/lib/api";
import type { Cost } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface CostTotalsSummaryProps {
  productId?: string;
}

export default function CostTotalsSummary({ productId }: CostTotalsSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({
    total: 0,
    run: 0,
    change: 0,
    byCategory: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  });

  useEffect(() => {
    loadTotals();
  }, [productId]);

  const loadTotals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = productId ? { product_id: productId } : {};
      const costs = await unifiedCostsAPI.getAll(params);
      
      // Calculate totals
      const calculatedTotals = {
        total: 0,
        run: 0,
        change: 0,
        byCategory: {} as Record<string, number>,
        byType: {} as Record<string, number>,
      };

      costs.forEach((cost: Cost) => {
        const amount = cost.amount || 0;
        calculatedTotals.total += amount;

        // Classify by run/change
        if (cost.cost_classification === "run") {
          calculatedTotals.run += amount;
        } else if (cost.cost_classification === "change") {
          calculatedTotals.change += amount;
        }

        // Group by category
        const category = cost.category || "other";
        calculatedTotals.byCategory[category] =
          (calculatedTotals.byCategory[category] || 0) + amount;

        // Group by type
        const type = cost.cost_type || "other";
        calculatedTotals.byType[type] =
          (calculatedTotals.byType[type] || 0) + amount;
      });

      setTotals(calculatedTotals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cost totals");
      console.error("Error loading cost totals:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading cost totals...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  const runPercentage =
    totals.total > 0 ? ((totals.run / totals.total) * 100).toFixed(1) : "0";
  const changePercentage =
    totals.total > 0 ? ((totals.change / totals.total) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Current Cost Totals
        </CardTitle>
        <CardDescription>
          {productId ? "Product costs" : "All costs across products"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Grand Total */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(totals.total)}
              </div>
            </div>
          </div>

          {/* Run vs Change */}
          {totals.total > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-xs text-muted-foreground">Run Costs</div>
                </div>
                <div className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                  {formatCurrency(totals.run)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {runPercentage}% of total
                </div>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <div className="text-xs text-muted-foreground">Change Costs</div>
                </div>
                <div className="text-xl font-semibold text-orange-700 dark:text-orange-300">
                  {formatCurrency(totals.change)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {changePercentage}% of total
                </div>
              </div>
            </div>
          )}

          {/* By Category */}
          {Object.keys(totals.byCategory).length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2">By Category</div>
              <div className="space-y-2">
                {Object.entries(totals.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm capitalize">{category}</span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* By Type */}
          {Object.keys(totals.byType).length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2">By Type</div>
              <div className="space-y-2">
                {Object.entries(totals.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, amount]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm capitalize">{type}</span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {totals.total === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No costs found. Add costs to see totals.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

