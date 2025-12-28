"""Strategy repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Strategy
from .base_repository import BaseRepository


class StrategyRepository(BaseRepository[Strategy], ABC):
    """Strategy repository interface with strategy-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Strategy]:
        """Get all strategies for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_type(self, strategy_type: str) -> List[Strategy]:
        """Get all strategies of a specific type (vision, strategy, okr)."""
        return await self.find_by({"type": strategy_type})
    
    async def get_by_product_and_type(self, product_id: str, strategy_type: str) -> List[Strategy]:
        """Get strategies for a product filtered by type."""
        return await self.find_by({"product_id": product_id, "type": strategy_type})
    
    async def get_by_status(self, status: str) -> List[Strategy]:
        """Get all strategies with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_module(self, module_id: str) -> List[Strategy]:
        """Get all strategies for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Strategy]:
        """Get strategies for a product, optionally filtered by module. If module_id is None, returns all product-level strategies."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

