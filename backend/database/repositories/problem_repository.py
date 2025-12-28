"""Problem repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Problem
from .base_repository import BaseRepository


class ProblemRepository(BaseRepository[Problem], ABC):
    """Problem repository interface with problem-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Problem]:
        """Get all problems for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_status(self, status: str) -> List[Problem]:
        """Get all problems with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_priority(self, priority: str) -> List[Problem]:
        """Get all problems with a specific priority."""
        return await self.find_by({"priority": priority})
    
    async def get_by_feature(self, feature_id: str) -> List[Problem]:
        """Get all problems linked to a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_module(self, module_id: str) -> List[Problem]:
        """Get all problems for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Problem]:
        """Get problems for a product, optionally filtered by module. If module_id is None, returns all product-level problems."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

