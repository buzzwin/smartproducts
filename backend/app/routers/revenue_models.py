"""RevenueModel API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    RevenueModelCreate,
    RevenueModelResponse,
    RevenueModelUpdate,
)
from database.models.base_models import RevenueModel

router = APIRouter(prefix="/api/revenue-models", tags=["revenue-models"])


@router.get("", response_model=List[RevenueModelResponse])
async def get_revenue_models(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all revenue models with optional filters."""
    repo = RepositoryFactory.get_revenue_model_repository(session)
    
    if product_id:
        models = await repo.get_by_product(product_id)
    else:
        models = await repo.get_all()
    
    # Apply additional filters
    if is_active is not None:
        models = [m for m in models if m.is_active == is_active]
    
    return [RevenueModelResponse(**m.model_dump()) for m in models]


@router.get("/{model_id}", response_model=RevenueModelResponse)
async def get_revenue_model(
    model_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific revenue model."""
    repo = RepositoryFactory.get_revenue_model_repository(session)
    model = await repo.get_by_id(model_id)
    
    if not model:
        raise HTTPException(status_code=404, detail="Revenue model not found")
    
    return RevenueModelResponse(**model.model_dump())


@router.post("", response_model=RevenueModelResponse, status_code=201)
async def create_revenue_model(
    model: RevenueModelCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new revenue model."""
    repo = RepositoryFactory.get_revenue_model_repository(session)
    
    model_obj = RevenueModel(**model.model_dump())
    created = await repo.create(model_obj)
    
    return RevenueModelResponse(**created.model_dump())


@router.put("/{model_id}", response_model=RevenueModelResponse)
async def update_revenue_model(
    model_id: str,
    model_update: RevenueModelUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a revenue model."""
    repo = RepositoryFactory.get_revenue_model_repository(session)
    
    existing = await repo.get_by_id(model_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Revenue model not found")
    
    # Update fields
    update_data = model_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(model_id, existing)
    return RevenueModelResponse(**updated.model_dump())


@router.delete("/{model_id}", status_code=204)
async def delete_revenue_model(
    model_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a revenue model."""
    repo = RepositoryFactory.get_revenue_model_repository(session)
    
    existing = await repo.get_by_id(model_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Revenue model not found")
    
    await repo.delete(model_id)
    return None


@router.get("/product/{product_id}/active")
async def get_active_revenue_model(
    product_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get the active revenue model for a product."""
    repo = RepositoryFactory.get_revenue_model_repository(session)
    
    model = await repo.get_active_by_product(product_id)
    
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"No active revenue model found for product {product_id}"
        )
    
    return RevenueModelResponse(**model.model_dump())

