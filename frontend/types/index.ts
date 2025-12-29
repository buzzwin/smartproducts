/** Type definitions for the SmartProducts Platform application */

export interface Product {
  id: string;
  name: string;
  description?: string;
  tco?: number; // Computed, never manual
  tco_currency?: string;
  tco_last_calculated?: string;
  owner?: string;
  status?: string; // "active", "archived", "deprecated"
  cost_classification?: CostClassification;  // 'run' (Run/KTLO) or 'change' (Change/Growth)
  created_at?: string;
  updated_at?: string;
}

export interface CostScenario {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CostItem {
  id: string;
  product_id: string;
  category_id?: string;
  scenario_id: string;
  cost_type_id?: string;
  name: string;
  amount: number;
  currency: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCosts {
  product: Product;
  costs: CostItem[];
  total: number;
}

export interface CostTotals {
  product_id?: string;
  scenario_id?: string;
  totals: Record<string, number>;
}

export interface Feature {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  parent_feature_id?: string;  // For hierarchical features
  name: string;
  description?: string;
  owner?: string;
  problem_ids?: string[];
  expected_outcomes?: string[];
  status?: string;
  order?: number;  // For ordering features
  cost_classification?: CostClassification;  // 'run' (Run/KTLO) or 'change' (Change/Growth)
  created_at?: string;
  updated_at?: string;
}

export type ResourceType = 'individual' | 'organization';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  skills: string[];
  product_id?: string;
  cost_rate?: number;
  cost_period?: string;
  currency?: string;
  availability?: number;
  email?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// Note: Capability interface removed - use Feature with parent_feature_id for hierarchy

export interface Workstream {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Phase {
  id: string;
  name: string;
  description?: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  feature_id?: string;
  problem_id?: string;  // Link to problem if task addresses a customer problem
  workstream_id?: string;
  phase_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids: string[];
    depends_on_task_ids?: string[]; // Legacy, use dependencies
    dependencies?: string[]; // New field
    estimated_hours?: number;
  actual_hours?: number;
  blockers?: string[];
  due_date?: string;
  cost_classification?: CostClassification;  // 'run' (Run/KTLO) or 'change' (Change/Growth)
  // Computed cost fields (calculated from resource assignments)
  estimated_cost?: number;  // Calculated from estimated_hours × resource costs
  total_cost?: number;  // Calculated from actual_hours (or estimated_hours) × resource costs
  created_at?: string;
  updated_at?: string;
}

export type StrategyType = 'vision' | 'goals' | 'themes' | 'assumptions' | 'risks' | 'strategy' | 'okr';
export type StrategyStatus = 'draft' | 'active' | 'archived';

export interface KeyResult {
  description: string;
  target: string;
  current?: string;
}

export interface Strategy {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  type: StrategyType;
  title: string;
  description?: string;
  objectives?: string[];
  key_results?: KeyResult[];
  strategic_themes?: string[];
  assumptions?: string[];
  risks?: string[];
  status: StrategyStatus;
  target_date?: string;
  created_at?: string;
  updated_at?: string;
}

export type ProblemStatus = 'identified' | 'validating' | 'prioritized' | 'addressed' | 'dismissed';
export type ProblemPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Problem {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  title: string;
  description?: string;
  insight_ids?: string[];
  task_ids?: string[];  // Links to tasks that address this problem
  feature_id?: string;
  evidence?: Record<string, any>;
  severity?: string;
  affected_stakeholders?: string[];
  status: ProblemStatus;
  priority: ProblemPriority;
  created_at?: string;
  updated_at?: string;
}

export interface Insight {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  title: string;
  description?: string;
  source: string;
  status?: string;
  votes?: number;
  sentiment?: string;
  problem_id?: string;
  feature_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Interview {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  interviewee_name: string;
  interviewee_email?: string;
  date: string;
  notes?: string;
  insight_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export type DecisionType = 'prioritize' | 'defer' | 'cancel' | 'approve' | 'other'; // Legacy
export type DecisionOutcome = 'now' | 'next' | 'later' | 'drop';

export interface Decision {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  entity_type: string; // "problem", "feature", "capability"
  entity_id: string;
  outcome: DecisionOutcome;
  rationale?: string;
  priority_score_id?: string;
  review_date?: string;
  decision_maker?: string;
  decision_date?: string;
  // Legacy fields (deprecated but kept for backward compatibility)
  feature_id?: string;
  decision_type?: DecisionType;
  title?: string;
  description?: string;
  alternatives?: string[];
  created_at?: string;
  updated_at?: string;
}

export type ReleaseStatus = 'planned' | 'in_progress' | 'released' | 'cancelled';

export interface Release {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  name: string;
  description?: string;
  target_date?: string;
  status: ReleaseStatus;
  feature_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Stakeholder {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  name: string;
  email: string;
  company_name?: string;
  role?: string;
  influence_level?: string;
  interests?: string[];
  communication_preferences?: string;
  update_frequency?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StatusReport {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  report_date: string;
  summary: string;
  highlights?: string[];
  risks?: string[];
  next_steps?: string[];
  stakeholder_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export type MetricType = 'leading' | 'lagging'; // Legacy
export type MetricTypeNew = 'outcome' | 'output' | 'health';
export type MetricScope = 'product' | 'feature' | 'module';

export interface Metric {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  scope: MetricScope;
  scope_id?: string;
  metric_type: MetricTypeNew;
  name: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  tracking_frequency?: string;
  description?: string;
  // Legacy fields (deprecated but kept for backward compatibility)
  okr_id?: string;
  feature_id?: string;
  type?: MetricType;
  created_at?: string;
  updated_at?: string;
}

export type OutcomeStatus = 'pending' | 'achieved' | 'not_achieved';

export interface Outcome {
  id: string;
  product_id: string;
  feature_id?: string;
  metric_id?: string;
  description: string;
  status: OutcomeStatus;
  achieved_date?: string;
  created_at?: string;
  updated_at?: string;
}

// New canonical model types

export type PrioritizationModelType = 'rice' | 'ice' | 'value_effort' | 'kano' | 'custom';
export type AppliesTo = 'problem' | 'feature';

export interface PrioritizationModel {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  name: string;
  type: PrioritizationModelType;
  criteria?: Record<string, any>;
  weights?: Record<string, number>;
  applies_to: AppliesTo;
  version: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PriorityScore {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  entity_type: string;
  entity_id: string;
  prioritization_model_id?: string;
  inputs?: Record<string, any>;
  score: number;
  confidence?: number;
  assumptions?: string[];
  calculated_at: string;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export type RoadmapType = 'now_next_later' | 'timeline' | 'quarters' | 'custom';

export interface Roadmap {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - can be module-specific or product-level
  name: string;
  type: RoadmapType;
  description?: string;
  timeboxes?: Record<string, any>[];
  roadmap_items?: Record<string, any>[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CostScope = 'product' | 'module' | 'feature' | 'resource' | 'hardware' | 'software' | 'database' | 'consulting';
export type CostCategory = 'build' | 'run' | 'maintain' | 'scale' | 'overhead';
export type CostType = 'labor' | 'infra' | 'license' | 'vendor' | 'other';
export type CostRecurrence = 'one-time' | 'monthly' | 'quarterly' | 'annual';
export type CostClassification = 'run' | 'change';  // 'run' = Run/KTLO, 'change' = Change/Growth

export interface Cost {
  id: string;
  product_id: string;
  module_id?: string;  // Optional - for module-level costs
  scope: CostScope;
  scope_id?: string;
  category: CostCategory;
  cost_type: CostType;
  cost_type_id?: string;
  name: string;
  amount: number;
  currency: string;
  recurrence: CostRecurrence;
  amortization_period?: number;
  time_period_start?: string;
  time_period_end?: string;
  description?: string;
  resource_id?: string;
  cost_classification?: CostClassification;  // 'run' (Run/KTLO) or 'change' (Change/Growth)
  created_at?: string;
  updated_at?: string;
}

export type RevenueModelType = 'per_customer' | 'per_job' | 'tiered' | 'subscription' | 'usage_based' | 'one_time' | 'freemium' | 'hybrid';

export interface RevenueModel {
  id: string;
  product_id: string;
  model_type: RevenueModelType;
  description?: string;
  base_revenue?: number;
  currency: string;
  assumptions?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PricingTier {
  id: string;
  product_id: string;
  revenue_model_id?: string;
  name: string;
  price: number;
  currency: string;
  billing_period?: string;
  features?: string[];
  limits?: Record<string, any>;
  overage_rules?: Record<string, any>;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export type UsageMetricType = 'jobs' | 'customers' | 'api_calls' | 'storage' | 'bandwidth' | 'custom';

export interface UsageMetric {
  id: string;
  product_id: string;
  metric_type: UsageMetricType;
  name: string;
  unit: string;
  volume: number;
  target_volume?: number;
  time_period?: string;
  period_start?: string;
  period_end?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'update';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  organization_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  read: boolean;
  read_at?: string;
  action_url?: string;
  priority: NotificationPriority;
  created_at?: string;
  updated_at?: string;
}

export type ModuleStatus = 'ideation' | 'in_development' | 'production' | 'maintenance' | 'archived';

export interface Module {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  owner_id?: string;
  is_default: boolean;
  status?: ModuleStatus;
  layout_config?: Record<string, any>;
  settings?: Record<string, any>;
  cost_classification?: CostClassification;  // 'run' (Run/KTLO) or 'change' (Change/Growth)
  created_at?: string;
  updated_at?: string;
}

// TCO related types
export interface TCOBreakdown {
  product_id: string;
  product_name: string;
  total_tco: number;
  currency: string;
  time_period_months: number;
  calculated_at: string;
  breakdown: Record<string, number>; // By category
  breakdown_by_scope: Record<string, number>;
  breakdown_by_cost_type: Record<string, number>;
  costs: Array<{
    id: string;
    name: string;
    scope: string;
    scope_id?: string;
    category: string;
    cost_type: string;
    amount: number;
    currency: string;
    recurrence: string;
    period_cost: number;
    description?: string;
  }>;
}

