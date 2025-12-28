"""Roadmap repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Roadmap
from .base_repository import BaseRepository


class RoadmapRepository(BaseRepository[Roadmap], ABC):
    """Roadmap repository interface."""
    
    async def get_by_product(self, product_id: str) -> List[Roadmap]:
        """Get all roadmaps for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_active(self, product_id: str) -> List[Roadmap]:
        """Get active roadmaps for a product."""
        return await self.find_by({"product_id": product_id, "is_active": True})
    
    async def get_by_type(self, product_id: str, roadmap_type: str) -> List[Roadmap]:
        """Get roadmaps by type for a product."""
        return await self.find_by({"product_id": product_id, "type": roadmap_type})
    
    async def get_by_module(self, module_id: str) -> List[Roadmap]:
        """Get all roadmaps for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Roadmap]:
        """Get roadmaps for a product, optionally filtered by module. If module_id is None, returns all product-level roadmaps."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

