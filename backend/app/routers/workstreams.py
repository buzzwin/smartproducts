"""Workstream API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    WorkstreamCreate,
    WorkstreamResponse,
    WorkstreamUpdate,
)
from database.models.base_models import Workstream

router = APIRouter(prefix="/api/workstreams", tags=["workstreams"])


@router.get("", response_model=List[WorkstreamResponse])
async def get_workstreams(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all workstreams with optional filters."""
    repo = RepositoryFactory.get_workstream_repository(session)
    
    if product_id:
        workstreams = await repo.get_by_product(product_id)
    else:
        workstreams = await repo.get_all()
    
    return [WorkstreamResponse(**w.model_dump()) for w in workstreams]


@router.get("/{workstream_id}", response_model=WorkstreamResponse)
async def get_workstream(workstream_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a workstream by ID."""
    repo = RepositoryFactory.get_workstream_repository(session)
    workstream = await repo.get_by_id(workstream_id)
    if not workstream:
        raise HTTPException(status_code=404, detail="Workstream not found")
    return WorkstreamResponse(**workstream.model_dump())


@router.post("", response_model=WorkstreamResponse, status_code=201)
async def create_workstream(workstream: WorkstreamCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new workstream."""
    repo = RepositoryFactory.get_workstream_repository(session)
    
    # Validate product exists
    product_repo = RepositoryFactory.get_product_repository(session)
    product = await product_repo.get_by_id(workstream.product_id)
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    
    workstream_model = Workstream(**workstream.model_dump())
    created = await repo.create(workstream_model)
    return WorkstreamResponse(**created.model_dump())


@router.put("/{workstream_id}", response_model=WorkstreamResponse)
async def update_workstream(workstream_id: str, workstream_update: WorkstreamUpdate, session: AsyncSession = Depends(get_db_session)):
    """Update a workstream."""
    repo = RepositoryFactory.get_workstream_repository(session)
    
    existing = await repo.get_by_id(workstream_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Workstream not found")
    
    # Update fields
    update_data = workstream_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(workstream_id, existing)
    return WorkstreamResponse(**updated.model_dump())


@router.delete("/{workstream_id}", status_code=204)
async def delete_workstream(workstream_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a workstream."""
    repo = RepositoryFactory.get_workstream_repository(session)
    
    success = await repo.delete(workstream_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workstream not found")

