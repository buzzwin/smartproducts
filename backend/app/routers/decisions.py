"""Decision API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    DecisionCreate,
    DecisionResponse,
    DecisionUpdate,
)
from database.models.base_models import Decision

router = APIRouter(prefix="/api/decisions", tags=["decisions"])


@router.get("", response_model=List[DecisionResponse])
async def get_decisions(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (problem, feature, capability)"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    decision_maker: Optional[str] = Query(None, description="Filter by decision maker"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (now, next, later, drop)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all decisions with optional filters. If module_id is provided, returns module-specific decisions. If product_id is provided without module_id, returns all product-level decisions."""
    repo = RepositoryFactory.get_decision_repository(session)
    
    if product_id:
        decisions = await repo.get_by_product_or_module(product_id, module_id)
    elif entity_type and entity_id:
        decisions = await repo.get_by_entity(entity_type, entity_id)
    elif decision_maker:
        decisions = await repo.get_by_decision_maker(decision_maker)
    else:
        decisions = await repo.get_all()
    
    # Apply additional filters
    if entity_type:
        decisions = [d for d in decisions if d.entity_type == entity_type]
    if entity_id:
        decisions = [d for d in decisions if d.entity_id == entity_id]
    if outcome:
        decisions = [d for d in decisions if d.outcome == outcome]
    
    return [DecisionResponse(**d.model_dump()) for d in decisions]


@router.get("/{decision_id}", response_model=DecisionResponse)
async def get_decision(decision_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a decision by ID."""
    repo = RepositoryFactory.get_decision_repository(session)
    decision = await repo.get_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return DecisionResponse(**decision.model_dump())


@router.post("", response_model=DecisionResponse, status_code=201)
async def create_decision(decision: DecisionCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new decision."""
    repo = RepositoryFactory.get_decision_repository(session)
    
    decision_model = Decision(**decision.model_dump())
    created = await repo.create(decision_model)
    return DecisionResponse(**created.model_dump())


@router.put("/{decision_id}", response_model=DecisionResponse)
async def update_decision(
    decision_id: str,
    decision_update: DecisionUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a decision."""
    repo = RepositoryFactory.get_decision_repository(session)
    decision = await repo.get_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    update_data = decision_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(decision, key, value)
    
    updated = await repo.update(decision)
    return DecisionResponse(**updated.model_dump())


@router.delete("/{decision_id}", status_code=204)
async def delete_decision(decision_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a decision."""
    repo = RepositoryFactory.get_decision_repository(session)
    decision = await repo.get_by_id(decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    await repo.delete(decision_id)
    return None


@router.get("/entity/{entity_type}/{entity_id}", response_model=List[DecisionResponse])
async def get_decisions_by_entity(
    entity_type: str,
    entity_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get all decisions for a specific entity."""
    repo = RepositoryFactory.get_decision_repository(session)
    decisions = await repo.get_by_entity(entity_type, entity_id)
    return [DecisionResponse(**d.model_dump()) for d in decisions]


@router.get("/product/{product_id}", response_model=List[DecisionResponse])
async def get_decisions_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level decisions."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all decisions for a product. If module_id is provided, returns module-specific decisions. Otherwise returns all product-level decisions."""
    repo = RepositoryFactory.get_decision_repository(session)
    decisions = await repo.get_by_product_or_module(product_id, module_id)
    return [DecisionResponse(**d.model_dump()) for d in decisions]


# Note: Prioritization calculation is now handled by PriorityScore model
# Use /api/priority-scores endpoint for creating priority scores

