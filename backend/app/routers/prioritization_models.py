"""PrioritizationModel API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    PrioritizationModelCreate,
    PrioritizationModelResponse,
    PrioritizationModelUpdate,
)
from database.models.base_models import PrioritizationModel

router = APIRouter(prefix="/api/prioritization-models", tags=["prioritization-models"])


@router.get("", response_model=List[PrioritizationModelResponse])
async def get_prioritization_models(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    applies_to: Optional[str] = Query(None, description="Filter by applies_to (problem, feature, capability)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all prioritization models with optional filters. If module_id is provided, returns module-specific models. If product_id is provided without module_id, returns all product-level models."""
    repo = RepositoryFactory.get_prioritization_model_repository(session)
    
    if product_id:
        models = await repo.get_by_product_or_module(product_id, module_id)
    else:
        models = await repo.get_all()
    
    # Apply additional filters
    if applies_to:
        models = [m for m in models if m.applies_to == applies_to]
    if is_active is not None:
        models = [m for m in models if m.is_active == is_active]
    
    return [PrioritizationModelResponse(**m.model_dump()) for m in models]


@router.get("/{model_id}", response_model=PrioritizationModelResponse)
async def get_prioritization_model(
    model_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific prioritization model."""
    repo = RepositoryFactory.get_prioritization_model_repository(session)
    model = await repo.get_by_id(model_id)
    
    if not model:
        raise HTTPException(status_code=404, detail="Prioritization model not found")
    
    return PrioritizationModelResponse(**model.model_dump())


@router.post("", response_model=PrioritizationModelResponse, status_code=201)
async def create_prioritization_model(
    model: PrioritizationModelCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new prioritization model."""
    repo = RepositoryFactory.get_prioritization_model_repository(session)
    
    model_obj = PrioritizationModel(**model.model_dump())
    created = await repo.create(model_obj)
    
    return PrioritizationModelResponse(**created.model_dump())


@router.put("/{model_id}", response_model=PrioritizationModelResponse)
async def update_prioritization_model(
    model_id: str,
    model_update: PrioritizationModelUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a prioritization model."""
    repo = RepositoryFactory.get_prioritization_model_repository(session)
    
    existing = await repo.get_by_id(model_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Prioritization model not found")
    
    # Update fields
    update_data = model_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(model_id, existing)
    return PrioritizationModelResponse(**updated.model_dump())


@router.delete("/{model_id}", status_code=204)
async def delete_prioritization_model(
    model_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a prioritization model."""
    repo = RepositoryFactory.get_prioritization_model_repository(session)
    
    existing = await repo.get_by_id(model_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Prioritization model not found")
    
    await repo.delete(model_id)
    return None


@router.get("/product/{product_id}/active")
async def get_active_prioritization_model(
    product_id: str,
    applies_to: str = Query(..., description="Entity type (problem, feature, capability)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get the active prioritization model for a product and entity type."""
    repo = RepositoryFactory.get_prioritization_model_repository(session)
    
    model = await repo.get_active_by_product_and_applies_to(product_id, applies_to)
    
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"No active prioritization model found for product {product_id} and applies_to {applies_to}"
        )
    
    return PrioritizationModelResponse(**model.model_dump())

