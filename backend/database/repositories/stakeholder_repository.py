"""Stakeholder repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Stakeholder
from .base_repository import BaseRepository


class StakeholderRepository(BaseRepository[Stakeholder], ABC):
    """Stakeholder repository interface with stakeholder-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Stakeholder]:
        """Get all stakeholders for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_email(self, email: str) -> Optional[Stakeholder]:
        """Get stakeholder by email."""
        results = await self.find_by({"email": email})
        return results[0] if results else None
    
    async def get_by_module(self, module_id: str) -> List[Stakeholder]:
        """Get all stakeholders for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Stakeholder]:
        """Get stakeholders for a product, optionally filtered by module. If module_id is None, returns all product-level stakeholders."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

