"""Workstream repository interface."""
from abc import ABC
from typing import List
from ..models.base_models import Workstream
from .base_repository import BaseRepository


class WorkstreamRepository(BaseRepository[Workstream], ABC):
    """Workstream repository interface with workstream-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Workstream]:
        """Get all workstreams for a product."""
        return await self.find_by({"product_id": product_id})

