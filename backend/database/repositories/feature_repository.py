"""Feature repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Feature
from .base_repository import BaseRepository


class FeatureRepository(BaseRepository[Feature], ABC):
    """Feature repository interface with feature-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Feature]:
        """Get all features for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_module(self, module_id: str) -> List[Feature]:
        """Get all features for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Feature]:
        """Get features for a product, optionally filtered by module. If module_id is None, returns all product-level features."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})
    
    async def get_by_parent(self, parent_feature_id: str) -> List[Feature]:
        """Get all child features of a parent feature."""
        return await self.find_by({"parent_feature_id": parent_feature_id})
    
    async def get_by_owner(self, owner: str) -> List[Feature]:
        """Get all features owned by a specific owner."""
        return await self.find_by({"owner": owner})

