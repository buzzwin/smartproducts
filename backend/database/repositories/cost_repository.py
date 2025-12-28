"""Cost repository interface (unified cost model)."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Cost
from .base_repository import BaseRepository


class CostRepository(BaseRepository[Cost], ABC):
    """Cost repository interface."""
    
    async def get_by_product(self, product_id: str) -> List[Cost]:
        """Get all costs for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_scope(self, product_id: str, scope: str) -> List[Cost]:
        """Get costs by scope for a product."""
        return await self.find_by({"product_id": product_id, "scope": scope})
    
    async def get_by_scope_id(self, product_id: str, scope: str, scope_id: str) -> List[Cost]:
        """Get costs for a specific scope entity."""
        return await self.find_by({
            "product_id": product_id,
            "scope": scope,
            "scope_id": scope_id
        })
    
    async def get_by_category(self, product_id: str, category: str) -> List[Cost]:
        """Get costs by category for a product."""
        return await self.find_by({"product_id": product_id, "category": category})
    
    async def get_shared_costs(self, product_id: str) -> List[Cost]:
        """Get shared costs for a product."""
        return await self.find_by({"product_id": product_id, "scope": "shared"})
