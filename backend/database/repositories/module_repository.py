"""Module repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Module
from .base_repository import BaseRepository


class ModuleRepository(BaseRepository[Module], ABC):
    """Module repository interface with module-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Module]:
        """Get all modules for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_owner(self, owner_id: str) -> List[Module]:
        """Get all modules owned by a user."""
        return await self.find_by({"owner_id": owner_id})
    
    async def get_default(self, product_id: str) -> Optional[Module]:
        """Get the default module for a product."""
        modules = await self.find_by({"product_id": product_id, "is_default": True})
        return modules[0] if modules else None
