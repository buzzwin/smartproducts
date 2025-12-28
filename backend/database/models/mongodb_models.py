"""MongoDB document models."""
from datetime import datetime
from typing import Optional
from pydantic import Field
from .base_models import (
    BaseEntity,
    Product as BaseProduct,
    CostCategory as BaseCostCategory,
    CostScenario as BaseCostScenario,
    CostType as BaseCostType,
    CostItem as BaseCostItem,
    Cost as BaseCost,
    Insight as BaseInsight,
    Feature as BaseFeature,
    Resource as BaseResource,
    Capability as BaseCapability,
    Workstream as BaseWorkstream,
    Phase as BasePhase,
    Task as BaseTask,
    Strategy as BaseStrategy,
    Problem as BaseProblem,
    Interview as BaseInterview,
    Decision as BaseDecision,
    Release as BaseRelease,
    Roadmap as BaseRoadmap,
    Stakeholder as BaseStakeholder,
    StatusReport as BaseStatusReport,
    Metric as BaseMetric,
    Outcome as BaseOutcome,
    PrioritizationModel as BasePrioritizationModel,
    PriorityScore as BasePriorityScore,
    RevenueModel as BaseRevenueModel,
    PricingTier as BasePricingTier,
    UsageMetric as BaseUsageMetric,
    Notification as BaseNotification,
    Module as BaseModule,
)


class Product(BaseProduct):
    """MongoDB Product document."""
    pass


class CostCategory(BaseCostCategory):
    """MongoDB CostCategory document."""
    pass


class CostScenario(BaseCostScenario):
    """MongoDB CostScenario document."""
    pass


class CostType(BaseCostType):
    """MongoDB CostType document."""
    pass


class CostItem(BaseCostItem):
    """MongoDB CostItem document."""
    pass


class Insight(BaseInsight):
    """MongoDB Insight document."""
    pass


class Feature(BaseFeature):
    """MongoDB Feature document."""
    pass


class Resource(BaseResource):
    """MongoDB Resource document."""
    pass


class Capability(BaseCapability):
    """MongoDB Capability document."""
    pass


class Workstream(BaseWorkstream):
    """MongoDB Workstream document."""
    pass


class Phase(BasePhase):
    """MongoDB Phase document."""
    pass


class Task(BaseTask):
    """MongoDB Task document."""
    pass


class Strategy(BaseStrategy):
    """MongoDB Strategy document."""
    pass


class Problem(BaseProblem):
    """MongoDB Problem document."""
    pass


class Interview(BaseInterview):
    """MongoDB Interview document."""
    pass


class Decision(BaseDecision):
    """MongoDB Decision document."""
    pass


class Release(BaseRelease):
    """MongoDB Release document."""
    pass


class Stakeholder(BaseStakeholder):
    """MongoDB Stakeholder document."""
    pass


class StatusReport(BaseStatusReport):
    """MongoDB StatusReport document."""
    pass


class Metric(BaseMetric):
    """MongoDB Metric document."""
    pass


class Outcome(BaseOutcome):
    """MongoDB Outcome document."""
    pass


class Cost(BaseCost):
    """MongoDB Cost document."""
    pass


class PrioritizationModel(BasePrioritizationModel):
    """MongoDB PrioritizationModel document."""
    pass


class PriorityScore(BasePriorityScore):
    """MongoDB PriorityScore document."""
    pass


class Roadmap(BaseRoadmap):
    """MongoDB Roadmap document."""
    pass


class RevenueModel(BaseRevenueModel):
    """MongoDB RevenueModel document."""
    pass


class PricingTier(BasePricingTier):
    """MongoDB PricingTier document."""
    pass


class UsageMetric(BaseUsageMetric):
    """MongoDB UsageMetric document."""
    pass


class Notification(BaseNotification):
    """MongoDB Notification document."""
    pass


class Module(BaseModule):
    """MongoDB Module document."""
    pass

