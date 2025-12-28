"""Release repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Release
from .base_repository import BaseRepository


class ReleaseRepository(BaseRepository[Release], ABC):
    """Release repository interface with release-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Release]:
        """Get all releases for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_status(self, status: str) -> List[Release]:
        """Get all releases with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_module(self, module_id: str) -> List[Release]:
        """Get all releases for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Release]:
        """Get releases for a product, optionally filtered by module. If module_id is None, returns all product-level releases."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

