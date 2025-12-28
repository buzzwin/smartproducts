"""Insight repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Insight
from .base_repository import BaseRepository


class InsightRepository(BaseRepository[Insight], ABC):
    """Insight repository interface with insight-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Insight]:
        """Get all insights for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_feature(self, feature_id: str) -> List[Insight]:
        """Get all insights linked to a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_problem(self, problem_id: str) -> List[Insight]:
        """Get all insights linked to a problem."""
        return await self.find_by({"problem_id": problem_id})
    
    async def get_by_status(self, status: str) -> List[Insight]:
        """Get all insights with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_source(self, source: str) -> List[Insight]:
        """Get all insights from a specific source."""
        return await self.find_by({"source": source})
    
    async def get_by_module(self, module_id: str) -> List[Insight]:
        """Get all insights for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Insight]:
        """Get insights for a product, optionally filtered by module. If module_id is None, returns all product-level insights."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

