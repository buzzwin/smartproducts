"""Release API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    ReleaseCreate,
    ReleaseResponse,
    ReleaseUpdate,
)
from database.models.base_models import Release

router = APIRouter(prefix="/api/releases", tags=["releases"])


@router.get("", response_model=List[ReleaseResponse])
async def get_releases(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all releases with optional filters. If module_id is provided, returns module-specific releases. If product_id is provided without module_id, returns all product-level releases."""
    repo = RepositoryFactory.get_release_repository(session)
    
    if product_id:
        releases = await repo.get_by_product_or_module(product_id, module_id)
    elif status:
        releases = await repo.get_by_status(status)
    else:
        releases = await repo.get_all()
    
    # Apply additional filters
    if product_id and status:
        releases = [r for r in releases if r.status == status]
    
    return [ReleaseResponse(**r.model_dump()) for r in releases]


@router.get("/{release_id}", response_model=ReleaseResponse)
async def get_release(release_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a release by ID."""
    repo = RepositoryFactory.get_release_repository(session)
    release = await repo.get_by_id(release_id)
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return ReleaseResponse(**release.model_dump())


@router.post("", response_model=ReleaseResponse, status_code=201)
async def create_release(release: ReleaseCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new release."""
    repo = RepositoryFactory.get_release_repository(session)
    
    # Validate status
    if release.status not in ["planned", "in_progress", "released", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    release_model = Release(**release.model_dump())
    created = await repo.create(release_model)
    return ReleaseResponse(**created.model_dump())


@router.put("/{release_id}", response_model=ReleaseResponse)
async def update_release(
    release_id: str,
    release_update: ReleaseUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a release."""
    repo = RepositoryFactory.get_release_repository(session)
    release = await repo.get_by_id(release_id)
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Validate status if provided
    if release_update.status and release_update.status not in ["planned", "in_progress", "released", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = release_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(release, key, value)
    
    updated = await repo.update(release)
    return ReleaseResponse(**updated.model_dump())


@router.delete("/{release_id}", status_code=204)
async def delete_release(release_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a release."""
    repo = RepositoryFactory.get_release_repository(session)
    release = await repo.get_by_id(release_id)
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    await repo.delete(release_id)
    return None


@router.post("/{release_id}/add-feature", response_model=ReleaseResponse)
async def add_feature_to_release(
    release_id: str,
    feature_id: str = Query(..., description="Feature ID to add"),
    session: AsyncSession = Depends(get_db_session)
):
    """Add a feature to a release."""
    repo = RepositoryFactory.get_release_repository(session)
    release = await repo.get_by_id(release_id)
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    if feature_id not in release.feature_ids:
        release.feature_ids.append(feature_id)
        updated = await repo.update(release)
        return ReleaseResponse(**updated.model_dump())
    else:
        return ReleaseResponse(**release.model_dump())


@router.get("/product/{product_id}", response_model=List[ReleaseResponse])
async def get_releases_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level releases."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all releases for a product. If module_id is provided, returns module-specific releases. Otherwise returns all product-level releases."""
    repo = RepositoryFactory.get_release_repository(session)
    releases = await repo.get_by_product_or_module(product_id, module_id)
    return [ReleaseResponse(**r.model_dump()) for r in releases]

