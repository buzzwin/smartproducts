"""PriorityScore repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import PriorityScore
from .base_repository import BaseRepository


class PriorityScoreRepository(BaseRepository[PriorityScore], ABC):
    """PriorityScore repository interface."""
    
    async def get_by_product(self, product_id: str) -> List[PriorityScore]:
        """Get all priority scores for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_entity(self, product_id: str, entity_type: str, entity_id: str) -> List[PriorityScore]:
        """Get priority scores for a specific entity."""
        return await self.find_by({
            "product_id": product_id,
            "entity_type": entity_type,
            "entity_id": entity_id
        })
    
    async def get_by_model(self, prioritization_model_id: str) -> List[PriorityScore]:
        """Get all priority scores for a prioritization model."""
        return await self.find_by({"prioritization_model_id": prioritization_model_id})
    
    async def get_latest_by_entity(self, product_id: str, entity_type: str, entity_id: str) -> Optional[PriorityScore]:
        """Get the latest priority score for an entity."""
        scores = await self.get_by_entity(product_id, entity_type, entity_id)
        if not scores:
            return None
        # Sort by version descending and return the latest
        return max(scores, key=lambda s: (s.version, s.calculated_at or s.created_at or 0))
    
    async def get_by_module(self, module_id: str) -> List[PriorityScore]:
        """Get all priority scores for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[PriorityScore]:
        """Get priority scores for a product, optionally filtered by module. If module_id is None, returns all product-level scores."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

