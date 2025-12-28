"""Phase repository interface."""
from abc import ABC
from typing import List
from ..models.base_models import Phase
from .base_repository import BaseRepository


class PhaseRepository(BaseRepository[Phase], ABC):
    """Phase repository interface with phase-specific methods."""
    
    async def get_all_ordered(self) -> List[Phase]:
        """Get all phases ordered by order field."""
        all_phases = await self.get_all()
        return sorted(all_phases, key=lambda p: p.order)

