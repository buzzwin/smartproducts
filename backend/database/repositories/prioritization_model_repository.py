"""PrioritizationModel repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import PrioritizationModel
from .base_repository import BaseRepository


class PrioritizationModelRepository(BaseRepository[PrioritizationModel], ABC):
    """PrioritizationModel repository interface."""
    
    async def get_by_product(self, product_id: str) -> List[PrioritizationModel]:
        """Get all prioritization models for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_type(self, product_id: str, model_type: str) -> List[PrioritizationModel]:
        """Get prioritization models by type for a product."""
        return await self.find_by({"product_id": product_id, "type": model_type})
    
    async def get_active(self, product_id: str) -> List[PrioritizationModel]:
        """Get active prioritization models for a product."""
        return await self.find_by({"product_id": product_id, "is_active": True})
    
    async def get_by_module(self, module_id: str) -> List[PrioritizationModel]:
        """Get all prioritization models for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[PrioritizationModel]:
        """Get prioritization models for a product, optionally filtered by module. If module_id is None, returns all product-level models."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

