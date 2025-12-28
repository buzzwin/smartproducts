"""Cost API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    CostItemCreate,
    CostItemResponse,
    CostItemUpdate,
    CostTotalsResponse,
)
from database.models.base_models import CostItem
from app.services.cost_service import CostService

router = APIRouter(prefix="/api/costs", tags=["costs"])


@router.get("", response_model=List[CostItemResponse])
async def get_costs(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    scenario_id: Optional[str] = Query(None, description="Filter by scenario ID"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all cost items with optional filters."""
    return await CostService.get_all_costs(product_id, scenario_id, session)


@router.get("/totals", response_model=CostTotalsResponse)
async def get_totals(
    product_id: Optional[str] = Query(None, description="Get totals for specific product"),
    scenario_id: Optional[str] = Query(None, description="Get totals for specific scenario"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get aggregated cost totals."""
    if product_id:
        totals = await CostService.get_totals_by_scenario(product_id, session)
        return CostTotalsResponse(product_id=product_id, scenario_id=None, totals=totals)
    elif scenario_id:
        totals = await CostService.get_totals_by_product(scenario_id, session)
        return CostTotalsResponse(product_id=None, scenario_id=scenario_id, totals=totals)
    else:
        # Get all totals by product
        totals = await CostService.get_totals_by_product(None, session)
        return CostTotalsResponse(product_id=None, scenario_id=None, totals=totals)


@router.get("/{cost_id}", response_model=CostItemResponse)
async def get_cost(cost_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a cost item by ID."""
    repo = RepositoryFactory.get_cost_repository(session)
    cost = await repo.get_by_id(cost_id)
    if not cost:
        raise HTTPException(status_code=404, detail="Cost item not found")
    return CostItemResponse(**cost.model_dump())


@router.post("", response_model=CostItemResponse, status_code=201)
async def create_cost(cost: CostItemCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new cost item."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    # Validate product exists
    product_repo = RepositoryFactory.get_product_repository(session)
    product = await product_repo.get_by_id(cost.product_id)
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    
    # Validate scenario exists
    scenario_repo = RepositoryFactory.get_cost_scenario_repository(session)
    scenario = await scenario_repo.get_by_id(cost.scenario_id)
    if not scenario:
        raise HTTPException(status_code=400, detail="Scenario not found")
    
    cost_model = CostItem(**cost.model_dump())
    created = await repo.create(cost_model)
    return CostItemResponse(**created.model_dump())


@router.put("/{cost_id}", response_model=CostItemResponse)
async def update_cost(cost_id: str, cost_update: CostItemUpdate, session: AsyncSession = Depends(get_db_session)):
    """Update a cost item."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    existing = await repo.get_by_id(cost_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Cost item not found")
    
    # Update fields
    update_data = cost_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(cost_id, existing)
    return CostItemResponse(**updated.model_dump())


@router.delete("/{cost_id}", status_code=204)
async def delete_cost(cost_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a cost item."""
    repo = RepositoryFactory.get_cost_repository(session)
    
    success = await repo.delete(cost_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cost item not found")

