"""Feature API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    FeatureCreate,
    FeatureResponse,
    FeatureUpdate,
)
from database.models.base_models import Feature

router = APIRouter(prefix="/api/features", tags=["features"])


@router.get("", response_model=List[FeatureResponse])
async def get_features(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID"),
    owner: Optional[str] = Query(None, description="Filter by owner"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all features with optional filters."""
    repo = RepositoryFactory.get_feature_repository(session)
    
    if product_id:
        if module_id:
            features = await repo.get_by_product_or_module(product_id, module_id)
        else:
            features = await repo.get_by_product(product_id)
    elif module_id:
        features = await repo.get_by_module(module_id)
    elif owner:
        features = await repo.get_by_owner(owner)
    else:
        features = await repo.get_all()
    
    return [FeatureResponse(**f.model_dump()) for f in features]


@router.get("/{feature_id}", response_model=FeatureResponse)
async def get_feature(feature_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a feature by ID."""
    repo = RepositoryFactory.get_feature_repository(session)
    feature = await repo.get_by_id(feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    return FeatureResponse(**feature.model_dump())


@router.post("", response_model=FeatureResponse, status_code=201)
async def create_feature(feature: FeatureCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new feature."""
    repo = RepositoryFactory.get_feature_repository(session)
    
    # Validate product exists
    product_repo = RepositoryFactory.get_product_repository(session)
    product = await product_repo.get_by_id(feature.product_id)
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    
    # Validate module exists if provided
    if feature.module_id:
        module_repo = RepositoryFactory.get_module_repository(session)
        module = await module_repo.get_by_id(feature.module_id)
        if not module:
            raise HTTPException(status_code=400, detail="Module not found")
        # Validate module belongs to the same product
        if module.product_id != feature.product_id:
            raise HTTPException(status_code=400, detail="Module does not belong to the specified product")
    
    feature_model = Feature(**feature.model_dump())
    created = await repo.create(feature_model)
    return FeatureResponse(**created.model_dump())


@router.put("/{feature_id}", response_model=FeatureResponse)
async def update_feature(feature_id: str, feature_update: FeatureUpdate, session: AsyncSession = Depends(get_db_session)):
    """Update a feature."""
    repo = RepositoryFactory.get_feature_repository(session)
    
    existing = await repo.get_by_id(feature_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    # Update fields
    update_data = feature_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(feature_id, existing)
    return FeatureResponse(**updated.model_dump())


@router.delete("/{feature_id}", status_code=204)
async def delete_feature(feature_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a feature."""
    repo = RepositoryFactory.get_feature_repository(session)
    
    success = await repo.delete(feature_id)
    if not success:
        raise HTTPException(status_code=404, detail="Feature not found")

