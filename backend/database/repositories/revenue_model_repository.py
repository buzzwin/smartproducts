"""RevenueModel repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import RevenueModel
from .base_repository import BaseRepository


class RevenueModelRepository(BaseRepository[RevenueModel], ABC):
    """RevenueModel repository interface."""
    
    async def get_by_product(self, product_id: str) -> List[RevenueModel]:
        """Get all revenue models for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_active(self, product_id: str) -> List[RevenueModel]:
        """Get active revenue models for a product."""
        return await self.find_by({"product_id": product_id, "is_active": True})

