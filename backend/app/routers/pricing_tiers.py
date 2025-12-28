"""PricingTier API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    PricingTierCreate,
    PricingTierResponse,
    PricingTierUpdate,
)
from database.models.base_models import PricingTier

router = APIRouter(prefix="/api/pricing-tiers", tags=["pricing-tiers"])


@router.get("", response_model=List[PricingTierResponse])
async def get_pricing_tiers(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    revenue_model_id: Optional[str] = Query(None, description="Filter by revenue model ID"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all pricing tiers with optional filters."""
    repo = RepositoryFactory.get_pricing_tier_repository(session)
    
    if revenue_model_id:
        tiers = await repo.get_by_revenue_model(revenue_model_id)
    elif product_id:
        tiers = await repo.get_by_product(product_id)
    else:
        tiers = await repo.get_all()
    
    return [PricingTierResponse(**t.model_dump()) for t in tiers]


@router.get("/{tier_id}", response_model=PricingTierResponse)
async def get_pricing_tier(
    tier_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific pricing tier."""
    repo = RepositoryFactory.get_pricing_tier_repository(session)
    tier = await repo.get_by_id(tier_id)
    
    if not tier:
        raise HTTPException(status_code=404, detail="Pricing tier not found")
    
    return PricingTierResponse(**tier.model_dump())


@router.post("", response_model=PricingTierResponse, status_code=201)
async def create_pricing_tier(
    tier: PricingTierCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new pricing tier."""
    repo = RepositoryFactory.get_pricing_tier_repository(session)
    
    tier_obj = PricingTier(**tier.model_dump())
    created = await repo.create(tier_obj)
    
    return PricingTierResponse(**created.model_dump())


@router.put("/{tier_id}", response_model=PricingTierResponse)
async def update_pricing_tier(
    tier_id: str,
    tier_update: PricingTierUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a pricing tier."""
    repo = RepositoryFactory.get_pricing_tier_repository(session)
    
    existing = await repo.get_by_id(tier_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Pricing tier not found")
    
    # Update fields
    update_data = tier_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(tier_id, existing)
    return PricingTierResponse(**updated.model_dump())


@router.delete("/{tier_id}", status_code=204)
async def delete_pricing_tier(
    tier_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a pricing tier."""
    repo = RepositoryFactory.get_pricing_tier_repository(session)
    
    existing = await repo.get_by_id(tier_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Pricing tier not found")
    
    await repo.delete(tier_id)
    return None

