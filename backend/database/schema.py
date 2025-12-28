"""Pydantic schemas for API request/response validation."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# Product Schemas
class ProductBase(BaseModel):
    """Base product schema."""
    name: str
    description: Optional[str] = None
    tco: Optional[float] = None  # Computed, never manual
    tco_currency: str = "USD"
    tco_last_calculated: Optional[datetime] = None
    owner: Optional[str] = None
    status: str = "active"  # "active", "archived", "deprecated"
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    tco: Optional[float] = None  # Not allowed in create
    tco_last_calculated: Optional[datetime] = None  # Not allowed in create


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")
    # tco fields are computed, not updatable


class ProductResponse(ProductBase):
    """Schema for product response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Cost Category Schemas
class CostCategoryBase(BaseModel):
    """Base cost category schema."""
    product_id: str
    name: str
    description: Optional[str] = None


class CostCategoryCreate(CostCategoryBase):
    """Schema for creating a cost category."""
    pass


class CostCategoryResponse(CostCategoryBase):
    """Schema for cost category response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Cost Scenario Schemas
class CostScenarioBase(BaseModel):
    """Base cost scenario schema."""
    name: str
    description: Optional[str] = None


class CostScenarioCreate(CostScenarioBase):
    """Schema for creating a cost scenario."""
    pass


class CostScenarioResponse(CostScenarioBase):
    """Schema for cost scenario response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Cost Type Schemas
class CostTypeBase(BaseModel):
    """Base cost type schema."""
    name: str
    description: Optional[str] = None


class CostTypeCreate(CostTypeBase):
    """Schema for creating a cost type."""
    pass


class CostTypeResponse(CostTypeBase):
    """Schema for cost type response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Cost Item Schemas
class CostItemBase(BaseModel):
    """Base cost item schema."""
    product_id: str
    category_id: Optional[str] = None
    scenario_id: str
    cost_type_id: Optional[str] = None
    name: str
    amount: float = Field(gt=0, description="Cost amount must be positive")
    currency: str = "USD"
    description: Optional[str] = None


class CostItemCreate(CostItemBase):
    """Schema for creating a cost item."""
    pass


class CostItemUpdate(BaseModel):
    """Schema for updating a cost item."""
    product_id: Optional[str] = None
    category_id: Optional[str] = None
    scenario_id: Optional[str] = None
    cost_type_id: Optional[str] = None
    name: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    description: Optional[str] = None


class CostItemResponse(CostItemBase):
    """Schema for cost item response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Aggregation Schemas
class CostTotalsResponse(BaseModel):
    """Schema for cost totals response."""
    product_id: Optional[str] = None
    scenario_id: Optional[str] = None
    totals: dict = Field(description="Dictionary of IDs to total amounts")


class ProductCostsResponse(BaseModel):
    """Schema for product costs response."""
    product: ProductResponse
    costs: List[CostItemResponse]
    total: float


# Feature Schemas
class FeatureBase(BaseModel):
    """Base feature schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    parent_feature_id: Optional[str] = None  # For hierarchical features
    name: str
    description: Optional[str] = None
    problem_ids: List[str] = Field(default_factory=list)  # Linked problems
    expected_outcomes: Optional[List[str]] = None
    status: str = Field(default="discovery", description="Status: 'discovery', 'design', 'development', 'shipped', 'archived'")
    owner: Optional[str] = None
    order: int = Field(default=0, description="Order for sorting features")
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")
    # Legacy RICE fields kept for migration
    rice_reach: Optional[int] = None
    rice_impact: Optional[float] = None
    rice_confidence: Optional[float] = None
    rice_effort: Optional[int] = None
    rice_score: Optional[float] = None
    target_release_date: Optional[datetime] = None
    value_score: Optional[float] = None
    effort_score: Optional[float] = None
    priority_framework: Optional[str] = None
    release_id: Optional[str] = None
    sprint_id: Optional[str] = None
    capacity_estimate: Optional[float] = None
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")


class FeatureCreate(FeatureBase):
    """Schema for creating a feature."""
    pass


class FeatureUpdate(BaseModel):
    """Schema for updating a feature."""
    product_id: Optional[str] = None
    module_id: Optional[str] = None  # Allow updating module_id
    parent_feature_id: Optional[str] = None  # Allow updating parent_feature_id
    order: Optional[int] = None  # Allow updating order
    name: Optional[str] = None
    description: Optional[str] = None
    problem_ids: Optional[List[str]] = None
    expected_outcomes: Optional[List[str]] = None
    owner: Optional[str] = None
    status: Optional[str] = None
    # Legacy fields still updatable for migration
    rice_reach: Optional[int] = None
    rice_impact: Optional[float] = None
    rice_confidence: Optional[float] = None
    rice_effort: Optional[int] = None
    rice_score: Optional[float] = None
    target_release_date: Optional[datetime] = None
    value_score: Optional[float] = None
    effort_score: Optional[float] = None
    priority_framework: Optional[str] = None
    release_id: Optional[str] = None
    sprint_id: Optional[str] = None
    capacity_estimate: Optional[float] = None


class FeatureResponse(FeatureBase):
    """Schema for feature response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Insight Schemas
class InsightBase(BaseModel):
    """Base insight schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    source: str = Field(..., description="Source: 'research', 'usage', 'ops', 'customer', 'support', 'sales'")
    observation: str = Field(..., description="What was observed")
    implication: Optional[str] = None  # What it means
    problem_id: Optional[str] = None  # Linked problem
    feature_id: Optional[str] = None
    votes: int = Field(default=0, description="Vote count")
    sentiment: Optional[str] = None
    status: str = Field(default="new", description="Status: 'new', 'under_review', 'addressed', 'dismissed'")
    # Legacy fields for backward compatibility
    title: Optional[str] = None  # Deprecated, use observation
    description: Optional[str] = None  # Deprecated
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    problem_statement: Optional[str] = None
    customer_segment: Optional[str] = None
    frequency: Optional[str] = None
    severity: Optional[str] = None


class InsightCreate(InsightBase):
    """Schema for creating an insight."""
    pass


class InsightUpdate(BaseModel):
    """Schema for updating an insight."""
    observation: Optional[str] = None
    implication: Optional[str] = None
    problem_id: Optional[str] = None
    feature_id: Optional[str] = None
    source: Optional[str] = None
    sentiment: Optional[str] = None
    status: Optional[str] = None
    votes: Optional[int] = None
    # Legacy fields
    title: Optional[str] = None
    description: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    problem_statement: Optional[str] = None
    customer_segment: Optional[str] = None
    frequency: Optional[str] = None
    severity: Optional[str] = None


class InsightResponse(InsightBase):
    """Schema for insight response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Resource Schemas
class ResourceBase(BaseModel):
    """Base resource schema."""
    name: str
    type: str = Field(..., description="Type: 'individual' or 'organization'")
    skills: List[str] = Field(default_factory=list)
    email: Optional[str] = None
    description: Optional[str] = None


class ResourceCreate(ResourceBase):
    """Schema for creating a resource."""
    pass


class ResourceUpdate(BaseModel):
    """Schema for updating a resource."""
    product_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = Field(None, description="Type: 'person', 'vendor', 'tool'")
    cost_rate: Optional[float] = None
    cost_period: Optional[str] = None
    currency: Optional[str] = None
    availability: Optional[float] = None
    skills: Optional[List[str]] = None
    email: Optional[str] = None
    description: Optional[str] = None


class ResourceResponse(ResourceBase):
    """Schema for resource response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Task Schemas
class TaskBase(BaseModel):
    """Base task schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    feature_id: Optional[str] = None
    problem_id: Optional[str] = None  # Link to problem if task addresses a customer problem
    workstream_id: Optional[str] = None
    phase_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    effort: Optional[float] = None  # In hours or story points
    status: str = Field(..., description="Status: 'todo', 'in_progress', 'blocked', or 'done'")
    priority: str = Field(..., description="Priority: 'low', 'medium', 'high', or 'critical'")
    dependencies: List[str] = Field(default_factory=list, description="List of task IDs this task depends on")
    assignee_ids: List[str] = Field(default_factory=list)
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    blockers: Optional[List[str]] = None
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")
    # Legacy field
    depends_on_task_ids: List[str] = Field(default_factory=list, description="Deprecated - use dependencies")


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    product_id: Optional[str] = None
    feature_id: Optional[str] = None
    problem_id: Optional[str] = None
    workstream_id: Optional[str] = None
    phase_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    effort: Optional[float] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dependencies: Optional[List[str]] = None
    assignee_ids: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    blockers: Optional[List[str]] = None
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")
    # Legacy field
    depends_on_task_ids: Optional[List[str]] = None


class TaskResponse(TaskBase):
    """Schema for task response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Workstream Schemas
class WorkstreamBase(BaseModel):
    """Base workstream schema."""
    product_id: str
    name: str
    description: Optional[str] = None
    order: int = 0


class WorkstreamCreate(WorkstreamBase):
    """Schema for creating a workstream."""
    pass


class WorkstreamUpdate(BaseModel):
    """Schema for updating a workstream."""
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None


class WorkstreamResponse(WorkstreamBase):
    """Schema for workstream response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Phase Schemas
class PhaseBase(BaseModel):
    """Base phase schema."""
    name: str
    description: Optional[str] = None
    order: int = 0


class PhaseCreate(PhaseBase):
    """Schema for creating a phase."""
    pass


class PhaseUpdate(BaseModel):
    """Schema for updating a phase."""
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None


class PhaseResponse(PhaseBase):
    """Schema for phase response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Strategy Schemas
class StrategyBase(BaseModel):
    """Base strategy schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    type: str = Field(..., description="Strategy type: 'vision', 'goals', 'themes', 'assumptions', 'risks'")
    title: str
    description: Optional[str] = None
    objectives: Optional[List[str]] = None  # For OKRs/goals
    key_results: Optional[List[dict]] = None  # For OKRs
    strategic_themes: Optional[List[str]] = None  # For themes
    assumptions: Optional[List[str]] = None  # For assumptions
    risks: Optional[List[str]] = None  # For risks
    status: str = Field(default="draft", description="Status: 'draft', 'active', 'archived'")
    target_date: Optional[datetime] = None


class StrategyCreate(StrategyBase):
    """Schema for creating a strategy."""
    pass


class StrategyUpdate(BaseModel):
    """Schema for updating a strategy."""
    product_id: Optional[str] = None
    module_id: Optional[str] = None  # Allow updating module_id (though typically scope shouldn't change)
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    objectives: Optional[List[str]] = None
    key_results: Optional[List[dict]] = None
    strategic_themes: Optional[List[str]] = None
    assumptions: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    status: Optional[str] = None
    target_date: Optional[datetime] = None


class StrategyResponse(StrategyBase):
    """Schema for strategy response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Problem Schemas
class ProblemBase(BaseModel):
    """Base problem schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    title: str
    description: Optional[str] = None
    evidence: Optional[List[str]] = None  # Research, feedback, metrics
    severity: str = Field(..., description="Severity: 'low', 'medium', 'high', 'critical'")
    affected_stakeholders: Optional[List[str]] = None
    insight_ids: List[str] = Field(default_factory=list, description="List of insight IDs linked to this problem")
    task_ids: List[str] = Field(default_factory=list, description="List of task IDs that address this problem")
    feature_id: Optional[str] = None
    status: str = Field(default="identified", description="Status: 'identified', 'validating', 'prioritized', 'addressed', 'dismissed'")
    priority: str = Field(default="medium", description="Priority: 'low', 'medium', 'high', 'critical'")


class ProblemCreate(ProblemBase):
    """Schema for creating a problem."""
    pass


class ProblemUpdate(BaseModel):
    """Schema for updating a problem."""
    product_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    evidence: Optional[List[str]] = None
    severity: Optional[str] = None
    affected_stakeholders: Optional[List[str]] = None
    insight_ids: Optional[List[str]] = None
    task_ids: Optional[List[str]] = None
    feature_id: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class ProblemResponse(ProblemBase):
    """Schema for problem response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Interview Schemas
class InterviewBase(BaseModel):
    """Base interview schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    interviewee_name: str
    interviewee_email: Optional[str] = None
    date: datetime
    notes: Optional[str] = None
    insight_ids: List[str] = Field(default_factory=list, description="List of insight IDs from this interview")


class InterviewCreate(InterviewBase):
    """Schema for creating an interview."""
    pass


class InterviewUpdate(BaseModel):
    """Schema for updating an interview."""
    product_id: Optional[str] = None
    interviewee_name: Optional[str] = None
    interviewee_email: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None
    insight_ids: Optional[List[str]] = None


class InterviewResponse(InterviewBase):
    """Schema for interview response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Decision Schemas
class DecisionBase(BaseModel):
    """Base decision schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    entity_type: str = Field(..., description="Entity type: 'problem', 'feature', 'capability'")
    entity_id: str
    outcome: str = Field(..., description="Outcome: 'now', 'next', 'later', 'drop'")
    rationale: Optional[str] = None
    priority_score_id: Optional[str] = None  # Link to score
    review_date: Optional[datetime] = None
    decision_maker: Optional[str] = None
    decision_date: datetime
    # Legacy fields for backward compatibility
    feature_id: Optional[str] = None  # Deprecated
    decision_type: Optional[str] = None  # Deprecated - use outcome
    title: Optional[str] = None  # Deprecated
    description: Optional[str] = None  # Deprecated - use rationale
    alternatives: Optional[List[str]] = None  # Deprecated


class DecisionCreate(DecisionBase):
    """Schema for creating a decision."""
    # Legacy fields not required in create
    feature_id: Optional[str] = None
    decision_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    alternatives: Optional[List[str]] = None


class DecisionUpdate(BaseModel):
    """Schema for updating a decision."""
    product_id: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    outcome: Optional[str] = None
    rationale: Optional[str] = None
    priority_score_id: Optional[str] = None
    review_date: Optional[datetime] = None
    decision_maker: Optional[str] = None
    decision_date: Optional[datetime] = None
    # Legacy fields
    feature_id: Optional[str] = None
    decision_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    alternatives: Optional[List[str]] = None


class DecisionResponse(DecisionBase):
    """Schema for decision response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Release Schemas
class ReleaseBase(BaseModel):
    """Base release schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    status: str = Field(default="planned", description="Status: 'planned', 'in_progress', 'released', 'cancelled'")
    feature_ids: List[str] = Field(default_factory=list, description="List of feature IDs in this release")


class ReleaseCreate(ReleaseBase):
    """Schema for creating a release."""
    pass


class ReleaseUpdate(BaseModel):
    """Schema for updating a release."""
    product_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    status: Optional[str] = None
    feature_ids: Optional[List[str]] = None


class ReleaseResponse(ReleaseBase):
    """Schema for release response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Stakeholder Schemas
class StakeholderBase(BaseModel):
    """Base stakeholder schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    email: str
    role: Optional[str] = None
    communication_preferences: Optional[str] = None
    update_frequency: Optional[str] = Field(None, description="Update frequency: 'daily', 'weekly', 'monthly', 'quarterly'")


class StakeholderCreate(StakeholderBase):
    """Schema for creating a stakeholder."""
    pass


class StakeholderUpdate(BaseModel):
    """Schema for updating a stakeholder."""
    product_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    influence_level: Optional[str] = None
    interests: Optional[List[str]] = None
    communication_preferences: Optional[str] = None
    update_frequency: Optional[str] = None


class StakeholderResponse(StakeholderBase):
    """Schema for stakeholder response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Status Report Schemas
class StatusReportBase(BaseModel):
    """Base status report schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    report_date: datetime
    summary: str
    highlights: Optional[List[str]] = Field(default_factory=list)
    risks: Optional[List[str]] = Field(default_factory=list)
    next_steps: Optional[List[str]] = Field(default_factory=list)
    stakeholder_ids: List[str] = Field(default_factory=list, description="List of stakeholder IDs who received this report")


class StatusReportCreate(StatusReportBase):
    """Schema for creating a status report."""
    pass


class StatusReportUpdate(BaseModel):
    """Schema for updating a status report."""
    product_id: Optional[str] = None
    report_date: Optional[datetime] = None
    summary: Optional[str] = None
    highlights: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    next_steps: Optional[List[str]] = None
    stakeholder_ids: Optional[List[str]] = None


class StatusReportResponse(StatusReportBase):
    """Schema for status report response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Metric Schemas
class MetricBase(BaseModel):
    """Base metric schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    scope: str = Field(..., description="Scope: 'product', 'capability', 'feature', 'module'")
    scope_id: Optional[str] = None  # ID of capability/feature if scope is not product
    metric_type: str = Field(..., description="Metric type: 'outcome', 'output', 'health'")
    name: str
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: str
    tracking_frequency: str = "weekly"
    description: Optional[str] = None
    # Legacy fields for backward compatibility
    okr_id: Optional[str] = None
    feature_id: Optional[str] = None
    type: Optional[str] = None


class MetricCreate(MetricBase):
    """Schema for creating a metric."""
    # Legacy fields not required in create
    okr_id: Optional[str] = None
    feature_id: Optional[str] = None
    type: Optional[str] = None


class MetricUpdate(BaseModel):
    """Schema for updating a metric."""
    product_id: Optional[str] = None
    scope: Optional[str] = None
    scope_id: Optional[str] = None
    metric_type: Optional[str] = None
    name: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    tracking_frequency: Optional[str] = None
    description: Optional[str] = None
    # Legacy fields
    okr_id: Optional[str] = None
    feature_id: Optional[str] = None
    type: Optional[str] = None


class MetricResponse(MetricBase):
    """Schema for metric response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Outcome Schemas
class OutcomeBase(BaseModel):
    """Base outcome schema."""
    product_id: str
    feature_id: Optional[str] = None
    metric_id: Optional[str] = None
    description: str
    status: str = Field(default="pending", description="Status: 'pending', 'achieved', 'not_achieved'")
    achieved_date: Optional[datetime] = None


class OutcomeCreate(OutcomeBase):
    """Schema for creating an outcome."""
    pass


class OutcomeUpdate(BaseModel):
    """Schema for updating an outcome."""
    product_id: Optional[str] = None
    feature_id: Optional[str] = None
    metric_id: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    achieved_date: Optional[datetime] = None


class OutcomeResponse(OutcomeBase):
    """Schema for outcome response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# PrioritizationModel Schemas
class PrioritizationModelBase(BaseModel):
    """Base prioritization model schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    type: str = Field(..., description="Type: 'rice', 'ice', 'custom', 'value-effort', 'kano'")
    criteria: List[str] = Field(default_factory=list)
    weights: Optional[dict] = None
    applies_to: str = Field(..., description="Applies to: 'problem', 'feature', 'capability', 'all'")
    version: int = 1
    is_active: bool = True


class PrioritizationModelCreate(PrioritizationModelBase):
    """Schema for creating a prioritization model."""
    pass


class PrioritizationModelUpdate(BaseModel):
    """Schema for updating a prioritization model."""
    name: Optional[str] = None
    type: Optional[str] = None
    criteria: Optional[List[str]] = None
    weights: Optional[dict] = None
    applies_to: Optional[str] = None
    version: Optional[int] = None
    is_active: Optional[bool] = None


class PrioritizationModelResponse(PrioritizationModelBase):
    """Schema for prioritization model response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# PriorityScore Schemas
class PriorityScoreBase(BaseModel):
    """Base priority score schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    entity_type: str = Field(..., description="Entity type: 'problem', 'feature', 'capability'")
    entity_id: str
    prioritization_model_id: str
    inputs: dict = Field(..., description="Input values for scoring")
    score: float
    confidence: Optional[float] = None
    assumptions: Optional[List[str]] = None
    calculated_at: datetime
    version: int = 1


class PriorityScoreCreate(PriorityScoreBase):
    """Schema for creating a priority score."""
    pass


class PriorityScoreUpdate(BaseModel):
    """Schema for updating a priority score."""
    inputs: Optional[dict] = None
    score: Optional[float] = None
    confidence: Optional[float] = None
    assumptions: Optional[List[str]] = None
    version: Optional[int] = None


class PriorityScoreResponse(PriorityScoreBase):
    """Schema for priority score response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Roadmap Schemas
class RoadmapBase(BaseModel):
    """Base roadmap schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    type: str = Field(..., description="Type: 'now-next-later', 'timeline', 'quarters', 'custom'")
    description: Optional[str] = None
    timeboxes: Optional[List[dict]] = None
    roadmap_items: List[dict] = Field(default_factory=list)
    is_active: bool = True


class RoadmapCreate(RoadmapBase):
    """Schema for creating a roadmap."""
    pass


class RoadmapUpdate(BaseModel):
    """Schema for updating a roadmap."""
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    timeboxes: Optional[List[dict]] = None
    roadmap_items: Optional[List[dict]] = None
    is_active: Optional[bool] = None


class RoadmapResponse(RoadmapBase):
    """Schema for roadmap response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Cost Schemas
class CostBase(BaseModel):
    """Base cost schema."""
    product_id: str
    module_id: Optional[str] = None  # Optional - for module-level costs
    scope: str = Field(..., description="Scope: 'task', 'capability', 'product', 'shared'")
    scope_id: Optional[str] = None
    category: str = Field(..., description="Category: 'build', 'run', 'maintain', 'scale', 'overhead'")
    cost_type: str = Field(..., description="Cost type: 'labor', 'infra', 'license', 'vendor', 'other'")
    cost_type_id: Optional[str] = None
    name: str
    amount: float
    currency: str = "USD"
    recurrence: str = Field(..., description="Recurrence: 'one-time', 'monthly', 'quarterly', 'annual'")
    amortization_period: Optional[int] = None
    time_period_start: Optional[datetime] = None
    time_period_end: Optional[datetime] = None
    description: Optional[str] = None
    resource_id: Optional[str] = None
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")


class CostCreate(CostBase):
    """Schema for creating a cost."""
    pass


class CostUpdate(BaseModel):
    """Schema for updating a cost."""
    module_id: Optional[str] = None  # Optional - for module-level costs
    scope: Optional[str] = None
    scope_id: Optional[str] = None
    category: Optional[str] = None
    cost_type: Optional[str] = None
    cost_type_id: Optional[str] = None
    name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    recurrence: Optional[str] = None
    amortization_period: Optional[int] = None
    time_period_start: Optional[datetime] = None
    time_period_end: Optional[datetime] = None
    description: Optional[str] = None
    resource_id: Optional[str] = None
    cost_classification: Optional[str] = None


class CostResponse(CostBase):
    """Schema for cost response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# RevenueModel Schemas
class RevenueModelBase(BaseModel):
    """Base revenue model schema."""
    product_id: str
    model_type: str = Field(..., description="Model type: 'per_customer', 'per_job', 'tiered', 'subscription', 'usage_based', 'one_time', 'freemium', 'hybrid'")
    description: Optional[str] = None
    base_revenue: Optional[float] = None
    currency: str = "USD"
    assumptions: Optional[List[str]] = None
    is_active: bool = True


class RevenueModelCreate(RevenueModelBase):
    """Schema for creating a revenue model."""
    pass


class RevenueModelUpdate(BaseModel):
    """Schema for updating a revenue model."""
    model_type: Optional[str] = None
    description: Optional[str] = None
    base_revenue: Optional[float] = None
    currency: Optional[str] = None
    assumptions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class RevenueModelResponse(RevenueModelBase):
    """Schema for revenue model response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# PricingTier Schemas
class PricingTierBase(BaseModel):
    """Base pricing tier schema."""
    product_id: str
    revenue_model_id: Optional[str] = None
    name: str
    price: float
    currency: str = "USD"
    billing_period: Optional[str] = None  # "monthly", "annual", "one_time"
    features: List[str] = Field(default_factory=list)
    limits: Optional[dict] = None
    overage_rules: Optional[dict] = None
    description: Optional[str] = None


class PricingTierCreate(PricingTierBase):
    """Schema for creating a pricing tier."""
    pass


class PricingTierUpdate(BaseModel):
    """Schema for updating a pricing tier."""
    revenue_model_id: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    billing_period: Optional[str] = None
    features: Optional[List[str]] = None
    limits: Optional[dict] = None
    overage_rules: Optional[dict] = None
    description: Optional[str] = None


class PricingTierResponse(PricingTierBase):
    """Schema for pricing tier response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# UsageMetric Schemas
class UsageMetricBase(BaseModel):
    """Base usage metric schema."""
    product_id: str
    metric_type: str = Field(..., description="Metric type: 'jobs', 'customers', 'api_calls', 'storage', 'active_users'")
    name: str
    unit: str = Field(..., description="Unit: 'count', 'GB', 'hours', 'users'")
    volume: Optional[float] = None
    target_volume: Optional[float] = None
    time_period: str = Field(..., description="Time period: 'daily', 'weekly', 'monthly', 'quarterly'")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    description: Optional[str] = None


class UsageMetricCreate(UsageMetricBase):
    """Schema for creating a usage metric."""
    pass


class UsageMetricUpdate(BaseModel):
    """Schema for updating a usage metric."""
    metric_type: Optional[str] = None
    name: Optional[str] = None
    unit: Optional[str] = None
    volume: Optional[float] = None
    target_volume: Optional[float] = None
    time_period: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    description: Optional[str] = None


class UsageMetricResponse(UsageMetricBase):
    """Schema for usage metric response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Notification Schemas
class NotificationBase(BaseModel):
    """Base notification schema."""
    user_id: str  # Clerk user ID
    organization_id: Optional[str] = None  # Clerk org ID
    type: str = Field(..., description="Type: 'task_assigned', 'deadline_approaching', 'status_change', 'metric_alert', 'stakeholder_update'")
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    read: bool = False
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None
    priority: str = Field(default="normal", description="Priority: 'low', 'normal', 'high', 'urgent'")


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""
    read: bool = False  # Not settable on create
    read_at: Optional[datetime] = None  # Not settable on create


class NotificationUpdate(BaseModel):
    """Schema for updating a notification."""
    read: Optional[bool] = None
    read_at: Optional[datetime] = None


class NotificationResponse(NotificationBase):
    """Schema for notification response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Module Schemas
class ModuleBase(BaseModel):
    """Base module schema."""
    product_id: str  # Required - modules belong to products
    name: str
    description: Optional[str] = None
    owner_id: Optional[str] = None  # Clerk user ID
    is_default: bool = False
    status: str = Field(default="ideation", description="Module status: 'ideation', 'in_development', 'production', 'maintenance', 'archived'")
    enabled_steps: List[str] = Field(default_factory=list, description="List of workflow steps: ['strategy', 'discovery', 'prioritization', 'roadmap', 'execution', 'stakeholders', 'metrics']")
    step_order: List[str] = Field(default_factory=list, description="Custom order of steps")
    layout_config: Optional[dict] = None
    settings: Optional[dict] = None
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")


class ModuleCreate(ModuleBase):
    """Schema for creating a module."""
    pass


class ModuleUpdate(BaseModel):
    """Schema for updating a module."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    status: Optional[str] = None
    enabled_steps: Optional[List[str]] = None
    step_order: Optional[List[str]] = None
    layout_config: Optional[dict] = None
    settings: Optional[dict] = None
    cost_classification: Optional[str] = Field(None, description="Cost classification: 'run' (Run/KTLO) or 'change' (Change/Growth)")


class ModuleResponse(ModuleBase):
    """Schema for module response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

