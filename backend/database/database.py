"""Database factory and repository initialization."""
from typing import Optional, AsyncGenerator, TYPE_CHECKING, Any, Union
from contextlib import asynccontextmanager

from .config import db_config

# Type alias for database session (works for both SQL and MongoDB)
# For SQL: AsyncSession, for MongoDB: None
DBSession = Optional[Any]

# Conditional imports based on database type
AsyncSession = None
if db_config.is_sql:
    try:
        from sqlalchemy.ext.asyncio import AsyncSession  # type: ignore
    except ImportError:
        raise ImportError(
            "SQLAlchemy is required for SQL databases. "
            "Install it with: pip install sqlalchemy aiosqlite"
        )

# Initialize SQL repository imports
get_session_factory = None
get_session = None
SQLProductRepository = None
SQLCostRepository = None
SQLCostCategoryRepository = None
SQLCostScenarioRepository = None
SQLCostTypeRepository = None
SQLFeatureRepository = None
SQLResourceRepository = None
SQLInsightRepository = None
SQLWorkstreamRepository = None
SQLPhaseRepository = None
SQLTaskRepository = None
SQLStrategyRepository = None
SQLProblemRepository = None
SQLInterviewRepository = None
SQLDecisionRepository = None
SQLReleaseRepository = None
SQLStakeholderRepository = None
SQLStatusReportRepository = None
SQLMetricRepository = None
SQLOutcomeRepository = None
SQLPrioritizationModelRepository = None
SQLPriorityScoreRepository = None
SQLRoadmapRepository = None
SQLUnifiedCostRepository = None
SQLRevenueModelRepository = None
SQLPricingTierRepository = None
SQLUsageMetricRepository = None
SQLNotificationRepository = None
SQLModuleRepository = None
init_sql_db = None

if db_config.is_sql:
    try:
        from .repositories.sqlalchemy_repository import (
            get_session_factory,
            get_session,
            SQLProductRepository,
            SQLCostRepository,
            SQLCostCategoryRepository,
            SQLCostScenarioRepository,
            SQLCostTypeRepository,
            SQLFeatureRepository,
            SQLResourceRepository,
            SQLInsightRepository,
            SQLWorkstreamRepository,
            SQLPhaseRepository,
            SQLTaskRepository,
            SQLStrategyRepository,
            SQLProblemRepository,
            SQLInterviewRepository,
            SQLDecisionRepository,
            SQLReleaseRepository,
            SQLStakeholderRepository,
            SQLStatusReportRepository,
            SQLMetricRepository,
            SQLOutcomeRepository,
            SQLPrioritizationModelRepository,
            SQLPriorityScoreRepository,
            SQLRoadmapRepository,
            SQLUnifiedCostRepository,
            SQLRevenueModelRepository,
            SQLPricingTierRepository,
            SQLUsageMetricRepository,
            SQLNotificationRepository,
            SQLModuleRepository,
            init_db as init_sql_db,
        )
    except ImportError as e:
        raise ImportError(
            "SQLAlchemy repositories are required for SQL databases. "
            "Install dependencies with: pip install -r requirements.txt"
        ) from e

# Initialize MongoDB repository imports
get_mongodb_database = None
MongoDBProductRepository = None
MongoDBCostRepository = None
MongoDBCostCategoryRepository = None
MongoDBCostScenarioRepository = None
MongoDBCostTypeRepository = None
MongoDBFeatureRepository = None
MongoDBResourceRepository = None
MongoDBInsightRepository = None
MongoDBWorkstreamRepository = None
MongoDBPhaseRepository = None
MongoDBTaskRepository = None
MongoDBStrategyRepository = None
MongoDBProblemRepository = None
MongoDBInterviewRepository = None
MongoDBDecisionRepository = None
MongoDBReleaseRepository = None
MongoDBStakeholderRepository = None
MongoDBStatusReportRepository = None
MongoDBMetricRepository = None
MongoDBOutcomeRepository = None
MongoDBPrioritizationModelRepository = None
MongoDBPriorityScoreRepository = None
MongoDBRoadmapRepository = None
MongoDBUnifiedCostRepository = None
MongoDBRevenueModelRepository = None
MongoDBPricingTierRepository = None
MongoDBUsageMetricRepository = None
MongoDBNotificationRepository = None
init_mongodb = None

if db_config.is_nosql:
    try:
        from .repositories.mongodb_repository import (
            get_mongodb_database,
            MongoDBProductRepository,
            MongoDBCostRepository,
            MongoDBCostCategoryRepository,
            MongoDBCostScenarioRepository,
            MongoDBCostTypeRepository,
            MongoDBFeatureRepository,
            MongoDBResourceRepository,
            MongoDBInsightRepository,
            MongoDBWorkstreamRepository,
            MongoDBPhaseRepository,
            MongoDBTaskRepository,
            MongoDBStrategyRepository,
            MongoDBProblemRepository,
            MongoDBInterviewRepository,
            MongoDBDecisionRepository,
            MongoDBReleaseRepository,
            MongoDBStakeholderRepository,
            MongoDBStatusReportRepository,
            MongoDBMetricRepository,
            MongoDBOutcomeRepository,
            MongoDBPrioritizationModelRepository,
            MongoDBPriorityScoreRepository,
            MongoDBRoadmapRepository,
            MongoDBUnifiedCostRepository,
            MongoDBRevenueModelRepository,
            MongoDBPricingTierRepository,
            MongoDBUsageMetricRepository,
            MongoDBNotificationRepository,
            MongoDBModuleRepository,
            init_mongodb,
        )
    except ImportError as e:
        raise ImportError(
            "MongoDB repositories are required for MongoDB. "
            "Install dependencies with: pip install motor pymongo"
        ) from e

from .repositories.base_repository import BaseRepository
from .repositories.product_repository import ProductRepository
from .repositories.cost_repository import CostRepository
from .repositories.feature_repository import FeatureRepository
from .repositories.resource_repository import ResourceRepository
from .repositories.insight_repository import InsightRepository
from .repositories.workstream_repository import WorkstreamRepository
from .repositories.phase_repository import PhaseRepository
from .repositories.task_repository import TaskRepository
from .repositories.strategy_repository import StrategyRepository
from .repositories.problem_repository import ProblemRepository
from .repositories.interview_repository import InterviewRepository
from .repositories.decision_repository import DecisionRepository
from .repositories.release_repository import ReleaseRepository
from .repositories.stakeholder_repository import StakeholderRepository
from .repositories.status_report_repository import StatusReportRepository
from .repositories.metric_repository import MetricRepository
from .repositories.outcome_repository import OutcomeRepository
from .repositories.prioritization_model_repository import PrioritizationModelRepository
from .repositories.priority_score_repository import PriorityScoreRepository
from .repositories.roadmap_repository import RoadmapRepository
from .repositories.revenue_model_repository import RevenueModelRepository
from .repositories.pricing_tier_repository import PricingTierRepository
from .repositories.usage_metric_repository import UsageMetricRepository
from .repositories.notification_repository import NotificationRepository
from .repositories.module_repository import ModuleRepository


# Global session for operations that don't use dependency injection
_global_session = None


@asynccontextmanager
async def get_db_session_context() -> AsyncGenerator:
    """Get a database session context manager."""
    if db_config.is_sql:
        if get_session_factory is None:
            raise ImportError("SQLAlchemy is not installed. Install with: pip install sqlalchemy aiosqlite")
        factory = get_session_factory()
        async with factory() as session:
            yield session
    else:
        yield None


class RepositoryFactory:
    """Factory for creating repository instances."""
    
    @staticmethod
    def get_product_repository(session = None) -> ProductRepository:
        """Get a product repository instance."""
        if db_config.is_sql:
            if SQLProductRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLProductRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBProductRepository(database)
    
    @staticmethod
    def get_cost_repository(session = None) -> CostRepository:
        """Get a unified cost repository instance (for new Cost model)."""
        if db_config.is_sql:
            if SQLUnifiedCostRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLUnifiedCostRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBUnifiedCostRepository(database)
    
    @staticmethod
    def get_cost_category_repository(session = None):
        """Get a cost category repository instance."""
        if db_config.is_sql:
            if SQLCostCategoryRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLCostCategoryRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBCostCategoryRepository(database)
    
    @staticmethod
    def get_cost_scenario_repository(session = None):
        """Get a cost scenario repository instance."""
        if db_config.is_sql:
            if SQLCostScenarioRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLCostScenarioRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBCostScenarioRepository(database)
    
    @staticmethod
    def get_cost_type_repository(session = None):
        """Get a cost type repository instance."""
        if db_config.is_sql:
            if SQLCostTypeRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLCostTypeRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBCostTypeRepository(database)
    
    @staticmethod
    def get_feature_repository(session = None) -> FeatureRepository:
        """Get a feature repository instance."""
        if db_config.is_sql:
            if SQLFeatureRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLFeatureRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBFeatureRepository(database)
    
    @staticmethod
    def get_resource_repository(session = None) -> ResourceRepository:
        """Get a resource repository instance."""
        if db_config.is_sql:
            if SQLResourceRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLResourceRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBResourceRepository(database)
    
    @staticmethod
    def get_insight_repository(session = None) -> InsightRepository:
        """Get an insight repository instance."""
        if db_config.is_sql:
            if SQLInsightRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLInsightRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBInsightRepository(database)
    
    @staticmethod
    def get_workstream_repository(session = None) -> WorkstreamRepository:
        """Get a workstream repository instance."""
        if db_config.is_sql:
            if SQLWorkstreamRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLWorkstreamRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBWorkstreamRepository(database)
    
    @staticmethod
    def get_phase_repository(session = None) -> PhaseRepository:
        """Get a phase repository instance."""
        if db_config.is_sql:
            if SQLPhaseRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLPhaseRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBPhaseRepository(database)
    
    @staticmethod
    def get_task_repository(session = None) -> TaskRepository:
        """Get a task repository instance."""
        if db_config.is_sql:
            if SQLTaskRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLTaskRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBTaskRepository(database)
    
    @staticmethod
    def get_strategy_repository(session = None) -> StrategyRepository:
        """Get a strategy repository instance."""
        if db_config.is_sql:
            if SQLStrategyRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLStrategyRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBStrategyRepository(database)
    
    @staticmethod
    def get_problem_repository(session = None) -> ProblemRepository:
        """Get a problem repository instance."""
        if db_config.is_sql:
            if SQLProblemRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLProblemRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBProblemRepository(database)
    
    @staticmethod
    def get_interview_repository(session = None) -> InterviewRepository:
        """Get an interview repository instance."""
        if db_config.is_sql:
            if SQLInterviewRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLInterviewRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBInterviewRepository(database)
    
    @staticmethod
    def get_decision_repository(session = None) -> DecisionRepository:
        """Get a decision repository instance."""
        if db_config.is_sql:
            if SQLDecisionRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLDecisionRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBDecisionRepository(database)
    
    @staticmethod
    def get_release_repository(session = None) -> ReleaseRepository:
        """Get a release repository instance."""
        if db_config.is_sql:
            if SQLReleaseRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLReleaseRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBReleaseRepository(database)
    
    @staticmethod
    def get_stakeholder_repository(session = None) -> StakeholderRepository:
        """Get a stakeholder repository instance."""
        if db_config.is_sql:
            if SQLStakeholderRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLStakeholderRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBStakeholderRepository(database)
    
    @staticmethod
    def get_status_report_repository(session = None) -> StatusReportRepository:
        """Get a status report repository instance."""
        if db_config.is_sql:
            if SQLStatusReportRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLStatusReportRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBStatusReportRepository(database)
    
    @staticmethod
    def get_metric_repository(session = None) -> MetricRepository:
        """Get a metric repository instance."""
        if db_config.is_sql:
            if SQLMetricRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLMetricRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBMetricRepository(database)
    
    @staticmethod
    def get_outcome_repository(session = None) -> OutcomeRepository:
        """Get an outcome repository instance."""
        if db_config.is_sql:
            if SQLOutcomeRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLOutcomeRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBOutcomeRepository(database)
    
    @staticmethod
    def get_prioritization_model_repository(session = None) -> PrioritizationModelRepository:
        """Get a prioritization model repository instance."""
        if db_config.is_sql:
            if SQLPrioritizationModelRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLPrioritizationModelRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBPrioritizationModelRepository(database)
    
    @staticmethod
    def get_priority_score_repository(session = None) -> PriorityScoreRepository:
        """Get a priority score repository instance."""
        if db_config.is_sql:
            if SQLPriorityScoreRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLPriorityScoreRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBPriorityScoreRepository(database)
    
    @staticmethod
    def get_roadmap_repository(session = None) -> RoadmapRepository:
        """Get a roadmap repository instance."""
        if db_config.is_sql:
            if SQLRoadmapRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLRoadmapRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBRoadmapRepository(database)
    
    @staticmethod
    def get_unified_cost_repository(session = None) -> CostRepository:
        """Get a unified cost repository instance (new Cost model)."""
        if db_config.is_sql:
            if SQLUnifiedCostRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLUnifiedCostRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBUnifiedCostRepository(database)
    
    @staticmethod
    def get_revenue_model_repository(session = None) -> RevenueModelRepository:
        """Get a revenue model repository instance."""
        if db_config.is_sql:
            if SQLRevenueModelRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLRevenueModelRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBRevenueModelRepository(database)
    
    @staticmethod
    def get_pricing_tier_repository(session = None) -> PricingTierRepository:
        """Get a pricing tier repository instance."""
        if db_config.is_sql:
            if SQLPricingTierRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLPricingTierRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBPricingTierRepository(database)
    
    @staticmethod
    def get_usage_metric_repository(session = None) -> UsageMetricRepository:
        """Get a usage metric repository instance."""
        if db_config.is_sql:
            if SQLUsageMetricRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLUsageMetricRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBUsageMetricRepository(database)
    
    @staticmethod
    def get_notification_repository(session = None) -> NotificationRepository:
        """Get a notification repository instance."""
        if db_config.is_sql:
            if SQLNotificationRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLNotificationRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBNotificationRepository(database)
    
    def get_module_repository(session = None) -> ModuleRepository:
        """Get a module repository instance."""
        if db_config.is_sql:
            if SQLModuleRepository is None:
                raise ImportError("SQLAlchemy repositories are not available. Install with: pip install sqlalchemy aiosqlite")
            if session is None:
                raise ValueError("Session is required for SQL databases. Use dependency injection or get_db_session_context().")
            return SQLModuleRepository(session)
        else:  # MongoDB
            if get_mongodb_database is None:
                raise ImportError("MongoDB repositories are not available. Install with: pip install motor pymongo")
            database = get_mongodb_database()
            return MongoDBModuleRepository(database)


async def init_database():
    """Initialize the database based on configuration."""
    if db_config.is_sql:
        await init_sql_db()
    else:  # MongoDB
        await init_mongodb()


# Dependency for FastAPI
async def get_db_session():
    """Get database session for dependency injection (SQL only)."""
    if db_config.is_sql:
        if get_session is None:
            raise ImportError("SQLAlchemy is not installed. Install with: pip install sqlalchemy aiosqlite")
        async for session in get_session():
            yield session
    else:
        # For MongoDB, we don't use sessions
        yield None

