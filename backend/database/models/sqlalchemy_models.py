"""SQLAlchemy ORM models for SQL databases."""
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON, Integer, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign
from sqlalchemy.sql import func

Base = declarative_base()


class Product(Base):
    """Product table."""
    __tablename__ = "products"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    tco = Column(Float, nullable=True)  # Computed, never manual
    tco_currency = Column(String, default="USD", nullable=False)
    tco_last_calculated = Column(DateTime, nullable=True)
    owner = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False, index=True)  # "active", "archived", "deprecated"
    cost_classification = Column(String, nullable=True, index=True)  # "run" (Run/KTLO) or "change" (Change/Growth)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    categories = relationship("CostCategory", back_populates="product", cascade="all, delete-orphan")
    cost_items = relationship("CostItem", back_populates="product", cascade="all, delete-orphan")
    costs = relationship("Cost", back_populates="product", cascade="all, delete-orphan")
    features = relationship("Feature", back_populates="product", cascade="all, delete-orphan")
    capabilities = relationship("Capability", back_populates="product", cascade="all, delete-orphan")
    workstreams = relationship("Workstream", back_populates="product", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="product", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="product", cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="product", cascade="all, delete-orphan")
    problems = relationship("Problem", back_populates="product", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="product", cascade="all, delete-orphan")
    releases = relationship("Release", back_populates="product", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="product", cascade="all, delete-orphan")
    stakeholders = relationship("Stakeholder", back_populates="product", cascade="all, delete-orphan")
    modules = relationship("Module", back_populates="product", cascade="all, delete-orphan")
    status_reports = relationship("StatusReport", back_populates="product", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="product", cascade="all, delete-orphan")
    outcomes = relationship("Outcome", back_populates="product", cascade="all, delete-orphan")
    prioritization_models = relationship("PrioritizationModel", back_populates="product", cascade="all, delete-orphan")
    priority_scores = relationship("PriorityScore", back_populates="product", cascade="all, delete-orphan")
    revenue_models = relationship("RevenueModel", back_populates="product", cascade="all, delete-orphan")
    pricing_tiers = relationship("PricingTier", back_populates="product", cascade="all, delete-orphan")
    usage_metrics = relationship("UsageMetric", back_populates="product", cascade="all, delete-orphan")
    resources = relationship("Resource", back_populates="product", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="product", cascade="all, delete-orphan")


class CostCategory(Base):
    """Cost category table."""
    __tablename__ = "cost_categories"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="categories")
    cost_items = relationship("CostItem", back_populates="category")


class CostScenario(Base):
    """Cost scenario table."""
    __tablename__ = "cost_scenarios"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    cost_items = relationship("CostItem", back_populates="scenario")


class CostType(Base):
    """Cost type table."""
    __tablename__ = "cost_types"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    cost_items = relationship("CostItem", back_populates="cost_type")


class CostItem(Base):
    """Cost item table."""
    __tablename__ = "cost_items"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("cost_categories.id"), nullable=True, index=True)
    scenario_id = Column(String, ForeignKey("cost_scenarios.id"), nullable=False, index=True)
    cost_type_id = Column(String, ForeignKey("cost_types.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="cost_items")
    category = relationship("CostCategory", back_populates="cost_items")
    scenario = relationship("CostScenario", back_populates="cost_items")
    cost_type = relationship("CostType", back_populates="cost_items")


class Insight(Base):
    """Insight table for customer feedback."""
    __tablename__ = "insights"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    source = Column(String, nullable=False, index=True)  # "research", "usage", "ops", "customer", "support", "sales"
    observation = Column(Text, nullable=False)  # What was observed
    implication = Column(Text, nullable=True)  # What it means
    problem_id = Column(String, nullable=True, index=True)  # Linked problem
    feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)
    votes = Column(Integer, nullable=False, default=0)
    sentiment = Column(String, nullable=True)
    status = Column(String, nullable=False, default="new", index=True)
    # Legacy fields for backward compatibility
    title = Column(String, nullable=True)  # Deprecated, use observation
    description = Column(Text, nullable=True)  # Deprecated
    user_email = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    problem_statement = Column(Text, nullable=True)
    customer_segment = Column(String, nullable=True)
    frequency = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="insights")
    feature = relationship("Feature", back_populates="insights")


class Feature(Base):
    """Feature table."""
    __tablename__ = "features"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    parent_feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)  # For hierarchical features
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    problem_ids = Column(JSON, nullable=False, default=list)  # Linked problems
    expected_outcomes = Column(JSON, nullable=True, default=list)
    status = Column(String, nullable=False, default="discovery", index=True)  # "discovery", "design", "development", "shipped", "archived"
    owner = Column(String, nullable=True)
    order = Column(Integer, nullable=False, default=0)  # For ordering features
    # Legacy RICE fields kept for migration
    rice_reach = Column(Integer, nullable=True)  # Deprecated - use PriorityScore
    rice_impact = Column(Float, nullable=True)  # Deprecated
    rice_confidence = Column(Float, nullable=True)  # Deprecated
    rice_effort = Column(Integer, nullable=True)  # Deprecated
    rice_score = Column(Float, nullable=True, index=True)  # Deprecated
    target_release_date = Column(DateTime, nullable=True)
    value_score = Column(Float, nullable=True)  # Deprecated
    effort_score = Column(Float, nullable=True)  # Deprecated
    priority_framework = Column(String, nullable=True)  # Deprecated
    release_id = Column(String, nullable=True, index=True)
    sprint_id = Column(String, nullable=True)
    capacity_estimate = Column(Float, nullable=True)
    cost_classification = Column(String, nullable=True, index=True)  # "run" (Run/KTLO) or "change" (Change/Growth)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="features")
    module = relationship("Module", back_populates="features")
    parent_feature = relationship("Feature", remote_side=[id], backref="child_features")
    tasks = relationship("Task", back_populates="feature", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="feature")
    problems = relationship("Problem", back_populates="feature")
    decisions = relationship("Decision", back_populates="feature", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="feature")
    outcomes = relationship("Outcome", back_populates="feature")
    # PriorityScore relationship uses polymorphic entity_type/entity_id, not direct FK
    # Note: This is a viewonly relationship since there's no direct FK
    # Access via: feature.priority_scores (filtered by entity_type='feature' and entity_id=feature.id)
    priority_scores = relationship(
        "PriorityScore",
        primaryjoin="and_(PriorityScore.entity_type == 'feature', PriorityScore.entity_id == foreign(Feature.id))",
        foreign_keys="[PriorityScore.entity_id]",
        viewonly=True
    )


class Resource(Base):
    """Resource table."""
    __tablename__ = "resources"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False, index=True)  # "person", "vendor", "tool"
    cost_rate = Column(Float, nullable=True)  # Cost per hour or per period
    cost_period = Column(String, nullable=True)  # "hour", "month", "year"
    currency = Column(String, default="USD", nullable=False)
    availability = Column(Float, nullable=True)  # Percentage or hours per period
    skills = Column(JSON, nullable=False, default=list)  # JSON array of skills
    email = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="resources")


class Workstream(Base):
    """Workstream table."""
    __tablename__ = "workstreams"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="workstreams")
    tasks = relationship("Task", back_populates="workstream", cascade="all, delete-orphan")


class Phase(Base):
    """Phase table."""
    __tablename__ = "phases"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    tasks = relationship("Task", back_populates="phase", cascade="all, delete-orphan")


class Task(Base):
    """Task table."""
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=True, index=True)  # Link to problem if task addresses a customer problem
    workstream_id = Column(String, ForeignKey("workstreams.id"), nullable=True, index=True)
    phase_id = Column(String, ForeignKey("phases.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    effort = Column(Float, nullable=True)  # In hours or story points
    status = Column(String, nullable=False, index=True)  # "todo", "in_progress", "blocked", "done"
    priority = Column(String, nullable=False, index=True)  # "low", "medium", "high", "critical"
    dependencies = Column(JSON, nullable=False, default=list)  # Task IDs
    assignee_ids = Column(JSON, nullable=False, default=list)  # Resource IDs
    due_date = Column(DateTime, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, nullable=True)
    blockers = Column(JSON, nullable=True)  # List of blocker descriptions
    # Legacy field
    depends_on_task_ids = Column(JSON, nullable=True, default=list)  # Deprecated - use dependencies
    velocity = Column(Float, nullable=True)  # Deprecated - calculate from actual_hours
    cost_classification = Column(String, nullable=True, index=True)  # "run" (Run/KTLO) or "change" (Change/Growth)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="tasks")
    module = relationship("Module", back_populates="tasks")
    feature = relationship("Feature", back_populates="tasks")
    workstream = relationship("Workstream", back_populates="tasks")
    phase = relationship("Phase", back_populates="tasks")


class Strategy(Base):
    """Strategy table."""
    __tablename__ = "strategies"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    type = Column(String, nullable=False, index=True)  # "vision", "goals", "themes", "assumptions", "risks"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # For goals
    objectives = Column(JSON, nullable=True)  # For OKRs/goals
    key_results = Column(JSON, nullable=True)  # For OKRs
    # For themes
    strategic_themes = Column(JSON, nullable=True)
    # For assumptions/risks
    assumptions = Column(JSON, nullable=True)
    risks = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="draft", index=True)  # "draft", "active", "archived"
    target_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="strategies")


class Problem(Base):
    """Problem table."""
    __tablename__ = "problems"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=True)  # Research, feedback, metrics
    severity = Column(String, nullable=False, index=True)  # "low", "medium", "high", "critical"
    affected_stakeholders = Column(JSON, nullable=True)
    insight_ids = Column(JSON, nullable=False, default=list)  # JSON array of insight IDs
    task_ids = Column(JSON, nullable=False, default=list)  # JSON array of task IDs that address this problem
    feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)
    status = Column(String, nullable=False, default="identified", index=True)  # "identified", "validating", "prioritized", "addressed", "dismissed"
    priority = Column(String, nullable=False, default="medium", index=True)  # "low", "medium", "high", "critical"
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="problems")
    feature = relationship("Feature", back_populates="problems")


class Interview(Base):
    """Interview table."""
    __tablename__ = "interviews"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    interviewee_name = Column(String, nullable=False)
    interviewee_email = Column(String, nullable=True)
    date = Column(DateTime, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    insight_ids = Column(JSON, nullable=False, default=list)  # JSON array of insight IDs
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="interviews")


class Decision(Base):
    """Decision table."""
    __tablename__ = "decisions"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    entity_type = Column(String, nullable=False, index=True)  # "problem", "feature", "capability"
    entity_id = Column(String, nullable=False, index=True)
    outcome = Column(String, nullable=False, index=True)  # "now", "next", "later", "drop"
    rationale = Column(Text, nullable=True)
    priority_score_id = Column(String, ForeignKey("priority_scores.id"), nullable=True, index=True)  # Link to score
    review_date = Column(DateTime, nullable=True)
    decision_maker = Column(String, nullable=True)
    decision_date = Column(DateTime, nullable=False, default=func.now())
    # Legacy fields for backward compatibility
    feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)  # Deprecated
    decision_type = Column(String, nullable=True, index=True)  # Deprecated - use outcome
    title = Column(String, nullable=True)  # Deprecated
    description = Column(Text, nullable=True)  # Deprecated - use rationale
    alternatives = Column(JSON, nullable=True)  # Deprecated
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="decisions")
    feature = relationship("Feature", back_populates="decisions")
    priority_score = relationship("PriorityScore", foreign_keys=[priority_score_id])


class Release(Base):
    """Release table."""
    __tablename__ = "releases"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(DateTime, nullable=True, index=True)
    status = Column(String, nullable=False, default="planned", index=True)  # "planned", "in_progress", "released", "cancelled"
    feature_ids = Column(JSON, nullable=False, default=list)  # JSON array of feature IDs
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="releases")


class Stakeholder(Base):
    """Stakeholder table."""
    __tablename__ = "stakeholders"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)
    influence_level = Column(String, nullable=False, index=True)  # "low", "medium", "high", "critical"
    interests = Column(JSON, nullable=True)  # Areas of interest
    communication_preferences = Column(Text, nullable=True)
    update_frequency = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="stakeholders")


class StatusReport(Base):
    """Status report table."""
    __tablename__ = "status_reports"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    report_date = Column(DateTime, nullable=False, index=True)
    summary = Column(Text, nullable=False)
    highlights = Column(JSON, nullable=True, default=list)  # JSON array
    risks = Column(JSON, nullable=True, default=list)  # JSON array
    next_steps = Column(JSON, nullable=True, default=list)  # JSON array
    stakeholder_ids = Column(JSON, nullable=False, default=list)  # JSON array of stakeholder IDs
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="status_reports")


class Metric(Base):
    """Metric table."""
    __tablename__ = "metrics"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    scope = Column(String, nullable=False, index=True)  # "product", "capability", "feature", "module"
    scope_id = Column(String, nullable=True, index=True)  # ID of capability/feature if scope is not product
    metric_type = Column(String, nullable=False, index=True)  # "outcome", "output", "health"
    name = Column(String, nullable=False)
    target_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    unit = Column(String, nullable=False)
    tracking_frequency = Column(String, default="weekly", nullable=False)
    description = Column(Text, nullable=True)
    # Legacy fields for backward compatibility
    okr_id = Column(String, nullable=True, index=True)  # Deprecated - link via scope
    feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)  # Deprecated - use scope_id
    type = Column(String, nullable=True, index=True)  # Deprecated - use metric_type
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="metrics")
    feature = relationship("Feature", back_populates="metrics")
    outcomes = relationship("Outcome", back_populates="metric", cascade="all, delete-orphan")


class Outcome(Base):
    """Outcome table."""
    __tablename__ = "outcomes"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    feature_id = Column(String, ForeignKey("features.id"), nullable=True, index=True)
    metric_id = Column(String, ForeignKey("metrics.id"), nullable=True, index=True)
    description = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending", index=True)  # "pending", "achieved", "not_achieved"
    achieved_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="outcomes")
    feature = relationship("Feature", back_populates="outcomes")
    metric = relationship("Metric", back_populates="outcomes")


class PrioritizationModel(Base):
    """Prioritization model table."""
    __tablename__ = "prioritization_models"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, index=True)  # "rice", "ice", "custom", "value-effort", "kano"
    criteria = Column(JSON, nullable=False, default=list)
    weights = Column(JSON, nullable=True)
    applies_to = Column(String, nullable=False, index=True)  # "problem", "feature", "capability", "all"
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Integer, nullable=False, default=1)  # SQLite doesn't have boolean, use 0/1
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="prioritization_models")
    priority_scores = relationship("PriorityScore", back_populates="prioritization_model", cascade="all, delete-orphan")


class PriorityScore(Base):
    """Priority score table."""
    __tablename__ = "priority_scores"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    entity_type = Column(String, nullable=False, index=True)  # "problem", "feature", "capability"
    entity_id = Column(String, nullable=False, index=True)
    prioritization_model_id = Column(String, ForeignKey("prioritization_models.id"), nullable=False, index=True)
    inputs = Column(JSON, nullable=False)  # e.g., {"reach": 1000, "impact": 2, ...}
    score = Column(Float, nullable=False, index=True)
    confidence = Column(Float, nullable=True)
    assumptions = Column(JSON, nullable=True)
    calculated_at = Column(DateTime, nullable=False, default=func.now())
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="priority_scores")
    prioritization_model = relationship("PrioritizationModel", back_populates="priority_scores")
    # Note: feature relationship is handled via entity_id lookup, not direct FK


class Roadmap(Base):
    """Roadmap table."""
    __tablename__ = "roadmaps"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - can be module-specific or product-level
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, index=True)  # "now-next-later", "timeline", "quarters", "custom"
    description = Column(Text, nullable=True)
    timeboxes = Column(JSON, nullable=True)
    roadmap_items = Column(JSON, nullable=False, default=list)
    is_active = Column(Integer, nullable=False, default=1)  # SQLite boolean
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="roadmaps")


class Cost(Base):
    """Cost table."""
    __tablename__ = "costs"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=True, index=True)  # Optional - for module-level costs
    scope = Column(String, nullable=False, index=True)  # "task", "capability", "module", "product", "shared"
    scope_id = Column(String, nullable=True, index=True)  # ID of task/capability/module if scope is task/capability/module
    category = Column(String, nullable=False, index=True)  # "build", "run", "maintain", "scale", "overhead"
    cost_type = Column(String, nullable=False, index=True)  # "labor", "infra", "license", "vendor", "other"
    cost_type_id = Column(String, ForeignKey("cost_types.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    recurrence = Column(String, nullable=False, index=True)  # "one-time", "monthly", "quarterly", "annual"
    amortization_period = Column(Integer, nullable=True)  # Months to amortize
    time_period_start = Column(DateTime, nullable=True)
    time_period_end = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    resource_id = Column(String, ForeignKey("resources.id"), nullable=True, index=True)
    cost_classification = Column(String, nullable=True, index=True)  # "run" (Run/KTLO) or "change" (Change/Growth)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="costs")
    cost_type_ref = relationship("CostType", foreign_keys=[cost_type_id])
    resource = relationship("Resource", foreign_keys=[resource_id])


class RevenueModel(Base):
    """Revenue model table."""
    __tablename__ = "revenue_models"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    model_type = Column(String, nullable=False, index=True)  # "per_customer", "per_job", "tiered", etc.
    description = Column(Text, nullable=True)
    base_revenue = Column(Float, nullable=True)
    currency = Column(String, default="USD", nullable=False)
    assumptions = Column(JSON, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)  # SQLite boolean
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="revenue_models")
    pricing_tiers = relationship("PricingTier", back_populates="revenue_model", cascade="all, delete-orphan")


class PricingTier(Base):
    """Pricing tier table."""
    __tablename__ = "pricing_tiers"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    revenue_model_id = Column(String, ForeignKey("revenue_models.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    billing_period = Column(String, nullable=True)  # "monthly", "annual", "one_time"
    features = Column(JSON, nullable=False, default=list)  # Feature names included
    limits = Column(JSON, nullable=True)  # Usage limits
    overage_rules = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="pricing_tiers")
    revenue_model = relationship("RevenueModel", back_populates="pricing_tiers")


class UsageMetric(Base):
    """Usage metric table."""
    __tablename__ = "usage_metrics"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    metric_type = Column(String, nullable=False, index=True)  # "jobs", "customers", "api_calls", etc.
    name = Column(String, nullable=False)
    unit = Column(String, nullable=False)  # "count", "GB", "hours", "users"
    volume = Column(Float, nullable=True)  # Current volume
    target_volume = Column(Float, nullable=True)
    time_period = Column(String, nullable=False, index=True)  # "daily", "weekly", "monthly", "quarterly"
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="usage_metrics")


class Notification(Base):
    """Notification table."""
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Clerk user ID
    organization_id = Column(String, nullable=True, index=True)  # Clerk org ID
    type = Column(String, nullable=False, index=True)  # "task_assigned", "deadline_approaching", etc.
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    entity_type = Column(String, nullable=True, index=True)  # "task", "feature", "problem", etc.
    entity_id = Column(String, nullable=True, index=True)
    read = Column(Integer, nullable=False, default=0)  # SQLite boolean
    read_at = Column(DateTime, nullable=True)
    action_url = Column(String, nullable=True)
    priority = Column(String, nullable=False, default="normal", index=True)  # "low", "normal", "high", "urgent"
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class Module(Base):
    """Module table."""
    __tablename__ = "modules"
    
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)  # Required - modules belong to products
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(String, nullable=True, index=True)  # Clerk user ID
    is_default = Column(Integer, nullable=False, default=0)  # SQLite boolean
    status = Column(String, nullable=False, default="ideation", index=True)  # "ideation", "in_development", "production", "maintenance", "archived"
    enabled_steps = Column(JSON, nullable=False, default=list)  # List of workflow steps
    step_order = Column(JSON, nullable=False, default=list)  # Custom order of steps
    layout_config = Column(JSON, nullable=True)  # Custom layout preferences
    settings = Column(JSON, nullable=True)  # Additional module settings
    cost_classification = Column(String, nullable=True, index=True)  # "run" (Run/KTLO) or "change" (Change/Growth)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="modules")
    tasks = relationship("Task", back_populates="module", cascade="all, delete-orphan")
    features = relationship("Feature", back_populates="module", cascade="all, delete-orphan")

