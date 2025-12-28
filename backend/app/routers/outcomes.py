"""Outcome API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    OutcomeCreate,
    OutcomeResponse,
    OutcomeUpdate,
)
from database.models.base_models import Outcome

router = APIRouter(prefix="/api/outcomes", tags=["outcomes"])


@router.get("", response_model=List[OutcomeResponse])
async def get_outcomes(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    metric_id: Optional[str] = Query(None, description="Filter by metric ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all outcomes with optional filters."""
    repo = RepositoryFactory.get_outcome_repository(session)
    
    if product_id:
        outcomes = await repo.get_by_product(product_id)
    elif feature_id:
        outcomes = await repo.get_by_feature(feature_id)
    elif metric_id:
        outcomes = await repo.get_by_metric(metric_id)
    elif status:
        outcomes = await repo.get_by_status(status)
    else:
        outcomes = await repo.get_all()
    
    return [OutcomeResponse(**o.model_dump()) for o in outcomes]


@router.get("/{outcome_id}", response_model=OutcomeResponse)
async def get_outcome(outcome_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get an outcome by ID."""
    repo = RepositoryFactory.get_outcome_repository(session)
    outcome = await repo.get_by_id(outcome_id)
    if not outcome:
        raise HTTPException(status_code=404, detail="Outcome not found")
    return OutcomeResponse(**outcome.model_dump())


@router.post("", response_model=OutcomeResponse, status_code=201)
async def create_outcome(outcome: OutcomeCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new outcome."""
    repo = RepositoryFactory.get_outcome_repository(session)
    
    # Validate status
    if outcome.status not in ["pending", "achieved", "not_achieved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    outcome_model = Outcome(**outcome.model_dump())
    created = await repo.create(outcome_model)
    return OutcomeResponse(**created.model_dump())


@router.put("/{outcome_id}", response_model=OutcomeResponse)
async def update_outcome(
    outcome_id: str,
    outcome_update: OutcomeUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update an outcome."""
    repo = RepositoryFactory.get_outcome_repository(session)
    outcome = await repo.get_by_id(outcome_id)
    if not outcome:
        raise HTTPException(status_code=404, detail="Outcome not found")
    
    # Validate status if provided
    if outcome_update.status and outcome_update.status not in ["pending", "achieved", "not_achieved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = outcome_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(outcome, key, value)
    
    updated = await repo.update(outcome)
    return OutcomeResponse(**updated.model_dump())


@router.delete("/{outcome_id}", status_code=204)
async def delete_outcome(outcome_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete an outcome."""
    repo = RepositoryFactory.get_outcome_repository(session)
    outcome = await repo.get_by_id(outcome_id)
    if not outcome:
        raise HTTPException(status_code=404, detail="Outcome not found")
    
    await repo.delete(outcome_id)
    return None


@router.get("/product/{product_id}", response_model=List[OutcomeResponse])
async def get_outcomes_by_product(product_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get all outcomes for a product."""
    repo = RepositoryFactory.get_outcome_repository(session)
    outcomes = await repo.get_by_product(product_id)
    return [OutcomeResponse(**o.model_dump()) for o in outcomes]

