"""Vendor API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    VendorCreate,
    VendorResponse,
    VendorUpdate,
)
from database.models.base_models import Vendor

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


@router.get("", response_model=List[VendorResponse])
async def get_vendors(
    organization_id: Optional[str] = Query(None, description="Filter by organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all vendors with optional organization filter."""
    repo = RepositoryFactory.get_vendor_repository(session)
    
    if organization_id:
        vendors = await repo.get_by_organization(organization_id)
    else:
        vendors = await repo.get_all()
    
    return [VendorResponse(**v.model_dump()) for v in vendors]


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(vendor_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a vendor by ID."""
    repo = RepositoryFactory.get_vendor_repository(session)
    vendor = await repo.get_by_id(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return VendorResponse(**vendor.model_dump())


@router.post("", response_model=VendorResponse, status_code=201)
async def create_vendor(vendor: VendorCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new vendor."""
    repo = RepositoryFactory.get_vendor_repository(session)
    
    vendor_model = Vendor(**vendor.model_dump())
    created = await repo.create(vendor_model)
    return VendorResponse(**created.model_dump())


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(vendor_id: str, vendor_update: VendorUpdate, session: AsyncSession = Depends(get_db_session)):
    """Update a vendor."""
    repo = RepositoryFactory.get_vendor_repository(session)
    
    existing = await repo.get_by_id(vendor_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update fields
    update_data = vendor_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(vendor_id, existing)
    return VendorResponse(**updated.model_dump())


@router.delete("/{vendor_id}", status_code=204)
async def delete_vendor(vendor_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a vendor."""
    repo = RepositoryFactory.get_vendor_repository(session)
    
    success = await repo.delete(vendor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Vendor not found")

