"""Decision repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Decision
from .base_repository import BaseRepository


class DecisionRepository(BaseRepository[Decision], ABC):
    """Decision repository interface with decision-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Decision]:
        """Get all decisions for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_entity(self, entity_type: str, entity_id: str) -> List[Decision]:
        """Get all decisions for a specific entity."""
        return await self.find_by({"entity_type": entity_type, "entity_id": entity_id})
    
    async def get_by_decision_maker(self, decision_maker: str) -> List[Decision]:
        """Get all decisions made by a specific person."""
        return await self.find_by({"decision_maker": decision_maker})
    
    async def get_by_module(self, module_id: str) -> List[Decision]:
        """Get all decisions for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Decision]:
        """Get decisions for a product, optionally filtered by module. If module_id is None, returns all product-level decisions."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

