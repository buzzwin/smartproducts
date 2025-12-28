"""Stakeholder API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    StakeholderCreate,
    StakeholderResponse,
    StakeholderUpdate,
)
from database.models.base_models import Stakeholder

router = APIRouter(prefix="/api/stakeholders", tags=["stakeholders"])


@router.get("", response_model=List[StakeholderResponse])
async def get_stakeholders(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all stakeholders with optional filters. If module_id is provided, returns module-specific stakeholders. If product_id is provided without module_id, returns all product-level stakeholders."""
    repo = RepositoryFactory.get_stakeholder_repository(session)
    
    if product_id:
        stakeholders = await repo.get_by_product_or_module(product_id, module_id)
    else:
        stakeholders = await repo.get_all()
    
    return [StakeholderResponse(**s.model_dump()) for s in stakeholders]


@router.get("/{stakeholder_id}", response_model=StakeholderResponse)
async def get_stakeholder(stakeholder_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a stakeholder by ID."""
    repo = RepositoryFactory.get_stakeholder_repository(session)
    stakeholder = await repo.get_by_id(stakeholder_id)
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    return StakeholderResponse(**stakeholder.model_dump())


@router.post("", response_model=StakeholderResponse, status_code=201)
async def create_stakeholder(stakeholder: StakeholderCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new stakeholder."""
    repo = RepositoryFactory.get_stakeholder_repository(session)
    
    stakeholder_model = Stakeholder(**stakeholder.model_dump())
    created = await repo.create(stakeholder_model)
    return StakeholderResponse(**created.model_dump())


@router.put("/{stakeholder_id}", response_model=StakeholderResponse)
async def update_stakeholder(
    stakeholder_id: str,
    stakeholder_update: StakeholderUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a stakeholder."""
    repo = RepositoryFactory.get_stakeholder_repository(session)
    stakeholder = await repo.get_by_id(stakeholder_id)
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    
    update_data = stakeholder_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stakeholder, key, value)
    
    updated = await repo.update(stakeholder)
    return StakeholderResponse(**updated.model_dump())


@router.delete("/{stakeholder_id}", status_code=204)
async def delete_stakeholder(stakeholder_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a stakeholder."""
    repo = RepositoryFactory.get_stakeholder_repository(session)
    stakeholder = await repo.get_by_id(stakeholder_id)
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    
    await repo.delete(stakeholder_id)
    return None


@router.get("/product/{product_id}", response_model=List[StakeholderResponse])
async def get_stakeholders_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level stakeholders."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all stakeholders for a product. If module_id is provided, returns module-specific stakeholders. Otherwise returns all product-level stakeholders."""
    repo = RepositoryFactory.get_stakeholder_repository(session)
    stakeholders = await repo.get_by_product_or_module(product_id, module_id)
    return [StakeholderResponse(**s.model_dump()) for s in stakeholders]

