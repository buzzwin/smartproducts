"""PricingTier repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import PricingTier
from .base_repository import BaseRepository


class PricingTierRepository(BaseRepository[PricingTier], ABC):
    """PricingTier repository interface."""
    
    async def get_by_product(self, product_id: str) -> List[PricingTier]:
        """Get all pricing tiers for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_revenue_model(self, revenue_model_id: str) -> List[PricingTier]:
        """Get pricing tiers for a revenue model."""
        return await self.find_by({"revenue_model_id": revenue_model_id})

