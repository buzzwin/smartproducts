"""SQLAlchemy repository implementation."""
import uuid
from datetime import datetime
from typing import Generic, TypeVar, Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, update, delete, func as sql_func
from sqlalchemy.orm import selectinload

from ..config import db_config
from ..models.sqlalchemy_models import (
    Base,
    Product as SQLProduct,
    CostCategory as SQLCostCategory,
    CostScenario as SQLCostScenario,
    CostType as SQLCostType,
    CostItem as SQLCostItem,
    Cost as SQLCost,
    Insight as SQLInsight,
    Feature as SQLFeature,
    Resource as SQLResource,
    Vendor as SQLVendor,
    Workstream as SQLWorkstream,
    Phase as SQLPhase,
    Task as SQLTask,
    Strategy as SQLStrategy,
    Problem as SQLProblem,
    Interview as SQLInterview,
    Decision as SQLDecision,
    Release as SQLRelease,
    Roadmap as SQLRoadmap,
    Stakeholder as SQLStakeholder,
    StatusReport as SQLStatusReport,
    FeatureReport as SQLFeatureReport,
    Metric as SQLMetric,
    Outcome as SQLOutcome,
    PrioritizationModel as SQLPrioritizationModel,
    PriorityScore as SQLPriorityScore,
    RevenueModel as SQLRevenueModel,
    PricingTier as SQLPricingTier,
    UsageMetric as SQLUsageMetric,
    Notification as SQLNotification,
    Module as SQLModule,
    CloudConfig as SQLCloudConfig,
    ProcessedEmail as SQLProcessedEmail,
    EmailAccount as SQLEmailAccount,
)
from ..models.base_models import (
    Product,
    CostCategory,
    CostScenario,
    CostType,
    CostItem,
    Cost,
    Insight,
    Feature,
    Resource,
    Vendor,
    Workstream,
    Phase,
    Task,
    Strategy,
    Problem,
    Interview,
    Decision,
    Release,
    Roadmap,
    Stakeholder,
    StatusReport,
    FeatureReport,
    Metric,
    Outcome,
    PrioritizationModel,
    PriorityScore,
    RevenueModel,
    PricingTier,
    UsageMetric,
    Notification,
    Module,
    CloudConfig,
    ProcessedEmail,
    EmailAccount,
)
from .base_repository import BaseRepository
from .module_repository import ModuleRepository
from .cloud_config_repository import CloudConfigRepository
from .email_account_repository import EmailAccountRepository
from .vendor_repository import VendorRepository

T = TypeVar('T')


class SQLAlchemyRepository(BaseRepository[T], Generic[T]):
    """Base SQLAlchemy repository implementation."""
    
    def __init__(self, session: AsyncSession, model_class, domain_class):
        """Initialize repository with session and model mappings."""
        self.session = session
        self.model_class = model_class
        self.domain_class = domain_class
    
    def _to_domain(self, db_model) -> T:
        """Convert SQLAlchemy model to domain model."""
        if db_model is None:
            return None
        data = {col.name: getattr(db_model, col.name) for col in db_model.__table__.columns}
        return self.domain_class(**data)
    
    def _to_db(self, domain_model: T):
        """Convert domain model to SQLAlchemy model."""
        data = domain_model.model_dump(exclude={"id"} if domain_model.id is None else {})
        if domain_model.id is None:
            data["id"] = str(uuid.uuid4())
        return self.model_class(**data)
    
    async def create(self, entity: T) -> T:
        """Create a new entity."""
        db_model = self._to_db(entity)
        db_model.created_at = datetime.utcnow()
        db_model.updated_at = datetime.utcnow()
        self.session.add(db_model)
        await self.session.commit()
        await self.session.refresh(db_model)
        return self._to_domain(db_model)
    
    async def get_by_id(self, entity_id: str) -> Optional[T]:
        """Get an entity by ID."""
        result = await self.session.execute(
            select(self.model_class).where(self.model_class.id == entity_id)
        )
        db_model = result.scalar_one_or_none()
        return self._to_domain(db_model) if db_model else None
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination."""
        result = await self.session.execute(
            select(self.model_class).offset(skip).limit(limit)
        )
        db_models = result.scalars().all()
        return [self._to_domain(model) for model in db_models]
    
    async def update(self, entity_id: str, entity: T) -> Optional[T]:
        """Update an existing entity."""
        data = entity.model_dump(exclude={"id", "created_at"})
        data["updated_at"] = datetime.utcnow()
        
        await self.session.execute(
            update(self.model_class)
            .where(self.model_class.id == entity_id)
            .values(**data)
        )
        await self.session.commit()
        return await self.get_by_id(entity_id)
    
    async def delete(self, entity_id: str) -> bool:
        """Delete an entity by ID."""
        result = await self.session.execute(
            delete(self.model_class).where(self.model_class.id == entity_id)
        )
        await self.session.commit()
        return result.rowcount > 0
    
    async def find_by(self, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[T]:
        """Find entities by filters."""
        query = select(self.model_class)
        for key, value in filters.items():
            if hasattr(self.model_class, key):
                query = query.where(getattr(self.model_class, key) == value)
        
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        db_models = result.scalars().all()
        return [self._to_domain(model) for model in db_models]
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count entities matching filters."""
        from sqlalchemy import func
        query = select(func.count()).select_from(self.model_class)
        if filters:
            for key, value in filters.items():
                if hasattr(self.model_class, key):
                    query = query.where(getattr(self.model_class, key) == value)
        result = await self.session.execute(query)
        return result.scalar() or 0


class SQLProductRepository(SQLAlchemyRepository[Product]):
    """SQLAlchemy product repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLProduct, Product)
    
    async def get_by_name(self, name: str) -> Optional[Product]:
        """Get a product by name."""
        result = await self.session.execute(
            select(SQLProduct).where(SQLProduct.name == name)
        )
        db_model = result.scalar_one_or_none()
        return self._to_domain(db_model) if db_model else None


class SQLCostRepository(SQLAlchemyRepository[CostItem]):
    """SQLAlchemy cost repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLCostItem, CostItem)
    
    async def get_by_product(self, product_id: str, scenario_id: Optional[str] = None) -> List[CostItem]:
        """Get all cost items for a product."""
        query = select(SQLCostItem).where(SQLCostItem.product_id == product_id)
        if scenario_id:
            query = query.where(SQLCostItem.scenario_id == scenario_id)
        result = await self.session.execute(query)
        db_models = result.scalars().all()
        return [self._to_domain(model) for model in db_models]
    
    async def get_by_scenario(self, scenario_id: str) -> List[CostItem]:
        """Get all cost items for a scenario."""
        return await self.find_by({"scenario_id": scenario_id})
    
    async def get_totals_by_product(self, scenario_id: Optional[str] = None) -> Dict[str, float]:
        """Get total costs grouped by product ID."""
        from sqlalchemy import func
        query = select(
            SQLCostItem.product_id,
            func.sum(SQLCostItem.amount).label("total")
        ).group_by(SQLCostItem.product_id)
        
        if scenario_id:
            query = query.where(SQLCostItem.scenario_id == scenario_id)
        
        result = await self.session.execute(query)
        return {row.product_id: float(row.total) for row in result}
    
    async def get_totals_by_scenario(self, product_id: Optional[str] = None) -> Dict[str, float]:
        """Get total costs grouped by scenario ID."""
        from sqlalchemy import func
        query = select(
            SQLCostItem.scenario_id,
            func.sum(SQLCostItem.amount).label("total")
        ).group_by(SQLCostItem.scenario_id)
        
        if product_id:
            query = query.where(SQLCostItem.product_id == product_id)
        
        result = await self.session.execute(query)
        return {row.scenario_id: float(row.total) for row in result}


class SQLCostCategoryRepository(SQLAlchemyRepository[CostCategory]):
    """SQLAlchemy cost category repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLCostCategory, CostCategory)


class SQLCostScenarioRepository(SQLAlchemyRepository[CostScenario]):
    """SQLAlchemy cost scenario repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLCostScenario, CostScenario)


class SQLCostTypeRepository(SQLAlchemyRepository[CostType]):
    """SQLAlchemy cost type repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLCostType, CostType)


class SQLFeatureRepository(SQLAlchemyRepository[Feature]):
    """SQLAlchemy feature repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLFeature, Feature)
    
    async def get_by_product(self, product_id: str) -> List[Feature]:
        """Get all features for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_module(self, module_id: str) -> List[Feature]:
        """Get all features for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Feature]:
        """Get features for a product, optionally filtered by module. If module_id is None, returns all product-level features."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})
    
    async def get_by_parent(self, parent_feature_id: str) -> List[Feature]:
        """Get all child features of a parent feature."""
        return await self.find_by({"parent_feature_id": parent_feature_id})
    
    async def get_by_owner(self, owner: str) -> List[Feature]:
        """Get all features owned by a specific owner."""
        return await self.find_by({"owner": owner})


class SQLResourceRepository(SQLAlchemyRepository[Resource]):
    """SQLAlchemy resource repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLResource, Resource)
    
    async def get_by_type(self, resource_type: str) -> List[Resource]:
        """Get all resources of a specific type."""
        return await self.find_by({"type": resource_type})
    
    async def get_by_skill(self, skill: str) -> List[Resource]:
        """Get all resources with a specific skill."""
        # Get all resources and filter in Python for JSON array compatibility
        all_resources = await self.get_all()
        return [r for r in all_resources if r.skills and skill in r.skills]


class SQLVendorRepository(SQLAlchemyRepository[Vendor], VendorRepository):
    """SQLAlchemy vendor repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLVendor, Vendor)
    
    async def get_by_organization(self, organization_id: str) -> List[Vendor]:
        """Get all vendors for an organization."""
        return await self.find_by({"organization_id": organization_id})


class SQLInsightRepository(SQLAlchemyRepository[Insight]):
    """SQLAlchemy insight repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLInsight, Insight)
    
    async def get_by_product(self, product_id: str) -> List[Insight]:
        """Get all insights for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_feature(self, feature_id: str) -> List[Insight]:
        """Get all insights linked to a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_problem(self, problem_id: str) -> List[Insight]:
        """Get all insights linked to a problem."""
        return await self.find_by({"problem_id": problem_id})
    
    async def get_by_status(self, status: str) -> List[Insight]:
        """Get all insights with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_source(self, source: str) -> List[Insight]:
        """Get all insights from a specific source."""
        return await self.find_by({"source": source})
    
    async def get_by_module(self, module_id: str) -> List[Insight]:
        """Get all insights for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Insight]:
        """Get insights for a product, optionally filtered by module. If module_id is None, returns all product-level insights."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLWorkstreamRepository(SQLAlchemyRepository[Workstream]):
    """SQLAlchemy workstream repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLWorkstream, Workstream)
    
    async def get_by_product(self, product_id: str) -> List[Workstream]:
        """Get all workstreams for a product."""
        workstreams = await self.find_by({"product_id": product_id})
        return sorted(workstreams, key=lambda w: w.order)


class SQLPhaseRepository(SQLAlchemyRepository[Phase]):
    """SQLAlchemy phase repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLPhase, Phase)
    
    async def get_all_ordered(self) -> List[Phase]:
        """Get all phases ordered by order field."""
        all_phases = await self.get_all()
        return sorted(all_phases, key=lambda p: p.order)


class SQLTaskRepository(SQLAlchemyRepository[Task]):
    """SQLAlchemy task repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLTask, Task)
    
    def _to_domain(self, db_model) -> Task:
        """Convert SQLAlchemy model to domain model, handling None values for list fields."""
        if db_model is None:
            return None
        data = {col.name: getattr(db_model, col.name) for col in db_model.__table__.columns}
        # Convert None values to empty lists for list fields
        if data.get('dependencies') is None:
            data['dependencies'] = []
        if data.get('assignee_ids') is None:
            data['assignee_ids'] = []
        if data.get('blockers') is None:
            data['blockers'] = None  # blockers is Optional[List[str]], so None is valid
        if data.get('depends_on_task_ids') is None:
            data['depends_on_task_ids'] = []
        return self.domain_class(**data)
    
    async def get_by_product(self, product_id: str) -> List[Task]:
        """Get all tasks for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_module(self, module_id: str) -> List[Task]:
        """Get all tasks for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Task]:
        """Get tasks for a product, optionally filtered by module. If module_id is None, returns all product-level tasks."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})
    
    async def get_by_feature(self, feature_id: str) -> List[Task]:
        """Get all tasks for a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_workstream(self, workstream_id: str) -> List[Task]:
        """Get all tasks for a workstream."""
        return await self.find_by({"workstream_id": workstream_id})
    
    async def get_by_phase(self, phase_id: str) -> List[Task]:
        """Get all tasks for a phase."""
        return await self.find_by({"phase_id": phase_id})
    
    async def get_dependent_tasks(self, task_id: str) -> List[Task]:
        """Get all tasks that depend on the given task."""
        # Get all tasks and filter in Python for JSON array compatibility
        # Check both dependencies (new) and depends_on_task_ids (legacy) for backward compatibility
        all_tasks = await self.get_all()
        return [
            t for t in all_tasks 
            if (t.dependencies and task_id in t.dependencies) or 
               (t.depends_on_task_ids and task_id in t.depends_on_task_ids)
        ]
    
    async def get_by_assignee(self, resource_id: str) -> List[Task]:
        """Get all tasks assigned to a resource."""
        # Get all tasks and filter in Python for JSON array compatibility
        all_tasks = await self.get_all()
        return [t for t in all_tasks if t.assignee_ids and resource_id in t.assignee_ids]


class SQLStrategyRepository(SQLAlchemyRepository[Strategy]):
    """SQLAlchemy strategy repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLStrategy, Strategy)
    
    async def get_by_product(self, product_id: str) -> List[Strategy]:
        """Get all strategies for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_type(self, strategy_type: str) -> List[Strategy]:
        """Get all strategies of a specific type."""
        return await self.find_by({"type": strategy_type})
    
    async def get_by_product_and_type(self, product_id: str, strategy_type: str) -> List[Strategy]:
        """Get strategies for a product filtered by type."""
        return await self.find_by({"product_id": product_id, "type": strategy_type})
    
    async def get_by_status(self, status: str) -> List[Strategy]:
        """Get all strategies with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_module(self, module_id: str) -> List[Strategy]:
        """Get all strategies for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Strategy]:
        """Get strategies for a product, optionally filtered by module. If module_id is None, returns all product-level strategies."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLDecisionRepository(SQLAlchemyRepository[Decision]):
    """SQLAlchemy decision repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLDecision, Decision)
    
    async def get_by_product(self, product_id: str) -> List[Decision]:
        """Get all decisions for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_entity(self, entity_type: str, entity_id: str) -> List[Decision]:
        """Get all decisions for a specific entity."""
        return await self.find_by({"entity_type": entity_type, "entity_id": entity_id})
    
    async def get_by_decision_maker(self, decision_maker: str) -> List[Decision]:
        """Get all decisions made by a specific person."""
        return await self.find_by({"decision_maker": decision_maker})
    
    async def get_by_module(self, module_id: str) -> List[Decision]:
        """Get all decisions for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Decision]:
        """Get decisions for a product, optionally filtered by module. If module_id is None, returns all product-level decisions."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLReleaseRepository(SQLAlchemyRepository[Release]):
    """SQLAlchemy release repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLRelease, Release)
    
    async def get_by_product(self, product_id: str) -> List[Release]:
        """Get all releases for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_status(self, status: str) -> List[Release]:
        """Get all releases with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_module(self, module_id: str) -> List[Release]:
        """Get all releases for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Release]:
        """Get releases for a product, optionally filtered by module. If module_id is None, returns all product-level releases."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLStakeholderRepository(SQLAlchemyRepository[Stakeholder]):
    """SQLAlchemy stakeholder repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLStakeholder, Stakeholder)
    
    async def get_by_product(self, product_id: str) -> List[Stakeholder]:
        """Get all stakeholders for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_email(self, email: str) -> Optional[Stakeholder]:
        """Get stakeholder by email."""
        results = await self.find_by({"email": email})
        return results[0] if results else None
    
    async def get_by_module(self, module_id: str) -> List[Stakeholder]:
        """Get all stakeholders for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Stakeholder]:
        """Get stakeholders for a product, optionally filtered by module. If module_id is None, returns all product-level stakeholders."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLStatusReportRepository(SQLAlchemyRepository[StatusReport]):
    """SQLAlchemy status report repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLStatusReport, StatusReport)
    
    async def get_by_product(self, product_id: str) -> List[StatusReport]:
        """Get all status reports for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_module(self, module_id: str) -> List[StatusReport]:
        """Get all status reports for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[StatusReport]:
        """Get status reports for a product, optionally filtered by module. If module_id is None, returns all product-level status reports."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLFeatureReportRepository(SQLAlchemyRepository[FeatureReport]):
    """SQLAlchemy feature report repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLFeatureReport, FeatureReport)
    
    async def get_by_product(self, product_id: str) -> List[FeatureReport]:
        """Get all feature reports for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_feature(self, feature_id: str) -> List[FeatureReport]:
        """Get all feature reports for a feature."""
        return await self.find_by({"feature_id": feature_id})


class SQLMetricRepository(SQLAlchemyRepository[Metric]):
    """SQLAlchemy metric repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLMetric, Metric)
    
    async def get_by_product(self, product_id: str) -> List[Metric]:
        """Get all metrics for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_scope(self, product_id: str, scope: str) -> List[Metric]:
        """Get all metrics for a specific scope (product, capability, feature)."""
        return await self.find_by({"product_id": product_id, "scope": scope})
    
    async def get_by_scope_id(self, product_id: str, scope: str, scope_id: str) -> List[Metric]:
        """Get all metrics for a specific scope entity."""
        return await self.find_by({
            "product_id": product_id,
            "scope": scope,
            "scope_id": scope_id
        })
    
    async def get_by_metric_type(self, product_id: str, metric_type: str) -> List[Metric]:
        """Get all metrics of a specific metric type (outcome, output, health)."""
        return await self.find_by({"product_id": product_id, "metric_type": metric_type})
    
    async def get_by_module(self, module_id: str) -> List[Metric]:
        """Get all metrics for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Metric]:
        """Get metrics for a product, optionally filtered by module. If module_id is None, returns all product-level metrics."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLOutcomeRepository(SQLAlchemyRepository[Outcome]):
    """SQLAlchemy outcome repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLOutcome, Outcome)
    
    async def get_by_product(self, product_id: str) -> List[Outcome]:
        """Get all outcomes for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_feature(self, feature_id: str) -> List[Outcome]:
        """Get all outcomes linked to a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_metric(self, metric_id: str) -> List[Outcome]:
        """Get all outcomes linked to a metric."""
        return await self.find_by({"metric_id": metric_id})
    
    async def get_by_status(self, status: str) -> List[Outcome]:
        """Get all outcomes with a specific status."""
        return await self.find_by({"status": status})


class SQLProblemRepository(SQLAlchemyRepository[Problem]):
    """SQLAlchemy problem repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLProblem, Problem)
    
    async def get_by_product(self, product_id: str) -> List[Problem]:
        """Get all problems for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_status(self, status: str) -> List[Problem]:
        """Get all problems with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_priority(self, priority: str) -> List[Problem]:
        """Get all problems with a specific priority."""
        return await self.find_by({"priority": priority})
    
    async def get_by_feature(self, feature_id: str) -> List[Problem]:
        """Get all problems linked to a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_module(self, module_id: str) -> List[Problem]:
        """Get all problems for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Problem]:
        """Get problems for a product, optionally filtered by module. If module_id is None, returns all product-level problems."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLInterviewRepository(SQLAlchemyRepository[Interview]):
    """SQLAlchemy interview repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLInterview, Interview)
    
    async def get_by_product(self, product_id: str) -> List[Interview]:
        """Get all interviews for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_module(self, module_id: str) -> List[Interview]:
        """Get all interviews for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Interview]:
        """Get interviews for a product, optionally filtered by module. If module_id is None, returns all product-level interviews."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLPrioritizationModelRepository(SQLAlchemyRepository[PrioritizationModel]):
    """SQLAlchemy prioritization model repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLPrioritizationModel, PrioritizationModel)
    
    async def get_by_product(self, product_id: str) -> List[PrioritizationModel]:
        """Get all prioritization models for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_type(self, product_id: str, model_type: str) -> List[PrioritizationModel]:
        """Get prioritization models by type for a product."""
        return await self.find_by({"product_id": product_id, "type": model_type})
    
    async def get_active(self, product_id: str) -> List[PrioritizationModel]:
        """Get active prioritization models for a product."""
        return await self.find_by({"product_id": product_id, "is_active": 1})
    
    async def get_by_module(self, module_id: str) -> List[PrioritizationModel]:
        """Get all prioritization models for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[PrioritizationModel]:
        """Get prioritization models for a product, optionally filtered by module. If module_id is None, returns all product-level models."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLPriorityScoreRepository(SQLAlchemyRepository[PriorityScore]):
    """SQLAlchemy priority score repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLPriorityScore, PriorityScore)
    
    async def get_by_product(self, product_id: str) -> List[PriorityScore]:
        """Get all priority scores for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_entity(self, product_id: str, entity_type: str, entity_id: str) -> List[PriorityScore]:
        """Get priority scores for a specific entity."""
        return await self.find_by({
            "product_id": product_id,
            "entity_type": entity_type,
            "entity_id": entity_id
        })
    
    async def get_by_model(self, prioritization_model_id: str) -> List[PriorityScore]:
        """Get all priority scores for a prioritization model."""
        return await self.find_by({"prioritization_model_id": prioritization_model_id})
    
    async def get_latest_by_entity(self, product_id: str, entity_type: str, entity_id: str) -> Optional[PriorityScore]:
        """Get the latest priority score for an entity."""
        scores = await self.get_by_entity(product_id, entity_type, entity_id)
        if not scores:
            return None
        # Sort by version descending and return the latest
        return max(scores, key=lambda s: (s.version, s.calculated_at or (s.created_at or datetime.min)))
    
    async def get_by_module(self, module_id: str) -> List[PriorityScore]:
        """Get all priority scores for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[PriorityScore]:
        """Get priority scores for a product, optionally filtered by module. If module_id is None, returns all product-level scores."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLRoadmapRepository(SQLAlchemyRepository[Roadmap]):
    """SQLAlchemy roadmap repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLRoadmap, Roadmap)
    
    async def get_by_product(self, product_id: str) -> List[Roadmap]:
        """Get all roadmaps for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_active(self, product_id: str) -> List[Roadmap]:
        """Get active roadmaps for a product."""
        return await self.find_by({"product_id": product_id, "is_active": 1})
    
    async def get_by_type(self, product_id: str, roadmap_type: str) -> List[Roadmap]:
        """Get roadmaps by type for a product."""
        return await self.find_by({"product_id": product_id, "type": roadmap_type})
    
    async def get_by_module(self, module_id: str) -> List[Roadmap]:
        """Get all roadmaps for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Roadmap]:
        """Get roadmaps for a product, optionally filtered by module. If module_id is None, returns all product-level roadmaps."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class SQLUnifiedCostRepository(SQLAlchemyRepository[Cost]):
    """SQLAlchemy unified cost repository (new Cost model)."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLCost, Cost)
    
    async def get_by_product(self, product_id: str) -> List[Cost]:
        """Get all costs for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_scope(self, product_id: str, scope: str) -> List[Cost]:
        """Get costs by scope for a product."""
        return await self.find_by({"product_id": product_id, "scope": scope})
    
    async def get_by_scope_id(self, product_id: str, scope: str, scope_id: str) -> List[Cost]:
        """Get costs for a specific scope entity."""
        return await self.find_by({
            "product_id": product_id,
            "scope": scope,
            "scope_id": scope_id
        })
    
    async def get_by_category(self, product_id: str, category: str) -> List[Cost]:
        """Get costs by category for a product."""
        return await self.find_by({"product_id": product_id, "category": category})
    
    async def get_shared_costs(self, product_id: str) -> List[Cost]:
        """Get shared costs for a product."""
        return await self.find_by({"product_id": product_id, "scope": "shared"})


class SQLRevenueModelRepository(SQLAlchemyRepository[RevenueModel]):
    """SQLAlchemy revenue model repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLRevenueModel, RevenueModel)
    
    async def get_by_product(self, product_id: str) -> List[RevenueModel]:
        """Get all revenue models for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_active(self, product_id: str) -> List[RevenueModel]:
        """Get active revenue models for a product."""
        return await self.find_by({"product_id": product_id, "is_active": 1})


class SQLPricingTierRepository(SQLAlchemyRepository[PricingTier]):
    """SQLAlchemy pricing tier repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLPricingTier, PricingTier)
    
    async def get_by_product(self, product_id: str) -> List[PricingTier]:
        """Get all pricing tiers for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_revenue_model(self, revenue_model_id: str) -> List[PricingTier]:
        """Get pricing tiers for a revenue model."""
        return await self.find_by({"revenue_model_id": revenue_model_id})


class SQLUsageMetricRepository(SQLAlchemyRepository[UsageMetric]):
    """SQLAlchemy usage metric repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLUsageMetric, UsageMetric)
    
    async def get_by_product(self, product_id: str) -> List[UsageMetric]:
        """Get all usage metrics for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_type(self, product_id: str, metric_type: str) -> List[UsageMetric]:
        """Get usage metrics by type for a product."""
        return await self.find_by({"product_id": product_id, "metric_type": metric_type})


class SQLNotificationRepository(SQLAlchemyRepository[Notification]):
    """SQLAlchemy notification repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLNotification, Notification)
    
    async def get_by_user(self, user_id: str, organization_id: Optional[str] = None) -> List[Notification]:
        """Get all notifications for a user."""
        filters = {"user_id": user_id}
        if organization_id:
            filters["organization_id"] = organization_id
        return await self.find_by(filters)
    
    async def get_unread(self, user_id: str, organization_id: Optional[str] = None) -> List[Notification]:
        """Get unread notifications for a user."""
        filters = {"user_id": user_id, "read": 0}  # SQLite uses 0/1 for boolean
        if organization_id:
            filters["organization_id"] = organization_id
        return await self.find_by(filters)
    
    async def get_unread_count(self, user_id: str, organization_id: Optional[str] = None) -> int:
        """Get count of unread notifications for a user."""
        unread = await self.get_unread(user_id, organization_id)
        return len(unread)
    
    async def mark_as_read(self, notification_id: str, read_at: Optional[datetime] = None) -> bool:
        """Mark a notification as read."""
        notification = await self.get_by_id(notification_id)
        if not notification:
            return False
        notification.read = True
        notification.read_at = read_at or datetime.utcnow()
        await self.update(notification_id, notification)
        return True
    
    async def mark_all_as_read(self, user_id: str, organization_id: Optional[str] = None) -> int:
        """Mark all notifications as read for a user."""
        unread = await self.get_unread(user_id, organization_id)
        count = 0
        read_at = datetime.utcnow()
        for notification in unread:
            if await self.mark_as_read(notification.id, read_at):
                count += 1
        return count


class SQLModuleRepository(SQLAlchemyRepository[Module], ModuleRepository):
    """SQLAlchemy module repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLModule, Module)
    
    def _to_domain(self, db_model) -> Module:
        """Convert SQLAlchemy model to domain model, handling boolean and list fields."""
        if db_model is None:
            return None
        data = {col.name: getattr(db_model, col.name) for col in db_model.__table__.columns}
        # Convert SQLite integer booleans to Python booleans
        if 'is_default' in data:
            val = data['is_default']
            if isinstance(val, int):
                data['is_default'] = bool(val)
            elif isinstance(val, str):
                data['is_default'] = val.lower() in ('true', '1', 'yes')
        # Ensure list fields are lists, not None
        return self.domain_class(**data)
    
    def _to_db(self, domain_model: Module):
        """Convert domain model to SQLAlchemy model, handling boolean fields."""
        data = domain_model.model_dump(exclude={"id"} if domain_model.id is None else {})
        if domain_model.id is None:
            data["id"] = str(uuid.uuid4())
        # Convert boolean fields to integers for SQLite
        if 'is_default' in data:
            data['is_default'] = 1 if data['is_default'] else 0
        return self.model_class(**data)


class SQLProcessedEmailRepository(SQLAlchemyRepository[ProcessedEmail]):
    """SQLAlchemy processed email repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLProcessedEmail, ProcessedEmail)
    
    def _to_domain(self, db_model) -> ProcessedEmail:
        """Convert SQLAlchemy model to domain model, handling None values for dict fields."""
        if db_model is None:
            return None
        data = {col.name: getattr(db_model, col.name) for col in db_model.__table__.columns}
        # Convert None values to empty dict for suggested_data
        if data.get('suggested_data') is None:
            data['suggested_data'] = {}
        return self.domain_class(**data)
    
    async def get_by_status(self, status: str) -> List[ProcessedEmail]:
        """Get all processed emails with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_entity_type(self, entity_type: str) -> List[ProcessedEmail]:
        """Get all processed emails with a specific entity type."""
        return await self.find_by({"suggested_entity_type": entity_type})
    
    async def get_by_email_id(self, email_id: str) -> Optional[ProcessedEmail]:
        """Get processed email by Gmail email ID."""
        results = await self.find_by({"email_id": email_id})
        return results[0] if results else None
    
    async def get_pending(self) -> List[ProcessedEmail]:
        """Get all pending suggestions."""
        return await self.get_by_status("pending")
    
    async def get_by_correlated_task(self, task_id: str) -> List[ProcessedEmail]:
        """Get all emails correlated to a specific task."""
        return await self.find_by({"correlated_task_id": task_id})


class SQLCloudConfigRepository(SQLAlchemyRepository[CloudConfig], CloudConfigRepository):
    """SQLAlchemy cloud config repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLCloudConfig, CloudConfig)
    
    def _to_domain(self, db_model) -> CloudConfig:
        """Convert SQLAlchemy model to domain model, handling boolean fields."""
        if db_model is None:
            return None
        data = {col.name: getattr(db_model, col.name) for col in db_model.__table__.columns}
        # Convert SQLite integer booleans to Python booleans
        if 'is_active' in data:
            val = data['is_active']
            if isinstance(val, int):
                data['is_active'] = bool(val)
            elif isinstance(val, str):
                data['is_active'] = val.lower() in ('true', '1', 'yes')
        return self.domain_class(**data)
    
    def _to_db(self, domain_model: CloudConfig):
        """Convert domain model to SQLAlchemy model, handling boolean fields."""
        data = domain_model.model_dump(exclude={"id"} if domain_model.id is None else {})
        if domain_model.id is None:
            data["id"] = str(uuid.uuid4())
        # Convert boolean fields to integers for SQLite
        if 'is_active' in data:
            data['is_active'] = 1 if data['is_active'] else 0
        return self.model_class(**data)
    
    async def get_by_product(self, product_id: str) -> List[Module]:
        """Get all modules for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_owner(self, owner_id: str) -> List[Module]:
        """Get all modules owned by a user."""
        return await self.find_by({"owner_id": owner_id})
    
    async def get_default(self, product_id: str) -> Optional[Module]:
        """Get the default module for a product."""
        modules = await self.find_by({"product_id": product_id, "is_default": 1})  # SQLite uses 1 for True
        return modules[0] if modules else None


class SQLEmailAccountRepository(SQLAlchemyRepository[EmailAccount], EmailAccountRepository):
    """SQLAlchemy email account repository."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, SQLEmailAccount, EmailAccount)
    
    def _to_domain(self, db_model) -> EmailAccount:
        """Convert SQLAlchemy model to domain model, handling boolean fields."""
        if db_model is None:
            return None
        data = {col.name: getattr(db_model, col.name) for col in db_model.__table__.columns}
        # Convert SQLite integer booleans to Python booleans
        for bool_field in ['is_active', 'is_default']:
            if bool_field in data:
                val = data[bool_field]
                if isinstance(val, int):
                    data[bool_field] = bool(val)
                elif isinstance(val, str):
                    data[bool_field] = val.lower() in ('true', '1', 'yes')
        return self.domain_class(**data)
    
    def _to_db(self, domain_model: EmailAccount):
        """Convert domain model to SQLAlchemy model, handling boolean fields."""
        data = domain_model.model_dump(exclude={"id"} if domain_model.id is None else {})
        if domain_model.id is None:
            data["id"] = str(uuid.uuid4())
        # Convert boolean fields to integers for SQLite
        for bool_field in ['is_active', 'is_default']:
            if bool_field in data:
                data[bool_field] = 1 if data[bool_field] else 0
        return self.model_class(**data)


# Database connection and session management
_engine = None
_session_factory = None


def get_engine():
    """Get or create the database engine."""
    global _engine
    if _engine is None:
        database_url = db_config.database_url
        # Convert sqlite:/// to sqlite+aiosqlite:/// for async
        if database_url.startswith("sqlite:///"):
            database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///")
        elif database_url.startswith("sqlite://"):
            database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")
        _engine = create_async_engine(database_url, echo=False)
    return _engine


def get_session_factory():
    """Get or create the session factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def get_session():
    """Get a database session generator."""
    factory = get_session_factory()
    async with factory() as session:
        yield session


async def init_db():
    """Initialize the database (create tables and run migrations)."""
    from sqlalchemy import text
    
    engine = get_engine()
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Migration: Add capabilities table and capability_id column to tasks
        try:
            # Check if capabilities table exists
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='capabilities'")
            )
            capabilities_exists = result.fetchone() is not None
            
            # Check if capability_id column exists in tasks table
            result = await conn.execute(
                text("PRAGMA table_info(tasks)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            # Note: Capabilities table and capability_id columns removed - features now support hierarchy
        except Exception as e:
            # If migration fails, log but don't crash (table might already exist)
            print(f"Migration note: {e}")
        
        # Migration: Add workstreams and phases tables, and new task columns
        try:
            # Check existing tables
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='workstreams'")
            )
            workstreams_exists = result.fetchone() is not None
            
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='phases'")
            )
            phases_exists = result.fetchone() is not None
            
            # Check existing columns in tasks table
            result = await conn.execute(
                text("PRAGMA table_info(tasks)")
            )
            columns = [row[1] for row in result.fetchall()]
            workstream_id_exists = 'workstream_id' in columns
            phase_id_exists = 'phase_id' in columns
            depends_on_task_ids_exists = 'depends_on_task_ids' in columns
            
            # Create workstreams table if it doesn't exist
            if not workstreams_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS workstreams (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        "order" INTEGER NOT NULL DEFAULT 0,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_workstreams_product_id ON workstreams(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_workstreams_order ON workstreams(\"order\")")
                )
            
            # Create phases table if it doesn't exist
            if not phases_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS phases (
                        id TEXT NOT NULL PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE,
                        description TEXT,
                        "order" INTEGER NOT NULL DEFAULT 0,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_phases_order ON phases(\"order\")")
                )
            
            # Add new columns to tasks table if they don't exist
            if not workstream_id_exists:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN workstream_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_tasks_workstream_id ON tasks(workstream_id)")
                )
            
            if not phase_id_exists:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN phase_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_tasks_phase_id ON tasks(phase_id)")
                )
            
            if not depends_on_task_ids_exists:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN depends_on_task_ids TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_tasks_depends_on_task_ids ON tasks(depends_on_task_ids)")
                )
        except Exception as e:
            # If migration fails, log but don't crash (table might already exist)
            print(f"Migration note: {e}")
        
        # Migration: Add insights table and RICE columns to features table
        try:
            # Check if insights table exists
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='insights'")
            )
            insights_exists = result.fetchone() is not None
            
            # Check existing columns in features table
            result = await conn.execute(
                text("PRAGMA table_info(features)")
            )
            columns = [row[1] for row in result.fetchall()]
            status_exists = 'status' in columns
            rice_reach_exists = 'rice_reach' in columns
            rice_impact_exists = 'rice_impact' in columns
            rice_confidence_exists = 'rice_confidence' in columns
            rice_effort_exists = 'rice_effort' in columns
            rice_score_exists = 'rice_score' in columns
            target_release_date_exists = 'target_release_date' in columns
            
            # Create insights table if it doesn't exist
            if not insights_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS insights (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        feature_id TEXT,
                        source TEXT NOT NULL,
                        observation TEXT NOT NULL,
                        implication TEXT,
                        problem_id TEXT,
                        capability_id TEXT,
                        votes INTEGER NOT NULL DEFAULT 0,
                        sentiment TEXT,
                        status TEXT NOT NULL DEFAULT 'new',
                        title TEXT,
                        description TEXT,
                        user_email TEXT,
                        user_name TEXT,
                        problem_statement TEXT,
                        customer_segment TEXT,
                        frequency TEXT,
                        severity TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(feature_id) REFERENCES features(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_insights_product_id ON insights(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_insights_feature_id ON insights(feature_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_insights_status ON insights(status)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_insights_source ON insights(source)")
                )
            
            # Add RICE and status columns to features table if they don't exist
            if not status_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN status TEXT NOT NULL DEFAULT 'discovery'")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_features_status ON features(status)")
                )
            
            if not rice_reach_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN rice_reach INTEGER")
                )
            
            if not rice_impact_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN rice_impact REAL")
                )
            
            if not rice_confidence_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN rice_confidence REAL")
                )
            
            if not rice_effort_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN rice_effort INTEGER")
                )
            
            if not rice_score_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN rice_score REAL")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_features_rice_score ON features(rice_score)")
                )
            
            if not target_release_date_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN target_release_date DATETIME")
                )
            
            # Migration: Add strategies table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='strategies'")
            )
            strategies_exists = result.fetchone() is not None
            
            if not strategies_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS strategies (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT,
                        objectives TEXT,
                        key_results TEXT,
                        status TEXT NOT NULL DEFAULT 'draft',
                        target_date DATETIME,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_strategies_product_id ON strategies(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_strategies_type ON strategies(type)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_strategies_status ON strategies(status)")
                )
            
            # Migration: Add new columns to insights table
            result = await conn.execute(
                text("PRAGMA table_info(insights)")
            )
            columns = [row[1] for row in result.fetchall()]
            problem_statement_exists = 'problem_statement' in columns
            customer_segment_exists = 'customer_segment' in columns
            frequency_exists = 'frequency' in columns
            severity_exists = 'severity' in columns
            
            if not problem_statement_exists:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN problem_statement TEXT")
                )
            if not customer_segment_exists:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN customer_segment TEXT")
                )
            if not frequency_exists:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN frequency TEXT")
                )
            if not severity_exists:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN severity TEXT")
                )
            
            # Migration: Add new columns to features table
            result = await conn.execute(
                text("PRAGMA table_info(features)")
            )
            columns = [row[1] for row in result.fetchall()]
            value_score_exists = 'value_score' in columns
            effort_score_exists = 'effort_score' in columns
            priority_framework_exists = 'priority_framework' in columns
            release_id_exists = 'release_id' in columns
            sprint_id_exists = 'sprint_id' in columns
            capacity_estimate_exists = 'capacity_estimate' in columns
            
            if not value_score_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN value_score REAL")
                )
            if not effort_score_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN effort_score REAL")
                )
            if not priority_framework_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN priority_framework TEXT")
                )
            if not release_id_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN release_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_features_release_id ON features(release_id)")
                )
            if not sprint_id_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN sprint_id TEXT")
                )
            if not capacity_estimate_exists:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN capacity_estimate REAL")
                )
            
            # Migration: Add new columns to tasks table
            result = await conn.execute(
                text("PRAGMA table_info(tasks)")
            )
            columns = [row[1] for row in result.fetchall()]
            estimated_hours_exists = 'estimated_hours' in columns
            actual_hours_exists = 'actual_hours' in columns
            velocity_exists = 'velocity' in columns
            blockers_exists = 'blockers' in columns
            
            if not estimated_hours_exists:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN estimated_hours REAL")
                )
            if not actual_hours_exists:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN actual_hours REAL")
                )
            if not velocity_exists:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN velocity REAL")
                )
            if not blockers_exists:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN blockers TEXT")
                )
            
            # Migration: Add problems table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='problems'")
            )
            problems_exists = result.fetchone() is not None
            
            if not problems_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS problems (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT,
                        insight_ids TEXT,
                        feature_id TEXT,
                        status TEXT NOT NULL DEFAULT 'identified',
                        priority TEXT NOT NULL DEFAULT 'medium',
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(feature_id) REFERENCES features(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_problems_product_id ON problems(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_problems_status ON problems(status)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_problems_priority ON problems(priority)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_problems_feature_id ON problems(feature_id)")
                )
            
            # Migration: Add interviews table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='interviews'")
            )
            interviews_exists = result.fetchone() is not None
            
            if not interviews_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS interviews (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        interviewee_name TEXT NOT NULL,
                        interviewee_email TEXT,
                        date DATETIME NOT NULL,
                        notes TEXT,
                        insight_ids TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_interviews_product_id ON interviews(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_interviews_date ON interviews(date)")
                )
            
            # Migration: Add decisions table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='decisions'")
            )
            decisions_exists = result.fetchone() is not None
            
            if not decisions_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS decisions (
                        id TEXT NOT NULL PRIMARY KEY,
                        feature_id TEXT NOT NULL,
                        decision_type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT,
                        alternatives TEXT,
                        rationale TEXT,
                        decision_maker TEXT,
                        decision_date DATETIME,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(feature_id) REFERENCES features(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_decisions_feature_id ON decisions(feature_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_decisions_decision_type ON decisions(decision_type)")
                )
            
            # Migration: Add releases table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='releases'")
            )
            releases_exists = result.fetchone() is not None
            
            if not releases_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS releases (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        target_date DATETIME,
                        status TEXT NOT NULL DEFAULT 'planned',
                        feature_ids TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_releases_product_id ON releases(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_releases_status ON releases(status)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_releases_target_date ON releases(target_date)")
                )
            
            # Migration: Add stakeholders table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='stakeholders'")
            )
            stakeholders_exists = result.fetchone() is not None
            
            if not stakeholders_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS stakeholders (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        role TEXT,
                        communication_preferences TEXT,
                        update_frequency TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_stakeholders_product_id ON stakeholders(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_stakeholders_email ON stakeholders(email)")
                )
            
            # Migration: Add status_reports table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='status_reports'")
            )
            status_reports_exists = result.fetchone() is not None
            
            if not status_reports_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS status_reports (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        report_date DATETIME NOT NULL,
                        summary TEXT NOT NULL,
                        highlights TEXT,
                        risks TEXT,
                        next_steps TEXT,
                        stakeholder_ids TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_status_reports_product_id ON status_reports(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_status_reports_report_date ON status_reports(report_date)")
                )
            
            # Migration: Add metrics table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='metrics'")
            )
            metrics_exists = result.fetchone() is not None
            
            if not metrics_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS metrics (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        okr_id TEXT,
                        feature_id TEXT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        target_value REAL,
                        current_value REAL,
                        unit TEXT,
                        tracking_frequency TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(feature_id) REFERENCES features(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_metrics_product_id ON metrics(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_metrics_feature_id ON metrics(feature_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_metrics_okr_id ON metrics(okr_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_metrics_type ON metrics(type)")
                )
            
            # Migration: Add outcomes table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='outcomes'")
            )
            outcomes_exists = result.fetchone() is not None
            
            if not outcomes_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS outcomes (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        feature_id TEXT,
                        metric_id TEXT,
                        description TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending',
                        achieved_date DATETIME,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(feature_id) REFERENCES features(id),
                        FOREIGN KEY(metric_id) REFERENCES metrics(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_outcomes_product_id ON outcomes(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_outcomes_feature_id ON outcomes(feature_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_outcomes_metric_id ON outcomes(metric_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_outcomes_status ON outcomes(status)")
                )
        except Exception as e:
            # If migration fails, log but don't crash (table might already exist)
            print(f"Migration note: {e}")
        
        # Migration: Canonical model updates - new columns and tables
        try:
            # Check and add new columns to products table
            result = await conn.execute(
                text("PRAGMA table_info(products)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'tco' not in columns:
                await conn.execute(
                    text("ALTER TABLE products ADD COLUMN tco REAL")
                )
            if 'tco_currency' not in columns:
                await conn.execute(
                    text("ALTER TABLE products ADD COLUMN tco_currency TEXT NOT NULL DEFAULT 'USD'")
                )
            if 'tco_last_calculated' not in columns:
                await conn.execute(
                    text("ALTER TABLE products ADD COLUMN tco_last_calculated DATETIME")
                )
            if 'owner' not in columns:
                await conn.execute(
                    text("ALTER TABLE products ADD COLUMN owner TEXT")
                )
            if 'status' not in columns:
                await conn.execute(
                    text("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_products_status ON products(status)")
                )
            
            # Check and add new columns to strategies table
            result = await conn.execute(
                text("PRAGMA table_info(strategies)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'strategic_themes' not in columns:
                await conn.execute(
                    text("ALTER TABLE strategies ADD COLUMN strategic_themes TEXT")
                )
            if 'assumptions' not in columns:
                await conn.execute(
                    text("ALTER TABLE strategies ADD COLUMN assumptions TEXT")
                )
            if 'risks' not in columns:
                await conn.execute(
                    text("ALTER TABLE strategies ADD COLUMN risks TEXT")
                )
            
            # Check and add new columns to features table
            result = await conn.execute(
                text("PRAGMA table_info(features)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            # Note: capability_id column removed from features - features now support hierarchy via parent_feature_id
            if 'problem_ids' not in columns:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN problem_ids TEXT")
                )
            if 'expected_outcomes' not in columns:
                await conn.execute(
                    text("ALTER TABLE features ADD COLUMN expected_outcomes TEXT")
                )
            
            # Check and add new columns to tasks table
            result = await conn.execute(
                text("PRAGMA table_info(tasks)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'effort' not in columns:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN effort TEXT")
                )
            if 'dependencies' not in columns:
                await conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN dependencies TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_tasks_dependencies ON tasks(dependencies)")
                )
            
            # Check and add new columns to resources table
            result = await conn.execute(
                text("PRAGMA table_info(resources)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'product_id' not in columns:
                await conn.execute(
                    text("ALTER TABLE resources ADD COLUMN product_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_resources_product_id ON resources(product_id)")
                )
            if 'cost_rate' not in columns:
                await conn.execute(
                    text("ALTER TABLE resources ADD COLUMN cost_rate REAL")
                )
            if 'cost_period' not in columns:
                await conn.execute(
                    text("ALTER TABLE resources ADD COLUMN cost_period TEXT")
                )
            if 'currency' not in columns:
                await conn.execute(
                    text("ALTER TABLE resources ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'")
                )
            if 'availability' not in columns:
                await conn.execute(
                    text("ALTER TABLE resources ADD COLUMN availability REAL")
                )
            if 'email' not in columns:
                await conn.execute(
                    text("ALTER TABLE resources ADD COLUMN email TEXT")
                )
            if 'description' not in columns:
                await conn.execute(
                    text("ALTER TABLE resources ADD COLUMN description TEXT")
                )
            
            # Note: Capabilities table removed - features now support hierarchy
            
            # Check and add new columns to problems table
            result = await conn.execute(
                text("PRAGMA table_info(problems)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'evidence' not in columns:
                await conn.execute(
                    text("ALTER TABLE problems ADD COLUMN evidence TEXT")
                )
            if 'severity' not in columns:
                await conn.execute(
                    text("ALTER TABLE problems ADD COLUMN severity TEXT")
                )
            if 'affected_stakeholders' not in columns:
                await conn.execute(
                    text("ALTER TABLE problems ADD COLUMN affected_stakeholders TEXT")
                )
            # Note: capability_id column removed from problems - use feature_id instead
            
            # Check and add new columns to insights table
            result = await conn.execute(
                text("PRAGMA table_info(insights)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'observation' not in columns:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN observation TEXT")
                )
                # Migrate existing title data to observation, use description as fallback, or empty string
                await conn.execute(
                    text("""
                    UPDATE insights 
                    SET observation = COALESCE(title, description, '') 
                    WHERE observation IS NULL
                    """)
                )
            if 'implication' not in columns:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN implication TEXT")
                )
                # Migrate existing description data to implication if it wasn't already used for observation
                await conn.execute(
                    text("""
                    UPDATE insights 
                    SET implication = description 
                    WHERE implication IS NULL 
                    AND description IS NOT NULL 
                    AND description != observation
                    """)
                )
            if 'sentiment' not in columns:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN sentiment TEXT")
                )
            if 'problem_id' not in columns:
                await conn.execute(
                    text("ALTER TABLE insights ADD COLUMN problem_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_insights_problem_id ON insights(problem_id)")
                )
            # Note: capability_id column removed from insights - use feature_id instead
            
            # Update decisions table - add new columns, keep old ones for backward compatibility
            result = await conn.execute(
                text("PRAGMA table_info(decisions)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'product_id' not in columns:
                await conn.execute(
                    text("ALTER TABLE decisions ADD COLUMN product_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_decisions_product_id ON decisions(product_id)")
                )
            if 'entity_type' not in columns:
                await conn.execute(
                    text("ALTER TABLE decisions ADD COLUMN entity_type TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_decisions_entity_type ON decisions(entity_type)")
                )
            if 'entity_id' not in columns:
                await conn.execute(
                    text("ALTER TABLE decisions ADD COLUMN entity_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_decisions_entity_id ON decisions(entity_id)")
                )
            if 'outcome' not in columns:
                await conn.execute(
                    text("ALTER TABLE decisions ADD COLUMN outcome TEXT")
                )
            if 'priority_score_id' not in columns:
                await conn.execute(
                    text("ALTER TABLE decisions ADD COLUMN priority_score_id TEXT")
                )
            if 'review_date' not in columns:
                await conn.execute(
                    text("ALTER TABLE decisions ADD COLUMN review_date DATETIME")
                )
            
            # Update metrics table - add new columns, keep old ones for backward compatibility
            result = await conn.execute(
                text("PRAGMA table_info(metrics)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'scope' not in columns:
                await conn.execute(
                    text("ALTER TABLE metrics ADD COLUMN scope TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_metrics_scope ON metrics(scope)")
                )
            if 'scope_id' not in columns:
                await conn.execute(
                    text("ALTER TABLE metrics ADD COLUMN scope_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_metrics_scope_id ON metrics(scope_id)")
                )
            if 'metric_type' not in columns:
                await conn.execute(
                    text("ALTER TABLE metrics ADD COLUMN metric_type TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_metrics_metric_type ON metrics(metric_type)")
                )
            if 'description' not in columns:
                await conn.execute(
                    text("ALTER TABLE metrics ADD COLUMN description TEXT")
                )
            
            # Update stakeholders table
            result = await conn.execute(
                text("PRAGMA table_info(stakeholders)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'influence_level' not in columns:
                await conn.execute(
                    text("ALTER TABLE stakeholders ADD COLUMN influence_level TEXT")
                )
            if 'interests' not in columns:
                await conn.execute(
                    text("ALTER TABLE stakeholders ADD COLUMN interests TEXT")
                )
            
            # Create new tables for canonical model
            # PrioritizationModel table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='prioritization_models'")
            )
            prioritization_models_exists = result.fetchone() is not None
            
            if not prioritization_models_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS prioritization_models (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        criteria TEXT,
                        weights TEXT,
                        applies_to TEXT NOT NULL,
                        version INTEGER NOT NULL DEFAULT 1,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_prioritization_models_product_id ON prioritization_models(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_prioritization_models_applies_to ON prioritization_models(applies_to)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_prioritization_models_is_active ON prioritization_models(is_active)")
                )
            
            # PriorityScore table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='priority_scores'")
            )
            priority_scores_exists = result.fetchone() is not None
            
            if not priority_scores_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS priority_scores (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        entity_type TEXT NOT NULL,
                        entity_id TEXT NOT NULL,
                        prioritization_model_id TEXT,
                        inputs TEXT,
                        score REAL NOT NULL,
                        confidence REAL,
                        assumptions TEXT,
                        calculated_at DATETIME NOT NULL,
                        version INTEGER NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(prioritization_model_id) REFERENCES prioritization_models(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_priority_scores_product_id ON priority_scores(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_priority_scores_entity ON priority_scores(entity_type, entity_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_priority_scores_calculated_at ON priority_scores(calculated_at)")
                )
            
            # Roadmap table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='roadmaps'")
            )
            roadmaps_exists = result.fetchone() is not None
            
            if not roadmaps_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS roadmaps (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        description TEXT,
                        timeboxes TEXT,
                        roadmap_items TEXT,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_roadmaps_product_id ON roadmaps(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_roadmaps_is_active ON roadmaps(is_active)")
                )
            
            # Cost (unified) table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='costs'")
            )
            costs_exists = result.fetchone() is not None
            
            if not costs_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS costs (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        scope TEXT NOT NULL,
                        scope_id TEXT,
                        category TEXT NOT NULL,
                        cost_type TEXT NOT NULL,
                        cost_type_id TEXT,
                        name TEXT NOT NULL,
                        amount REAL NOT NULL,
                        currency TEXT NOT NULL DEFAULT 'USD',
                        recurrence TEXT NOT NULL,
                        amortization_period INTEGER,
                        time_period_start DATETIME,
                        time_period_end DATETIME,
                        description TEXT,
                        resource_id TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(cost_type_id) REFERENCES cost_types(id),
                        FOREIGN KEY(resource_id) REFERENCES resources(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_costs_product_id ON costs(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_costs_scope ON costs(scope)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_costs_scope_id ON costs(scope_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_costs_category ON costs(category)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_costs_cost_type ON costs(cost_type)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_costs_recurrence ON costs(recurrence)")
                )
            
            # RevenueModel table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='revenue_models'")
            )
            revenue_models_exists = result.fetchone() is not None
            
            if not revenue_models_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS revenue_models (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        model_type TEXT NOT NULL,
                        description TEXT,
                        base_revenue REAL,
                        currency TEXT NOT NULL DEFAULT 'USD',
                        assumptions TEXT,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_revenue_models_product_id ON revenue_models(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_revenue_models_is_active ON revenue_models(is_active)")
                )
            
            # PricingTier table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='pricing_tiers'")
            )
            pricing_tiers_exists = result.fetchone() is not None
            
            if not pricing_tiers_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS pricing_tiers (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        revenue_model_id TEXT,
                        name TEXT NOT NULL,
                        price REAL NOT NULL,
                        currency TEXT NOT NULL DEFAULT 'USD',
                        billing_period TEXT,
                        features TEXT,
                        limits TEXT,
                        overage_rules TEXT,
                        description TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id),
                        FOREIGN KEY(revenue_model_id) REFERENCES revenue_models(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_pricing_tiers_product_id ON pricing_tiers(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_pricing_tiers_revenue_model_id ON pricing_tiers(revenue_model_id)")
                )
            
            # UsageMetric table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='usage_metrics'")
            )
            usage_metrics_exists = result.fetchone() is not None
            
            if not usage_metrics_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS usage_metrics (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        metric_type TEXT NOT NULL,
                        name TEXT NOT NULL,
                        unit TEXT NOT NULL,
                        volume REAL NOT NULL,
                        target_volume REAL,
                        time_period TEXT,
                        period_start DATETIME,
                        period_end DATETIME,
                        description TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_usage_metrics_product_id ON usage_metrics(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_usage_metrics_metric_type ON usage_metrics(metric_type)")
                )
            
            # Notification table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'")
            )
            notifications_exists = result.fetchone() is not None
            
            if not notifications_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id TEXT NOT NULL PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        organization_id TEXT,
                        type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        entity_type TEXT,
                        entity_id TEXT,
                        read INTEGER NOT NULL DEFAULT 0,
                        read_at DATETIME,
                        action_url TEXT,
                        priority TEXT NOT NULL DEFAULT 'normal',
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_notifications_organization_id ON notifications(organization_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_notifications_read ON notifications(read)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_notifications_entity ON notifications(entity_type, entity_id)")
                )
            
            # Module table
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='modules'")
            )
            modules_exists = result.fetchone() is not None
            
            if not modules_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS modules (
                        id TEXT NOT NULL PRIMARY KEY,
                        product_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        owner_id TEXT,
                        is_default INTEGER NOT NULL DEFAULT 0,
                        layout_config TEXT,
                        settings TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(product_id) REFERENCES products(id)
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_modules_product_id ON modules(product_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_modules_owner_id ON modules(owner_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_modules_name ON modules(name)")
                )
            
            # Create cloud_configs table if it doesn't exist
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='cloud_configs'")
            )
            cloud_configs_exists = result.fetchone() is not None
            
            if not cloud_configs_exists:
                await conn.execute(
                    text("""
                    CREATE TABLE IF NOT EXISTS cloud_configs (
                        id TEXT NOT NULL PRIMARY KEY,
                        organization_id TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        name TEXT NOT NULL,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        credentials_encrypted TEXT NOT NULL,
                        region TEXT,
                        account_id TEXT,
                        last_synced_at DATETIME,
                        last_sync_status TEXT,
                        last_sync_error TEXT,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL
                    )
                    """)
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_cloud_configs_organization_id ON cloud_configs(organization_id)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_cloud_configs_provider ON cloud_configs(provider)")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_cloud_configs_is_active ON cloud_configs(is_active)")
                )
            
            # Add module_id to capabilities table if it doesn't exist
            result = await conn.execute(
                text("PRAGMA table_info(capabilities)")
            )
            columns = [row[1] for row in result.fetchall()]
            
            if 'module_id' not in columns:
                await conn.execute(
                    text("ALTER TABLE capabilities ADD COLUMN module_id TEXT")
                )
                await conn.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_capabilities_module_id ON capabilities(module_id)")
                )
        except Exception as e:
            # If migration fails, log but don't crash (table might already exist)
            print(f"Migration note (canonical model): {e}")


