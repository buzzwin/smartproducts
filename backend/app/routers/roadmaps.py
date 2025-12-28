"""Roadmap API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    RoadmapCreate,
    RoadmapResponse,
    RoadmapUpdate,
)
from database.models.base_models import Roadmap

router = APIRouter(prefix="/api/roadmaps", tags=["roadmaps"])


@router.get("", response_model=List[RoadmapResponse])
async def get_roadmaps(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    roadmap_type: Optional[str] = Query(None, description="Filter by roadmap type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all roadmaps with optional filters. If module_id is provided, returns module-specific roadmaps. If product_id is provided without module_id, returns all product-level roadmaps."""
    repo = RepositoryFactory.get_roadmap_repository(session)
    
    if product_id:
        roadmaps = await repo.get_by_product_or_module(product_id, module_id)
    else:
        roadmaps = await repo.get_all()
    
    # Apply additional filters
    if roadmap_type:
        roadmaps = [r for r in roadmaps if r.type == roadmap_type]
    if is_active is not None:
        roadmaps = [r for r in roadmaps if r.is_active == is_active]
    
    return [RoadmapResponse(**r.model_dump()) for r in roadmaps]


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(
    roadmap_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific roadmap."""
    repo = RepositoryFactory.get_roadmap_repository(session)
    roadmap = await repo.get_by_id(roadmap_id)
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    return RoadmapResponse(**roadmap.model_dump())


@router.post("", response_model=RoadmapResponse, status_code=201)
async def create_roadmap(
    roadmap: RoadmapCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new roadmap."""
    repo = RepositoryFactory.get_roadmap_repository(session)
    
    roadmap_obj = Roadmap(**roadmap.model_dump())
    created = await repo.create(roadmap_obj)
    
    return RoadmapResponse(**created.model_dump())


@router.put("/{roadmap_id}", response_model=RoadmapResponse)
async def update_roadmap(
    roadmap_id: str,
    roadmap_update: RoadmapUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a roadmap."""
    repo = RepositoryFactory.get_roadmap_repository(session)
    
    existing = await repo.get_by_id(roadmap_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Update fields
    update_data = roadmap_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(roadmap_id, existing)
    return RoadmapResponse(**updated.model_dump())


@router.delete("/{roadmap_id}", status_code=204)
async def delete_roadmap(
    roadmap_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a roadmap."""
    repo = RepositoryFactory.get_roadmap_repository(session)
    
    existing = await repo.get_by_id(roadmap_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    await repo.delete(roadmap_id)
    return None


@router.get("/product/{product_id}/active")
async def get_active_roadmaps(
    product_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get all active roadmaps for a product."""
    repo = RepositoryFactory.get_roadmap_repository(session)
    
    roadmaps = await repo.get_active_by_product(product_id)
    
    return [RoadmapResponse(**r.model_dump()) for r in roadmaps]

