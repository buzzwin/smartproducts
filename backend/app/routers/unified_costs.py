"""Unified Cost API routes (new Cost model)."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    CostCreate,
    CostResponse,
    CostUpdate,
)
from database.models.base_models import Cost
from app.services.resource_cost_service import ResourceCostService

router = APIRouter(prefix="/api/unified-costs", tags=["unified-costs"])


@router.get("", response_model=List[CostResponse])
async def get_costs(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    scope: Optional[str] = Query(None, description="Filter by scope (task, capability, product, shared)"),
    scope_id: Optional[str] = Query(None, description="Filter by scope ID"),
    category: Optional[str] = Query(None, description="Filter by category (build, run, maintain, scale, overhead)"),
    cost_type: Optional[str] = Query(None, description="Filter by cost type (labor, infra, license, vendor, other)"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    cost_classification: Optional[str] = Query(None, description="Filter by cost classification (run or change)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all costs with optional filters."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    if product_id and scope and scope_id:
        costs = await repo.get_by_scope_id(product_id, scope, scope_id)
    elif product_id and scope:
        costs = await repo.get_by_scope(product_id, scope)
    elif product_id and category:
        costs = await repo.get_by_category(product_id, category)
    elif product_id:
        costs = await repo.get_by_product(product_id)
    else:
        costs = await repo.get_all()
    
    # Apply additional filters
    if module_id is not None:
        costs = [c for c in costs if c.module_id == module_id]
    if cost_type:
        costs = [c for c in costs if c.cost_type == cost_type]
    if resource_id:
        costs = [c for c in costs if c.resource_id == resource_id]
    if feature_id:
        # Filter costs where scope is "task" and scope_id matches a task with this feature_id
        # Or if scope is "feature" and scope_id matches feature_id
        task_repo = RepositoryFactory.get_task_repository(session)
        tasks = await task_repo.get_by_feature(feature_id)
        task_ids = [t.id for t in tasks]
        costs = [
            c for c in costs
            if (c.scope == "task" and c.scope_id in task_ids) or
               (c.scope == "feature" and c.scope_id == feature_id)
        ]
    if cost_classification:
        # Filter by cost_classification - this requires checking related entities
        # For now, we'll filter by checking if cost is linked to tasks/features with this classification
        if cost_classification not in ["run", "change"]:
            raise HTTPException(
                status_code=400,
                detail="cost_classification must be 'run' or 'change'"
            )
        # Note: Direct costs don't have classification, only task/feature-based costs do
        # This filter will be more effective when combined with task-costs or feature-costs endpoints
        filtered_costs = []
        for cost in costs:
            # If cost has a scope_id that's a task or feature, check its classification
            if cost.scope == "task" and cost.scope_id:
                task_repo = RepositoryFactory.get_task_repository(session)
                task = await task_repo.get_by_id(cost.scope_id)
                if task and task.cost_classification == cost_classification:
                    filtered_costs.append(cost)
            elif cost.scope == "feature" and cost.scope_id:
                feature_repo = RepositoryFactory.get_feature_repository(session)
                feature = await feature_repo.get_by_id(cost.scope_id)
                if feature and feature.cost_classification == cost_classification:
                    filtered_costs.append(cost)
            # For direct costs without classification, we can't filter
        costs = filtered_costs
    
    return [CostResponse(**c.model_dump()) for c in costs]


@router.get("/{cost_id}", response_model=CostResponse)
async def get_cost(
    cost_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific cost."""
    repo = RepositoryFactory.get_cost_repository(session)
    cost = await repo.get_by_id(cost_id)
    
    if not cost:
        raise HTTPException(status_code=404, detail="Cost not found")
    
    return CostResponse(**cost.model_dump())


@router.post("", response_model=CostResponse, status_code=201)
async def create_cost(
    cost: CostCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new cost."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    cost_obj = Cost(**cost.model_dump())
    created = await repo.create(cost_obj)
    
    return CostResponse(**created.model_dump())


@router.put("/{cost_id}", response_model=CostResponse)
async def update_cost(
    cost_id: str,
    cost_update: CostUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a cost."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    existing = await repo.get_by_id(cost_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Cost not found")
    
    # Update fields
    update_data = cost_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(cost_id, existing)
    return CostResponse(**updated.model_dump())


@router.delete("/{cost_id}", status_code=204)
async def delete_cost(
    cost_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a cost."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    existing = await repo.get_by_id(cost_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Cost not found")
    
    await repo.delete(cost_id)
    return None


@router.get("/product/{product_id}/shared")
async def get_shared_costs(
    product_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get all shared costs for a product."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    costs = await repo.get_shared_costs(product_id)
    
    return [CostResponse(**c.model_dump()) for c in costs]


@router.get("/product/{product_id}/task-costs")
async def get_task_costs(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    cost_classification: Optional[str] = Query(None, description="Filter by cost classification (run or change)"),
    session: AsyncSession = Depends(get_db_session)
) -> List[Dict[str, Any]]:
    """Get calculated task costs from resource assignments."""
    if cost_classification and cost_classification not in ["run", "change"]:
        raise HTTPException(
            status_code=400,
            detail="cost_classification must be 'run' or 'change'"
        )
    
    task_costs = await ResourceCostService.calculate_task_costs(
        product_id=product_id,
        module_id=module_id,
        feature_id=feature_id,
        cost_classification=cost_classification,
        session=session
    )
    
    return task_costs


@router.get("/product/{product_id}/feature-costs")
async def get_feature_costs(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    cost_classification: Optional[str] = Query(None, description="Filter by cost classification (run or change)"),
    session: AsyncSession = Depends(get_db_session)
) -> List[Dict[str, Any]]:
    """Get calculated feature costs by summing task costs."""
    if cost_classification and cost_classification not in ["run", "change"]:
        raise HTTPException(
            status_code=400,
            detail="cost_classification must be 'run' or 'change'"
        )
    
    feature_costs = await ResourceCostService.calculate_feature_costs(
        product_id=product_id,
        module_id=module_id,
        cost_classification=cost_classification,
        session=session
    )
    
    return feature_costs


@router.get("/product/{product_id}/classification-summary")
async def get_classification_summary(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    session: AsyncSession = Depends(get_db_session)
) -> Dict[str, Any]:
    """Get cost summary grouped by classification (run vs change)."""
    summary = await ResourceCostService.calculate_classification_summary(
        product_id=product_id,
        module_id=module_id,
        session=session
    )
    
    return summary


@router.get("/product/{product_id}/resource-costs")
async def get_resource_costs(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    cost_classification: Optional[str] = Query(None, description="Filter by cost classification (run or change)"),
    session: AsyncSession = Depends(get_db_session)
) -> Dict[str, Any]:
    """Get resource costs from task assignments."""
    if cost_classification and cost_classification not in ["run", "change"]:
        raise HTTPException(
            status_code=400,
            detail="cost_classification must be 'run' or 'change'"
        )
    
    # Get task costs grouped by resource
    task_costs = await ResourceCostService.calculate_task_costs(
        product_id=product_id,
        module_id=module_id,
        cost_classification=cost_classification,
        session=session
    )
    
    # Also get direct resource costs from Cost model
    cost_repo = RepositoryFactory.get_cost_repository(session)
    all_costs = await cost_repo.get_by_product(product_id)
    direct_resource_costs = [c for c in all_costs if c.resource_id]
    
    if module_id:
        direct_resource_costs = [c for c in direct_resource_costs if c.module_id == module_id]
    
    # Group task costs by resource
    resource_task_costs = {}
    for task_cost in task_costs:
        for resource_id in task_cost.get("assignee_ids", []):
            if resource_id not in resource_task_costs:
                resource_task_costs[resource_id] = {
                    "resource_id": resource_id,
                    "estimated_cost": 0.0,
                    "total_cost": 0.0,
                    "tasks": []
                }
            resource_task_costs[resource_id]["estimated_cost"] += task_cost.get("estimated_cost", 0.0)
            resource_task_costs[resource_id]["total_cost"] += task_cost.get("total_cost", 0.0)
            resource_task_costs[resource_id]["tasks"].append(task_cost)
    
    return {
        "direct_resource_costs": [CostResponse(**c.model_dump()) for c in direct_resource_costs],
        "calculated_resource_costs": list(resource_task_costs.values())
    }

