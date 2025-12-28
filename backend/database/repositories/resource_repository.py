"""Resource repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Resource
from .base_repository import BaseRepository


class ResourceRepository(BaseRepository[Resource], ABC):
    """Resource repository interface with resource-specific methods."""
    
    async def get_by_type(self, resource_type: str) -> List[Resource]:
        """Get all resources of a specific type."""
        return await self.find_by({"type": resource_type})
    
    async def get_by_skill(self, skill: str) -> List[Resource]:
        """Get all resources with a specific skill."""
        raise NotImplementedError("Subclasses must implement get_by_skill")

