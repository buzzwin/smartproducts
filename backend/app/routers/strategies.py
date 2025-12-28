"""Strategy API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    StrategyCreate,
    StrategyResponse,
    StrategyUpdate,
)
from database.models.base_models import Strategy

router = APIRouter(prefix="/api/strategies", tags=["strategies"])


@router.get("", response_model=List[StrategyResponse])
async def get_strategies(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    strategy_type: Optional[str] = Query(None, description="Filter by type (vision, strategy, okr)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all strategies with optional filters. If module_id is provided, returns module-specific strategies. If product_id is provided without module_id, returns all product-level strategies."""
    repo = RepositoryFactory.get_strategy_repository(session)
    
    if product_id:
        if module_id:
            # Get module-specific strategies
            strategies = await repo.get_by_product_or_module(product_id, module_id)
        else:
            # Get product-level strategies (module_id is None)
            strategies = await repo.get_by_product_or_module(product_id, None)
        
        # Apply additional filters
        if strategy_type:
            strategies = [s for s in strategies if s.type == strategy_type]
        if status:
            strategies = [s for s in strategies if s.status == status]
    elif strategy_type:
        strategies = await repo.get_by_type(strategy_type)
        if status:
            strategies = [s for s in strategies if s.status == status]
    elif status:
        strategies = await repo.get_by_status(status)
    else:
        strategies = await repo.get_all()
    
    return [StrategyResponse(**s.model_dump()) for s in strategies]


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(strategy_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a strategy by ID."""
    repo = RepositoryFactory.get_strategy_repository(session)
    strategy = await repo.get_by_id(strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return StrategyResponse(**strategy.model_dump())


@router.post("", response_model=StrategyResponse, status_code=201)
async def create_strategy(strategy: StrategyCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new strategy."""
    repo = RepositoryFactory.get_strategy_repository(session)
    
    # Validate strategy type
    if strategy.type not in ["vision", "goals", "themes", "assumptions", "risks", "strategy", "okr"]:
        raise HTTPException(status_code=400, detail="Type must be 'vision', 'goals', 'themes', 'assumptions', 'risks', 'strategy', or 'okr'")
    
    # Validate status
    if strategy.status not in ["draft", "active", "archived"]:
        raise HTTPException(status_code=400, detail="Status must be 'draft', 'active', or 'archived'")
    
    strategy_model = Strategy(**strategy.model_dump())
    created = await repo.create(strategy_model)
    return StrategyResponse(**created.model_dump())


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: str,
    strategy_update: StrategyUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a strategy."""
    repo = RepositoryFactory.get_strategy_repository(session)
    strategy = await repo.get_by_id(strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Validate type if provided
    if strategy_update.type and strategy_update.type not in ["vision", "goals", "themes", "assumptions", "risks", "strategy", "okr"]:
        raise HTTPException(status_code=400, detail="Type must be 'vision', 'goals', 'themes', 'assumptions', 'risks', 'strategy', or 'okr'")
    
    # Validate status if provided
    if strategy_update.status and strategy_update.status not in ["draft", "active", "archived"]:
        raise HTTPException(status_code=400, detail="Status must be 'draft', 'active', or 'archived'")
    
    # Update fields
    update_data = strategy_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(strategy, key, value)
    
    updated = await repo.update(strategy)
    return StrategyResponse(**updated.model_dump())


@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(strategy_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a strategy."""
    repo = RepositoryFactory.get_strategy_repository(session)
    strategy = await repo.get_by_id(strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    await repo.delete(strategy_id)
    return None


@router.get("/product/{product_id}", response_model=List[StrategyResponse])
async def get_strategies_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level strategies."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all strategies for a product. If module_id is provided, returns module-specific strategies. Otherwise returns all product-level strategies."""
    repo = RepositoryFactory.get_strategy_repository(session)
    strategies = await repo.get_by_product_or_module(product_id, module_id)
    return [StrategyResponse(**s.model_dump()) for s in strategies]

