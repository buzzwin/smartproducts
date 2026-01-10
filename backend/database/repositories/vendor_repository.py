"""Vendor repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Vendor
from .base_repository import BaseRepository


class VendorRepository(BaseRepository[Vendor], ABC):
    """Vendor repository interface with vendor-specific methods."""
    
    async def get_by_organization(self, organization_id: str) -> List[Vendor]:
        """Get all vendors for an organization."""
        return await self.find_by({"organization_id": organization_id})

