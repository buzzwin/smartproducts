"""MongoDB repository implementation."""
import uuid
from datetime import datetime
from typing import Generic, TypeVar, Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from ..config import db_config
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
    Metric,
    Outcome,
    PrioritizationModel,
    PriorityScore,
    RevenueModel,
    PricingTier,
    UsageMetric,
    Notification,
    Module,
)
from .base_repository import BaseRepository

T = TypeVar('T')


class MongoDBRepository(BaseRepository[T], Generic[T]):
    """Base MongoDB repository implementation."""
    
    def __init__(self, database: AsyncIOMotorDatabase, collection_name: str, domain_class):
        """Initialize repository with database and collection."""
        self.database = database
        self.collection = database[collection_name]
        self.domain_class = domain_class
    
    def _to_domain(self, doc: Dict) -> Optional[T]:
        """Convert MongoDB document to domain model."""
        if doc is None:
            return None
        # Convert _id to id
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        return self.domain_class(**doc)
    
    def _to_db(self, domain_model: T) -> Dict:
        """Convert domain model to MongoDB document."""
        data = domain_model.model_dump(exclude={"id"} if domain_model.id is None else {})
        if domain_model.id:
            data["_id"] = domain_model.id
        return data
    
    async def create(self, entity: T) -> T:
        """Create a new entity."""
        if entity.id is None:
            entity.id = str(uuid.uuid4())
        entity.created_at = datetime.utcnow()
        entity.updated_at = datetime.utcnow()
        
        doc = self._to_db(entity)
        await self.collection.insert_one(doc)
        return entity
    
    async def get_by_id(self, entity_id: str) -> Optional[T]:
        """Get an entity by ID."""
        doc = await self.collection.find_one({"_id": entity_id})
        return self._to_domain(doc) if doc else None
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination."""
        cursor = self.collection.find().skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in docs]
    
    async def update(self, entity_id: str, entity: T) -> Optional[T]:
        """Update an existing entity."""
        data = entity.model_dump(exclude={"id", "created_at"})
        data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": entity_id},
            {"$set": data}
        )
        if result.modified_count > 0:
            return await self.get_by_id(entity_id)
        return None
    
    async def delete(self, entity_id: str) -> bool:
        """Delete an entity by ID."""
        result = await self.collection.delete_one({"_id": entity_id})
        return result.deleted_count > 0
    
    async def find_by(self, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[T]:
        """Find entities by filters."""
        cursor = self.collection.find(filters).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_domain(doc) for doc in docs]
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count entities matching filters."""
        return await self.collection.count_documents(filters or {})


class MongoDBProductRepository(MongoDBRepository[Product]):
    """MongoDB product repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "products", Product)
        # Create index on name
        database["products"].create_index([("name", ASCENDING)], unique=True)
    
    async def get_by_name(self, name: str) -> Optional[Product]:
        """Get a product by name."""
        doc = await self.collection.find_one({"name": name})
        return self._to_domain(doc) if doc else None


class MongoDBCostRepository(MongoDBRepository[CostItem]):
    """MongoDB cost repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "cost_items", CostItem)
        # Create indexes
        database["cost_items"].create_index([("product_id", ASCENDING)])
        database["cost_items"].create_index([("scenario_id", ASCENDING)])
    
    async def get_by_product(self, product_id: str, scenario_id: Optional[str] = None) -> List[CostItem]:
        """Get all cost items for a product."""
        filters: Dict[str, Any] = {"product_id": product_id}
        if scenario_id:
            filters["scenario_id"] = scenario_id
        return await self.find_by(filters)
    
    async def get_by_scenario(self, scenario_id: str) -> List[CostItem]:
        """Get all cost items for a scenario."""
        return await self.find_by({"scenario_id": scenario_id})
    
    async def get_totals_by_product(self, scenario_id: Optional[str] = None) -> Dict[str, float]:
        """Get total costs grouped by product ID."""
        pipeline = [
            {"$group": {"_id": "$product_id", "total": {"$sum": "$amount"}}}
        ]
        if scenario_id:
            pipeline.insert(0, {"$match": {"scenario_id": scenario_id}})
        
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        return {result["_id"]: float(result["total"]) for result in results}
    
    async def get_totals_by_scenario(self, product_id: Optional[str] = None) -> Dict[str, float]:
        """Get total costs grouped by scenario ID."""
        pipeline = [
            {"$group": {"_id": "$scenario_id", "total": {"$sum": "$amount"}}}
        ]
        if product_id:
            pipeline.insert(0, {"$match": {"product_id": product_id}})
        
        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        return {result["_id"]: float(result["total"]) for result in results}


class MongoDBUnifiedCostRepository(MongoDBRepository[Cost]):
    """MongoDB unified cost repository (new Cost model)."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "costs", Cost)
        # Create indexes
        database["costs"].create_index([("product_id", ASCENDING)])
        database["costs"].create_index([("scope", ASCENDING)])
        database["costs"].create_index([("scope_id", ASCENDING)])
        database["costs"].create_index([("category", ASCENDING)])
        database["costs"].create_index([("cost_type", ASCENDING)])
        database["costs"].create_index([("recurrence", ASCENDING)])
    
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


class MongoDBCostCategoryRepository(MongoDBRepository[CostCategory]):
    """MongoDB cost category repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "cost_categories", CostCategory)


class MongoDBCostScenarioRepository(MongoDBRepository[CostScenario]):
    """MongoDB cost scenario repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "cost_scenarios", CostScenario)
        # Create unique index on name
        database["cost_scenarios"].create_index([("name", ASCENDING)], unique=True)


class MongoDBCostTypeRepository(MongoDBRepository[CostType]):
    """MongoDB cost type repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "cost_types", CostType)
        # Create unique index on name
        database["cost_types"].create_index([("name", ASCENDING)], unique=True)


class MongoDBInsightRepository(MongoDBRepository[Insight]):
    """MongoDB insight repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "insights", Insight)
        # Create indexes
        database["insights"].create_index([("product_id", ASCENDING)])
        database["insights"].create_index([("module_id", ASCENDING)])
        database["insights"].create_index([("feature_id", ASCENDING)])
        database["insights"].create_index([("status", ASCENDING)])
        database["insights"].create_index([("source", ASCENDING)])
    
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


class MongoDBFeatureRepository(MongoDBRepository[Feature]):
    """MongoDB feature repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "features", Feature)
        # Create indexes
        database["features"].create_index([("product_id", ASCENDING)])
        database["features"].create_index([("module_id", ASCENDING)])
        database["features"].create_index([("parent_feature_id", ASCENDING)])
        database["features"].create_index([("owner", ASCENDING)])
        database["features"].create_index([("status", ASCENDING)])
        database["features"].create_index([("rice_score", ASCENDING)])
    
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
            # Return features where product_id matches and module_id is None or doesn't exist
            # Use MongoDB query to match both None and missing fields
            query = {
                "product_id": product_id,
                "$or": [
                    {"module_id": None},
                    {"module_id": {"$exists": False}}
                ]
            }
            cursor = self.collection.find(query)
            docs = await cursor.to_list(length=None)
            return [self._to_domain(doc) for doc in docs if doc]
    
    async def get_by_parent(self, parent_feature_id: str) -> List[Feature]:
        """Get all child features of a parent feature."""
        return await self.find_by({"parent_feature_id": parent_feature_id})
    
    async def get_by_owner(self, owner: str) -> List[Feature]:
        """Get all features owned by a specific owner."""
        return await self.find_by({"owner": owner})


class MongoDBResourceRepository(MongoDBRepository[Resource]):
    """MongoDB resource repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "resources", Resource)
        # Create indexes
        database["resources"].create_index([("type", ASCENDING)])
        database["resources"].create_index([("skills", ASCENDING)])
    
    async def get_by_type(self, resource_type: str) -> List[Resource]:
        """Get all resources of a specific type."""
        return await self.find_by({"type": resource_type})
    
    async def get_by_skill(self, skill: str) -> List[Resource]:
        """Get all resources with a specific skill."""
        # MongoDB $in operator finds documents where skill is in the skills array
        return await self.find_by({"skills": skill})


class MongoDBWorkstreamRepository(MongoDBRepository[Workstream]):
    """MongoDB workstream repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "workstreams", Workstream)
        # Create indexes
        database["workstreams"].create_index([("product_id", ASCENDING)])
        database["workstreams"].create_index([("order", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[Workstream]:
        """Get all workstreams for a product."""
        workstreams = await self.find_by({"product_id": product_id})
        return sorted(workstreams, key=lambda w: w.order)


class MongoDBPhaseRepository(MongoDBRepository[Phase]):
    """MongoDB phase repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "phases", Phase)
        # Create indexes
        database["phases"].create_index([("order", ASCENDING)])
    
    async def get_all_ordered(self) -> List[Phase]:
        """Get all phases ordered by order field."""
        all_phases = await self.get_all()
        return sorted(all_phases, key=lambda p: p.order)


class MongoDBTaskRepository(MongoDBRepository[Task]):
    """MongoDB task repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "tasks", Task)
        # Create indexes
        database["tasks"].create_index([("product_id", ASCENDING)])
        database["tasks"].create_index([("module_id", ASCENDING)])
        database["tasks"].create_index([("feature_id", ASCENDING)])
        database["tasks"].create_index([("capability_id", ASCENDING)])
        database["tasks"].create_index([("workstream_id", ASCENDING)])
        database["tasks"].create_index([("phase_id", ASCENDING)])
        database["tasks"].create_index([("status", ASCENDING)])
        database["tasks"].create_index([("priority", ASCENDING)])
        database["tasks"].create_index([("assignee_ids", ASCENDING)])
        database["tasks"].create_index([("depends_on_task_ids", ASCENDING)])  # Legacy
        database["tasks"].create_index([("dependencies", ASCENDING)])
    
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
        # MongoDB $in operator finds documents where task_id is in the dependencies array
        # Also check depends_on_task_ids for backward compatibility
        return await self.find_by({
            "$or": [
                {"dependencies": task_id},
                {"depends_on_task_ids": task_id}
            ]
        })
    
    async def get_by_assignee(self, resource_id: str) -> List[Task]:
        """Get all tasks assigned to a resource."""
        # MongoDB $in operator finds documents where resource_id is in the assignee_ids array
        return await self.find_by({"assignee_ids": resource_id})
    
    async def get_by_status(self, status: str) -> List[Task]:
        """Get all tasks with a specific status."""
        return await self.find_by({"status": status})


class MongoDBStrategyRepository(MongoDBRepository[Strategy]):
    """MongoDB strategy repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "strategies", Strategy)
        # Create indexes
        database["strategies"].create_index([("product_id", ASCENDING)])
        database["strategies"].create_index([("module_id", ASCENDING)])
        database["strategies"].create_index([("type", ASCENDING)])
        database["strategies"].create_index([("status", ASCENDING)])
    
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


class MongoDBProblemRepository(MongoDBRepository[Problem]):
    """MongoDB problem repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "problems", Problem)
        # Create indexes
        database["problems"].create_index([("product_id", ASCENDING)])
        database["problems"].create_index([("module_id", ASCENDING)])
        database["problems"].create_index([("status", ASCENDING)])
        database["problems"].create_index([("priority", ASCENDING)])
        database["problems"].create_index([("feature_id", ASCENDING)])
    
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


class MongoDBInterviewRepository(MongoDBRepository[Interview]):
    """MongoDB interview repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "interviews", Interview)
        # Create indexes
        database["interviews"].create_index([("product_id", ASCENDING)])
        database["interviews"].create_index([("module_id", ASCENDING)])
        database["interviews"].create_index([("date", ASCENDING)])
    
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


class MongoDBDecisionRepository(MongoDBRepository[Decision]):
    """MongoDB decision repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "decisions", Decision)
        # Create indexes
        database["decisions"].create_index([("product_id", ASCENDING)])
        database["decisions"].create_index([("module_id", ASCENDING)])
        database["decisions"].create_index([("entity_type", ASCENDING)])
        database["decisions"].create_index([("entity_id", ASCENDING)])
        database["decisions"].create_index([("decision_maker", ASCENDING)])
        database["decisions"].create_index([("outcome", ASCENDING)])
    
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


class MongoDBReleaseRepository(MongoDBRepository[Release]):
    """MongoDB release repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "releases", Release)
        # Create indexes
        database["releases"].create_index([("product_id", ASCENDING)])
        database["releases"].create_index([("module_id", ASCENDING)])
        database["releases"].create_index([("status", ASCENDING)])
        database["releases"].create_index([("target_date", ASCENDING)])
    
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


class MongoDBStakeholderRepository(MongoDBRepository[Stakeholder]):
    """MongoDB stakeholder repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "stakeholders", Stakeholder)
        # Create indexes
        database["stakeholders"].create_index([("product_id", ASCENDING)])
        database["stakeholders"].create_index([("module_id", ASCENDING)])
        database["stakeholders"].create_index([("email", ASCENDING)])
    
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


class MongoDBStatusReportRepository(MongoDBRepository[StatusReport]):
    """MongoDB status report repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "status_reports", StatusReport)
        # Create indexes
        database["status_reports"].create_index([("product_id", ASCENDING)])
        database["status_reports"].create_index([("module_id", ASCENDING)])
        database["status_reports"].create_index([("report_date", ASCENDING)])
    
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


class MongoDBMetricRepository(MongoDBRepository[Metric]):
    """MongoDB metric repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "metrics", Metric)
        # Create indexes
        database["metrics"].create_index([("product_id", ASCENDING)])
        database["metrics"].create_index([("module_id", ASCENDING)])
        database["metrics"].create_index([("scope", ASCENDING)])
        database["metrics"].create_index([("scope_id", ASCENDING)])
        database["metrics"].create_index([("metric_type", ASCENDING)])
    
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


class MongoDBOutcomeRepository(MongoDBRepository[Outcome]):
    """MongoDB outcome repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "outcomes", Outcome)
        # Create indexes
        database["outcomes"].create_index([("product_id", ASCENDING)])
        database["outcomes"].create_index([("feature_id", ASCENDING)])
        database["outcomes"].create_index([("metric_id", ASCENDING)])
        database["outcomes"].create_index([("status", ASCENDING)])
    
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


class MongoDBModuleRepository(MongoDBRepository[Module]):
    """MongoDB module repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "modules", Module)
        # Create indexes
        database["modules"].create_index([("product_id", ASCENDING)])
        database["modules"].create_index([("owner_id", ASCENDING)])
        database["modules"].create_index([("name", ASCENDING)])
        database["modules"].create_index([("is_default", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[Module]:
        """Get all modules for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_owner(self, owner_id: str) -> List[Module]:
        """Get all modules owned by a user."""
        return await self.find_by({"owner_id": owner_id})
    
    async def get_default(self, product_id: str) -> Optional[Module]:
        """Get the default module for a product."""
        modules = await self.find_by({"product_id": product_id, "is_default": True})
        return modules[0] if modules else None


class MongoDBPrioritizationModelRepository(MongoDBRepository[PrioritizationModel]):
    """MongoDB prioritization model repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "prioritization_models", PrioritizationModel)
        # Create indexes
        database["prioritization_models"].create_index([("product_id", ASCENDING)])
        database["prioritization_models"].create_index([("module_id", ASCENDING)])
        database["prioritization_models"].create_index([("is_active", ASCENDING)])
        database["prioritization_models"].create_index([("type", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[PrioritizationModel]:
        """Get all prioritization models for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_active(self, product_id: str) -> Optional[PrioritizationModel]:
        """Get the active prioritization model for a product."""
        models = await self.find_by({"product_id": product_id, "is_active": True})
        return models[0] if models else None
    
    async def get_by_module(self, module_id: str) -> List[PrioritizationModel]:
        """Get all prioritization models for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[PrioritizationModel]:
        """Get prioritization models for a product, optionally filtered by module. If module_id is None, returns all product-level models."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class MongoDBPriorityScoreRepository(MongoDBRepository[PriorityScore]):
    """MongoDB priority score repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "priority_scores", PriorityScore)
        # Create indexes
        database["priority_scores"].create_index([("product_id", ASCENDING)])
        database["priority_scores"].create_index([("module_id", ASCENDING)])
        database["priority_scores"].create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING)])
        database["priority_scores"].create_index([("calculated_at", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[PriorityScore]:
        """Get all priority scores for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_entity(self, entity_type: str, entity_id: str) -> List[PriorityScore]:
        """Get all priority scores for a specific entity."""
        return await self.find_by({"entity_type": entity_type, "entity_id": entity_id})
    
    async def get_latest(self, entity_type: str, entity_id: str) -> Optional[PriorityScore]:
        """Get the latest priority score for an entity."""
        scores = await self.find_by({"entity_type": entity_type, "entity_id": entity_id})
        if scores:
            # Sort by calculated_at descending and return the first
            scores.sort(key=lambda s: s.calculated_at if s.calculated_at else datetime.min, reverse=True)
            return scores[0]
        return None
    
    async def get_by_module(self, module_id: str) -> List[PriorityScore]:
        """Get all priority scores for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[PriorityScore]:
        """Get priority scores for a product, optionally filtered by module. If module_id is None, returns all product-level scores."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class MongoDBRoadmapRepository(MongoDBRepository[Roadmap]):
    """MongoDB roadmap repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "roadmaps", Roadmap)
        # Create indexes
        database["roadmaps"].create_index([("product_id", ASCENDING)])
        database["roadmaps"].create_index([("module_id", ASCENDING)])
        database["roadmaps"].create_index([("is_active", ASCENDING)])
        database["roadmaps"].create_index([("type", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[Roadmap]:
        """Get all roadmaps for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_active(self, product_id: str) -> Optional[Roadmap]:
        """Get the active roadmap for a product."""
        roadmaps = await self.find_by({"product_id": product_id, "is_active": True})
        return roadmaps[0] if roadmaps else None
    
    async def get_by_module(self, module_id: str) -> List[Roadmap]:
        """Get all roadmaps for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Roadmap]:
        """Get roadmaps for a product, optionally filtered by module. If module_id is None, returns all product-level roadmaps."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})


class MongoDBRevenueModelRepository(MongoDBRepository[RevenueModel]):
    """MongoDB revenue model repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "revenue_models", RevenueModel)
        # Create indexes
        database["revenue_models"].create_index([("product_id", ASCENDING)])
        database["revenue_models"].create_index([("is_active", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[RevenueModel]:
        """Get all revenue models for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_active(self, product_id: str) -> Optional[RevenueModel]:
        """Get the active revenue model for a product."""
        models = await self.find_by({"product_id": product_id, "is_active": True})
        return models[0] if models else None


class MongoDBPricingTierRepository(MongoDBRepository[PricingTier]):
    """MongoDB pricing tier repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "pricing_tiers", PricingTier)
        # Create indexes
        database["pricing_tiers"].create_index([("product_id", ASCENDING)])
        database["pricing_tiers"].create_index([("revenue_model_id", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[PricingTier]:
        """Get all pricing tiers for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_revenue_model(self, revenue_model_id: str) -> List[PricingTier]:
        """Get all pricing tiers for a revenue model."""
        return await self.find_by({"revenue_model_id": revenue_model_id})


class MongoDBUsageMetricRepository(MongoDBRepository[UsageMetric]):
    """MongoDB usage metric repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "usage_metrics", UsageMetric)
        # Create indexes
        database["usage_metrics"].create_index([("product_id", ASCENDING)])
        database["usage_metrics"].create_index([("metric_type", ASCENDING)])
        database["usage_metrics"].create_index([("period_start", ASCENDING), ("period_end", ASCENDING)])
    
    async def get_by_product(self, product_id: str) -> List[UsageMetric]:
        """Get all usage metrics for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_type(self, product_id: str, metric_type: str) -> List[UsageMetric]:
        """Get all usage metrics of a specific type for a product."""
        return await self.find_by({"product_id": product_id, "metric_type": metric_type})


class MongoDBNotificationRepository(MongoDBRepository[Notification]):
    """MongoDB notification repository."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, "notifications", Notification)
        # Create indexes
        database["notifications"].create_index([("user_id", ASCENDING)])
        database["notifications"].create_index([("read", ASCENDING)])
        database["notifications"].create_index([("created_at", ASCENDING)])
    
    async def get_by_user(self, user_id: str) -> List[Notification]:
        """Get all notifications for a user."""
        return await self.find_by({"user_id": user_id})
    
    async def get_unread(self, user_id: str) -> List[Notification]:
        """Get all unread notifications for a user."""
        return await self.find_by({"user_id": user_id, "read": False})
    
    async def mark_as_read(self, notification_id: str) -> bool:
        """Mark a notification as read."""
        notification = await self.get_by_id(notification_id)
        if notification:
            notification.read = True
            await self.update(notification_id, notification)
            return True
        return False


# MongoDB connection management
_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None
_cached_url: Optional[str] = None


def reset_mongodb_connection():
    """Reset MongoDB connection cache to force reconnection with new config."""
    global _client, _database, _cached_url
    if _client is not None:
        _client.close()
    _client = None
    _database = None
    _cached_url = None


def get_mongodb_client() -> AsyncIOMotorClient:
    """Get or create MongoDB client."""
    global _client, _cached_url
    # Recreate client if URL has changed
    if _client is None or _cached_url != db_config.database_url:
        if _client is not None:
            _client.close()
        _cached_url = db_config.database_url
        print(f"🔌 Connecting to MongoDB at: {_cached_url[:50]}...")  # Debug log
        _client = AsyncIOMotorClient(_cached_url)
    return _client


def get_mongodb_database() -> AsyncIOMotorDatabase:
    """Get or create MongoDB database."""
    global _database
    if _database is None:
        client = get_mongodb_client()
        # Extract database name from URL or use default
        db_name = "finops"  # Default database name
        if "/" in db_config.database_url:
            parts = db_config.database_url.rsplit("/", 1)
            if len(parts) > 1 and parts[1]:
                # Extract database name (part before query params)
                potential_db_name = parts[1].split("?")[0].strip()
                # Only use it if it's not empty and doesn't start with ? (query params)
                if potential_db_name and not potential_db_name.startswith("?"):
                    db_name = potential_db_name
        _database = client[db_name]
    return _database


async def init_mongodb():
    """Initialize MongoDB (create indexes)."""
    database = get_mongodb_database()
    # Indexes are created in repository constructors
    pass

