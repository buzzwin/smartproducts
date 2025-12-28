"""Module API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    ModuleCreate,
    ModuleResponse,
    ModuleUpdate,
)
from database.models.base_models import Module

router = APIRouter(prefix="/api/modules", tags=["modules"])


@router.get("", response_model=List[ModuleResponse])
async def get_modules(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    owner_id: Optional[str] = Query(None, description="Filter by owner ID"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all modules with optional filters."""
    repo = RepositoryFactory.get_module_repository(session)
    
    if product_id:
        modules = await repo.get_by_product(product_id)
    elif owner_id:
        modules = await repo.get_by_owner(owner_id)
    else:
        modules = await repo.get_all()
    
    return [ModuleResponse(**m.model_dump()) for m in modules]


@router.get("/{module_id}", response_model=ModuleResponse)
async def get_module(
    module_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific module."""
    repo = RepositoryFactory.get_module_repository(session)
    module = await repo.get_by_id(module_id)
    
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    return ModuleResponse(**module.model_dump())


@router.post("", response_model=ModuleResponse, status_code=201)
async def create_module(
    module: ModuleCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new module."""
    repo = RepositoryFactory.get_module_repository(session)
    
    # If this is set as default, unset other defaults for the same product
    if module.is_default and module.product_id:
        existing_default = await repo.get_default(module.product_id)
        if existing_default:
            existing_default.is_default = False
            await repo.update(existing_default.id, existing_default)
    
    module_model = Module(**module.model_dump())
    created = await repo.create(module_model)
    return ModuleResponse(**created.model_dump())


@router.put("/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: str,
    module: ModuleUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a module."""
    repo = RepositoryFactory.get_module_repository(session)
    existing = await repo.get_by_id(module_id)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # If setting as default, unset other defaults for the same product
    if module.is_default is True and existing.product_id:
        existing_default = await repo.get_default(existing.product_id)
        if existing_default and existing_default.id != module_id:
            existing_default.is_default = False
            await repo.update(existing_default.id, existing_default)
    
    # Update fields
    update_data = module.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(module_id, existing)
    return ModuleResponse(**updated.model_dump())


@router.delete("/{module_id}", status_code=204)
async def delete_module(
    module_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a module."""
    repo = RepositoryFactory.get_module_repository(session)
    success = await repo.delete(module_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Module not found")


@router.get("/product/{product_id}/default", response_model=ModuleResponse)
async def get_default_module(
    product_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get the default module for a product."""
    repo = RepositoryFactory.get_module_repository(session)
    module = await repo.get_default(product_id)
    
    if not module:
        raise HTTPException(status_code=404, detail="No default module found for this product")
    
    return ModuleResponse(**module.model_dump())
