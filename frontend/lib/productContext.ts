/** Product Context API for AI Assistant shared memory */
import { fetchAPI } from './api';
import type { 
  Product, 
  Strategy, 
  Feature, 
  Task, 
  Problem, 
  Insight, 
  Release, 
  Stakeholder, 
  Metric, 
  Workstream,
  PrioritizationModel,
  PriorityScore,
  Roadmap,
  Cost,
  RevenueModel,
  PricingTier,
  UsageMetric,
  Decision
} from '@/types';

export interface ProductContext {
  product: Product;
  strategies: Strategy[];
  features: Feature[];
  tasks: Task[];
  problems: Problem[];
  insights: Insight[];
  releases: Release[];
  stakeholders: Stakeholder[];
  metrics: Metric[];
  workstreams: Workstream[];
  prioritization_models: PrioritizationModel[];
  priority_scores: PriorityScore[];
  roadmaps: Roadmap[];
  costs: Cost[];
  revenue_models: RevenueModel[];
  pricing_tiers: PricingTier[];
  usage_metrics: UsageMetric[];
  decisions: Decision[];
}

// Simple in-memory cache with TTL
const contextCache: Map<string, { data: ProductContext; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const productContextAPI = {
  /**
   * Get comprehensive product context for AI assistant.
   * Uses caching to avoid unnecessary API calls.
   */
  getContext: async (productId: string, useCache: boolean = true): Promise<ProductContext> => {
    // Check cache first
    if (useCache) {
      const cached = contextCache.get(productId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }

    // Fetch from API
    const context = await fetchAPI<ProductContext>(`/api/products/${productId}/context`);
    
    // Update cache
    if (useCache) {
      contextCache.set(productId, {
        data: context,
        timestamp: Date.now(),
      });
    }

    return context;
  },

  /**
   * Invalidate cache for a specific product.
   * Call this when product data is updated.
   */
  invalidateCache: (productId: string): void => {
    contextCache.delete(productId);
  },

  /**
   * Clear all cached contexts.
   */
  clearCache: (): void => {
    contextCache.clear();
  },
};

