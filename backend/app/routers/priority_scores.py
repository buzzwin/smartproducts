"""PriorityScore API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    PriorityScoreCreate,
    PriorityScoreResponse,
    PriorityScoreUpdate,
)
from database.models.base_models import PriorityScore

router = APIRouter(prefix="/api/priority-scores", tags=["priority-scores"])


@router.get("", response_model=List[PriorityScoreResponse])
async def get_priority_scores(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (problem, feature, capability)"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all priority scores with optional filters. If module_id is provided, returns module-specific scores. If product_id is provided without module_id, returns all product-level scores."""
    repo = RepositoryFactory.get_priority_score_repository(session)
    
    if product_id:
        scores = await repo.get_by_product_or_module(product_id, module_id)
    elif entity_type and entity_id:
        scores = await repo.get_by_entity(entity_type, entity_id)
    else:
        scores = await repo.get_all()
    
    # Apply additional filters
    if product_id and entity_type:
        scores = [s for s in scores if s.entity_type == entity_type]
    
    return [PriorityScoreResponse(**s.model_dump()) for s in scores]


@router.get("/{score_id}", response_model=PriorityScoreResponse)
async def get_priority_score(
    score_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific priority score."""
    repo = RepositoryFactory.get_priority_score_repository(session)
    score = await repo.get_by_id(score_id)
    
    if not score:
        raise HTTPException(status_code=404, detail="Priority score not found")
    
    return PriorityScoreResponse(**score.model_dump())


@router.post("", response_model=PriorityScoreResponse, status_code=201)
async def create_priority_score(
    score: PriorityScoreCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new priority score."""
    repo = RepositoryFactory.get_priority_score_repository(session)
    
    score_obj = PriorityScore(**score.model_dump())
    created = await repo.create(score_obj)
    
    return PriorityScoreResponse(**created.model_dump())


@router.put("/{score_id}", response_model=PriorityScoreResponse)
async def update_priority_score(
    score_id: str,
    score_update: PriorityScoreUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a priority score."""
    repo = RepositoryFactory.get_priority_score_repository(session)
    
    existing = await repo.get_by_id(score_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Priority score not found")
    
    # Update fields
    update_data = score_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(score_id, existing)
    return PriorityScoreResponse(**updated.model_dump())


@router.delete("/{score_id}", status_code=204)
async def delete_priority_score(
    score_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a priority score."""
    repo = RepositoryFactory.get_priority_score_repository(session)
    
    existing = await repo.get_by_id(score_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Priority score not found")
    
    await repo.delete(score_id)
    return None


@router.get("/entity/{entity_type}/{entity_id}/latest")
async def get_latest_priority_score(
    entity_type: str,
    entity_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get the latest priority score for a specific entity."""
    repo = RepositoryFactory.get_priority_score_repository(session)
    
    score = await repo.get_latest_by_entity(entity_type, entity_id)
    
    if not score:
        raise HTTPException(
            status_code=404,
            detail=f"No priority score found for {entity_type} {entity_id}"
        )
    
    return PriorityScoreResponse(**score.model_dump())

