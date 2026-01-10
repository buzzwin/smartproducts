"""Base model definitions shared across database implementations."""
from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel


class BaseEntity(BaseModel):
    """Base entity model with common fields."""
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Product(BaseEntity):
    """Product - the unit of value, decision-making, cost, and revenue."""
    name: str
    description: Optional[str] = None
    tco: Optional[float] = None  # Computed, never manual
    tco_currency: str = "USD"
    tco_last_calculated: Optional[datetime] = None
    # Governance
    owner: Optional[str] = None
    status: str = "active"  # "active", "archived", "deprecated"
    cost_classification: Optional[str] = None  # "run" (Run/KTLO) or "change" (Change/Growth)


class CostCategory(BaseEntity):
    """Cost category model."""
    product_id: str
    name: str
    description: Optional[str] = None


class CostScenario(BaseEntity):
    """Cost scenario model."""
    name: str
    description: Optional[str] = None


class CostType(BaseEntity):
    """Cost type model (server, database, llm, saas)."""
    name: str
    description: Optional[str] = None


class Cost(BaseEntity):
    """Atomic cost - can be at any scope."""
    product_id: str
    module_id: Optional[str] = None  # Optional - for module-level costs
    scope: str  # "task", "capability", "module", "product", "shared"
    scope_id: Optional[str] = None  # ID of task/capability/module if scope is task/capability/module
    category: str  # "build", "run", "maintain", "scale", "overhead"
    cost_type: str  # "labor", "infra", "license", "vendor", "other"
    cost_type_id: Optional[str] = None  # Link to CostType if exists
    name: str
    amount: float
    currency: str = "USD"
    recurrence: str  # "one-time", "monthly", "quarterly", "annual"
    amortization_period: Optional[int] = None  # Months to amortize
    time_period_start: Optional[datetime] = None
    time_period_end: Optional[datetime] = None
    description: Optional[str] = None
    resource_id: Optional[str] = None  # If cost is from a resource
    vendor_id: Optional[str] = None  # If cost is from a vendor
    cost_classification: Optional[str] = None  # "run" (Run/KTLO) or "change" (Change/Growth)


class CostItem(BaseEntity):
    """Legacy cost item model - deprecated, use Cost instead."""
    product_id: str
    category_id: Optional[str] = None
    scenario_id: str
    cost_type_id: Optional[str] = None
    name: str
    amount: float
    currency: str = "USD"
    description: Optional[str] = None


class RevenueModel(BaseEntity):
    """Revenue model for the product."""
    product_id: str
    model_type: str  # "per_customer", "per_job", "tiered", "subscription", "usage_based", "one_time", "freemium", "hybrid"
    description: Optional[str] = None
    base_revenue: Optional[float] = None
    currency: str = "USD"
    assumptions: Optional[List[str]] = None
    is_active: bool = True


class PricingTier(BaseEntity):
    """Pricing tier."""
    product_id: str
    revenue_model_id: Optional[str] = None
    name: str  # "Free", "Pro", "Enterprise"
    price: float
    currency: str = "USD"
    billing_period: Optional[str] = None  # "monthly", "annual", "one_time"
    features: List[str] = []  # Feature names included
    limits: Optional[dict] = None  # Usage limits
    overage_rules: Optional[dict] = None
    description: Optional[str] = None


class UsageMetric(BaseEntity):
    """Usage metrics for tracking product usage."""
    product_id: str
    metric_type: str  # "jobs", "customers", "api_calls", "storage", "active_users"
    name: str
    unit: str  # "count", "GB", "hours", "users"
    volume: Optional[float] = None  # Current volume
    target_volume: Optional[float] = None
    time_period: str  # "daily", "weekly", "monthly", "quarterly"
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    description: Optional[str] = None


class Insight(BaseEntity):
    """Learnings derived from discovery."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    source: str  # "research", "usage", "ops", "customer", "support", "sales"
    observation: str  # What was observed (renamed from title)
    implication: Optional[str] = None  # What it means
    problem_id: Optional[str] = None  # Linked problem
    feature_id: Optional[str] = None  # Linked feature
    votes: int = 0
    sentiment: Optional[str] = None
    status: str = "new"
    # Legacy fields for backward compatibility
    title: Optional[str] = None  # Deprecated, use observation
    description: Optional[str] = None  # Deprecated, use observation/implication
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    problem_statement: Optional[str] = None
    customer_segment: Optional[str] = None
    frequency: Optional[str] = None
    severity: Optional[str] = None


class Feature(BaseEntity):
    """Customer-facing feature - can be product-level or module-specific, supports hierarchy."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    parent_feature_id: Optional[str] = None  # For hierarchical features
    name: str
    description: Optional[str] = None
    problem_ids: List[str] = []  # Linked problems
    expected_outcomes: Optional[List[str]] = None
    status: str = "discovery"  # "discovery", "design", "development", "shipped", "archived"
    owner: Optional[str] = None
    order: int = 0  # For ordering features
    cost_classification: Optional[str] = None  # "run" (Run/KTLO) or "change" (Change/Growth)
    # Prioritization fields (moved to PriorityScore)
    # RICE fields removed - use PriorityScore instead
    # Legacy fields kept for migration
    rice_reach: Optional[int] = None  # Deprecated - use PriorityScore
    rice_impact: Optional[float] = None  # Deprecated - use PriorityScore
    rice_confidence: Optional[float] = None  # Deprecated - use PriorityScore
    rice_effort: Optional[int] = None  # Deprecated - use PriorityScore
    rice_score: Optional[float] = None  # Deprecated - use PriorityScore
    target_release_date: Optional[datetime] = None
    value_score: Optional[float] = None  # Deprecated - use PriorityScore
    effort_score: Optional[float] = None  # Deprecated - use PriorityScore
    priority_framework: Optional[str] = None  # Deprecated - use PriorityScore
    release_id: Optional[str] = None
    sprint_id: Optional[str] = None
    capacity_estimate: Optional[float] = None
    diagram_xml: Optional[str] = None  # Draw.io XML diagram content


class Resource(BaseEntity):
    """Resource for delivery."""
    product_id: Optional[str] = None  # Optional - resources can be shared
    name: str
    type: str  # "person", "vendor", "tool" (renamed from "individual"/"organization")
    cost_rate: Optional[float] = None  # Cost per hour or per period
    cost_period: Optional[str] = None  # "hour", "month", "year"
    currency: str = "USD"
    availability: Optional[float] = None  # Percentage or hours per period
    skills: List[str] = []
    email: Optional[str] = None
    description: Optional[str] = None


class Workstream(BaseEntity):
    """Workstream model for organizing tasks by workstream."""
    product_id: str
    name: str
    description: Optional[str] = None
    order: int = 0  # For display ordering


class Phase(BaseEntity):
    """Phase model for execution phases."""
    name: str  # e.g., "Phase 1", "Phase 2"
    description: Optional[str] = None
    order: int = 0  # For display ordering


class Task(BaseEntity):
    """Execution unit."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    feature_id: Optional[str] = None  # Linked feature
    problem_id: Optional[str] = None  # Link to problem if task addresses a customer problem
    workstream_id: Optional[str] = None  # Link to workstream
    phase_id: Optional[str] = None  # Link to phase
    title: str
    description: Optional[str] = None
    status: str  # "todo", "in_progress", "blocked", "done"
    priority: str  # "low", "medium", "high", "critical"
    dependencies: List[str] = []  # Task IDs (renamed from depends_on_task_ids)
    assignee_ids: List[str] = []  # Resource IDs
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    blockers: Optional[List[str]] = None  # List of blocker descriptions
    # Legacy field
    depends_on_task_ids: List[str] = []  # Deprecated - use dependencies
    velocity: Optional[float] = None  # Deprecated - calculate from actual_hours
    cost_classification: Optional[str] = None  # "run" (Run/KTLO) or "change" (Change/Growth)
    diagram_xml: Optional[str] = None  # Draw.io XML diagram content
    comments: List[dict] = []  # List of comment objects with id, text, author, created_at, source, email_id, email_subject


class ProcessedEmail(BaseEntity):
    """Processed email from Gmail for AI analysis."""
    email_id: str  # Gmail message ID
    thread_id: str  # Gmail thread ID
    from_email: str
    subject: str
    received_date: datetime
    processed_at: Optional[datetime] = None
    status: str = "pending"  # "pending", "approved", "rejected", "created", "correlated", "sent"
    suggested_entity_type: str  # "feature", "task", "response", "correlate_task"
    suggested_data: dict = {}  # JSON with extracted data
    created_entity_id: Optional[str] = None  # ID of created feature/task if approved
    correlated_task_id: Optional[str] = None  # ID of existing task if correlated
    gmail_label_id: Optional[str] = None  # Gmail label ID if labeled
    email_body: Optional[str] = None  # Full email body text
    email_html: Optional[str] = None  # Full email body HTML


class Strategy(BaseEntity):
    """Strategy - defines intent and direction."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    type: str  # "vision", "goals", "themes", "assumptions", "risks"
    title: str
    description: Optional[str] = None
    # For goals
    objectives: Optional[List[str]] = None  # For OKRs/goals
    key_results: Optional[List[dict]] = None  # For OKRs: [{"description": "...", "target": "...", "current": "..."}]
    # For themes
    strategic_themes: Optional[List[str]] = None
    # For assumptions/risks
    assumptions: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    status: str = "draft"  # "draft", "active", "archived"
    target_date: Optional[datetime] = None


class Problem(BaseEntity):
    """Validated customer or business problem."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    title: str
    description: Optional[str] = None
    evidence: Optional[List[str]] = None  # Research, feedback, metrics
    severity: str  # "low", "medium", "high", "critical"
    affected_stakeholders: Optional[List[str]] = None
    insight_ids: List[str] = []  # Links to insights that contributed to this problem
    task_ids: List[str] = []  # Links to tasks that address this problem
    feature_id: Optional[str] = None  # Link to feature if addressed
    status: str = "identified"  # "identified", "validating", "prioritized", "addressed", "dismissed"
    priority: str = "medium"  # "low", "medium", "high", "critical"


class Interview(BaseEntity):
    """Interview model for customer interview tracking."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    interviewee_name: str
    interviewee_email: Optional[str] = None
    date: datetime
    notes: Optional[str] = None
    insight_ids: List[str] = []  # Links to insights from this interview


class PrioritizationModel(BaseEntity):
    """Prioritization framework definition."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    type: str  # "rice", "ice", "custom", "value-effort", "kano"
    criteria: List[str] = []  # e.g., ["reach", "impact", "confidence", "effort"]
    weights: Optional[dict] = None  # e.g., {"reach": 0.25, "impact": 0.5, ...}
    applies_to: str  # "problem", "feature", "capability", "all"
    version: int = 1
    is_active: bool = True


class PriorityScore(BaseEntity):
    """Versioned priority score for an entity."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    entity_type: str  # "problem", "feature", "capability"
    entity_id: str
    prioritization_model_id: str
    inputs: dict  # e.g., {"reach": 1000, "impact": 2, "confidence": 0.8, "effort": 2}
    score: float  # Calculated score
    confidence: Optional[float] = None  # Confidence in the score
    assumptions: Optional[List[str]] = None
    calculated_at: datetime
    version: int = 1


class Decision(BaseEntity):
    """Decision output from prioritization."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    entity_type: str  # "problem", "feature", "capability"
    entity_id: str
    outcome: str  # "now", "next", "later", "drop"
    rationale: Optional[str] = None
    priority_score_id: Optional[str] = None  # Link to score
    review_date: Optional[datetime] = None
    decision_maker: Optional[str] = None
    decision_date: datetime
    # Legacy fields for backward compatibility
    feature_id: Optional[str] = None  # Deprecated - use entity_id with entity_type
    decision_type: Optional[str] = None  # Deprecated - use outcome
    title: Optional[str] = None  # Deprecated
    description: Optional[str] = None  # Deprecated - use rationale
    alternatives: Optional[List[str]] = None  # Deprecated


class Roadmap(BaseEntity):
    """Roadmap view - not an execution object."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    type: str  # "now-next-later", "timeline", "quarters", "custom"
    description: Optional[str] = None
    timeboxes: Optional[List[dict]] = None  # e.g., [{"name": "Q1 2024", "start": "...", "end": "..."}]
    roadmap_items: List[dict] = []  # e.g., [{"type": "feature", "id": "...", "timebox": "Q1 2024"}]
    is_active: bool = True


class Release(BaseEntity):
    """Release model for release planning."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    status: str = "planned"  # "planned", "in_progress", "released", "cancelled"
    feature_ids: List[str] = []  # List of feature IDs in this release


class Stakeholder(BaseEntity):
    """Stakeholder in product decisions."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    name: str
    email: str
    company_name: Optional[str] = None
    role: Optional[str] = None
    influence_level: Optional[str] = None  # "low", "medium", "high", "critical"
    interests: Optional[List[str]] = None  # Areas of interest
    communication_preferences: Optional[str] = None  # JSON string or text
    update_frequency: Optional[str] = None  # "daily", "weekly", "monthly", "quarterly"


class StatusReport(BaseEntity):
    """Status report model for stakeholder communication."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    report_date: datetime
    summary: str
    highlights: Optional[List[str]] = []
    risks: Optional[List[str]] = []
    next_steps: Optional[List[str]] = []
    stakeholder_ids: List[str] = []  # List of stakeholder IDs who received this report


class FeatureReport(BaseEntity):
    """Feature report with selections and diagram."""
    product_id: str
    feature_id: str
    name: str  # User-given name for the report
    description: Optional[str] = None
    diagram_xml: Optional[str] = None  # Generated diagram XML
    include_diagram: bool = False
    created_by: Optional[str] = None  # User ID who created it


class Metric(BaseEntity):
    """Metric for measuring outcomes."""
    product_id: str
    module_id: Optional[str] = None  # Optional - can be module-specific or product-level
    scope: str  # "product", "capability", "feature", "module"
    scope_id: Optional[str] = None  # ID of capability/feature if scope is not product
    metric_type: str  # "outcome", "output", "health"
    name: str
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: str
    tracking_frequency: str = "weekly"
    description: Optional[str] = None
    # Legacy fields for backward compatibility
    okr_id: Optional[str] = None  # Deprecated - link via scope
    feature_id: Optional[str] = None  # Deprecated - use scope_id with scope="feature"
    type: Optional[str] = None  # Deprecated - use metric_type


class Outcome(BaseEntity):
    """Outcome model for tracking feature outcomes."""
    product_id: str
    feature_id: Optional[str] = None
    metric_id: Optional[str] = None
    description: str
    status: str = "pending"  # "pending", "achieved", "not_achieved"
    achieved_date: Optional[datetime] = None


class Notification(BaseEntity):
    """Notification for user alerts."""
    user_id: str  # Clerk user ID
    organization_id: Optional[str] = None  # Clerk org ID
    type: str  # "task_assigned", "deadline_approaching", "status_change", "metric_alert", "stakeholder_update"
    title: str
    message: str
    entity_type: Optional[str] = None  # "task", "feature", "problem", etc.
    entity_id: Optional[str] = None
    read: bool = False
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None
    priority: str = "normal"  # "low", "normal", "high", "urgent"


class Module(BaseEntity):
    """Module - a module within a product that contains capabilities."""
    product_id: str  # Required - modules belong to products
    name: str
    description: Optional[str] = None
    owner_id: Optional[str] = None  # User who created/owns this module (Clerk user ID)
    is_default: bool = False  # If True, this is the default module for the product
    status: str = "ideation"  # "ideation", "in_development", "production", "maintenance", "archived"
    # Configuration
    layout_config: Optional[dict] = None  # Custom layout preferences
    settings: Optional[dict] = None  # Additional module settings
    cost_classification: Optional[str] = None  # "run" (Run/KTLO) or "change" (Change/Growth)


class CloudProvider(str, Enum):
    """Cloud provider enum."""
    AWS = "aws"
    AZURE = "azure"
    GCP = "gcp"


class Vendor(BaseEntity):
    """Vendor entity - organization-scoped."""
    name: str
    organization_id: Optional[str] = None  # Clerk organization ID (for future multi-tenancy)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None


class CloudConfig(BaseEntity):
    """Cloud configuration for syncing costs from cloud providers."""
    organization_id: str  # Clerk organization ID
    provider: str  # CloudProvider value as string
    name: str  # User-friendly name (e.g., "Production AWS Account")
    is_active: bool = True
    # Encrypted credential fields (JSON string)
    credentials_encrypted: str
    # Metadata
    region: Optional[str] = None
    account_id: Optional[str] = None  # AWS Account ID, Azure Subscription ID, GCP Project ID
    last_synced_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None  # "success", "error", "pending"
    last_sync_error: Optional[str] = None


class EmailAccount(BaseEntity):
    """Email account configuration for Gmail OAuth2."""
    user_id: str  # Clerk user ID
    email: str  # Email address
    name: str  # Display name for the account
    is_active: bool = True
    is_default: bool = False
    # Encrypted OAuth2 credentials (JSON string)
    credentials_encrypted: str
    # Metadata
    last_authenticated_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None

