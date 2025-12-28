"""Resource API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    ResourceCreate,
    ResourceResponse,
    ResourceUpdate,
)
from database.models.base_models import Resource

router = APIRouter(prefix="/api/resources", tags=["resources"])


@router.get("", response_model=List[ResourceResponse])
async def get_resources(
    type: Optional[str] = Query(None, description="Filter by type (individual or organization)"),
    skill: Optional[str] = Query(None, description="Filter by skill"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all resources with optional filters."""
    repo = RepositoryFactory.get_resource_repository(session)
    
    if type:
        if type not in ["individual", "organization"]:
            raise HTTPException(status_code=400, detail="Type must be 'individual' or 'organization'")
        resources = await repo.get_by_type(type)
    elif skill:
        resources = await repo.get_by_skill(skill)
    else:
        resources = await repo.get_all()
    
    return [ResourceResponse(**r.model_dump()) for r in resources]


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a resource by ID."""
    repo = RepositoryFactory.get_resource_repository(session)
    resource = await repo.get_by_id(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return ResourceResponse(**resource.model_dump())


@router.post("", response_model=ResourceResponse, status_code=201)
async def create_resource(resource: ResourceCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new resource."""
    repo = RepositoryFactory.get_resource_repository(session)
    
    # Validate type
    if resource.type not in ["individual", "organization"]:
        raise HTTPException(status_code=400, detail="Type must be 'individual' or 'organization'")
    
    resource_model = Resource(**resource.model_dump())
    created = await repo.create(resource_model)
    return ResourceResponse(**created.model_dump())


@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(resource_id: str, resource_update: ResourceUpdate, session: AsyncSession = Depends(get_db_session)):
    """Update a resource."""
    repo = RepositoryFactory.get_resource_repository(session)
    
    existing = await repo.get_by_id(resource_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Validate type if provided
    if resource_update.type is not None and resource_update.type not in ["individual", "organization"]:
        raise HTTPException(status_code=400, detail="Type must be 'individual' or 'organization'")
    
    # Update fields
    update_data = resource_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(resource_id, existing)
    return ResourceResponse(**updated.model_dump())


@router.delete("/{resource_id}", status_code=204)
async def delete_resource(resource_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a resource."""
    repo = RepositoryFactory.get_resource_repository(session)
    
    success = await repo.delete(resource_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resource not found")

