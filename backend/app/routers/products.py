"""Product API routes."""
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from database.database import RepositoryFactory, get_db_session
from database.config import db_config
from database.schema import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from database.models.base_models import Product
from app.services.tco_service import TCOService

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=List[ProductResponse])
async def get_products(session: Optional[Any] = Depends(get_db_session)):
    """Get all products."""
    repo = RepositoryFactory.get_product_repository(session)
    products = await repo.get_all()
    return [ProductResponse(**p.model_dump()) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, session: Optional[Any] = Depends(get_db_session)):
    """Get a product by ID."""
    repo = RepositoryFactory.get_product_repository(session)
    product = await repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**product.model_dump())


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(product: ProductCreate, session: Optional[Any] = Depends(get_db_session)):
    """Create a new product."""
    repo = RepositoryFactory.get_product_repository(session)
    
    # Check if product with same name exists
    existing = await repo.get_by_name(product.name)
    if existing:
        raise HTTPException(status_code=400, detail="Product with this name already exists")
    
    product_model = Product(**product.model_dump())
    created = await repo.create(product_model)
    return ProductResponse(**created.model_dump())


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product_update: ProductUpdate, session: Optional[Any] = Depends(get_db_session)):
    """Update a product."""
    repo = RepositoryFactory.get_product_repository(session)
    
    existing = await repo.get_by_id(product_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update fields
    update_data = product_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(product_id, existing)
    return ProductResponse(**updated.model_dump())


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: str, session: Optional[Any] = Depends(get_db_session)):
    """Delete a product."""
    repo = RepositoryFactory.get_product_repository(session)
    
    success = await repo.delete(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")


@router.get("/{product_id}/tco")
async def get_product_tco(
    product_id: str,
    time_period_months: int = Query(12, description="Time period in months for TCO calculation"),
    session: Optional[Any] = Depends(get_db_session)
):
    """Get TCO (Total Cost of Ownership) for a product."""
    try:
        tco_result = await TCOService.compute_tco(product_id, time_period_months, session)
        return tco_result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{product_id}/tco/update")
async def update_product_tco(
    product_id: str,
    time_period_months: int = Query(12, description="Time period in months for TCO calculation"),
    session: Optional[Any] = Depends(get_db_session)
):
    """Compute and update the TCO on the product record."""
    try:
        updated_product = await TCOService.update_product_tco(product_id, time_period_months, session)
        return ProductResponse(**updated_product.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{product_id}/tco/breakdown")
async def get_product_tco_breakdown(
    product_id: str,
    time_period_months: int = Query(12, description="Time period in months for TCO calculation"),
    session: Optional[Any] = Depends(get_db_session)
):
    """Get detailed TCO breakdown for a product."""
    try:
        breakdown = await TCOService.get_tco_breakdown(product_id, time_period_months, session)
        return breakdown
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{product_id}/tco/scope/{scope}")
async def get_product_tco_by_scope(
    product_id: str,
    scope: str,
    time_period_months: int = Query(12, description="Time period in months for TCO calculation"),
    session: Optional[Any] = Depends(get_db_session)
):
    """Get TCO for a specific scope (task, capability, product, shared)."""
    try:
        scope_tco = await TCOService.get_tco_by_scope(product_id, scope, time_period_months, session)
        return scope_tco
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

