"""Outcome repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Outcome
from .base_repository import BaseRepository


class OutcomeRepository(BaseRepository[Outcome], ABC):
    """Outcome repository interface with outcome-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Outcome]:
        """Get all outcomes for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_feature(self, feature_id: str) -> List[Outcome]:
        """Get all outcomes linked to a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_metric(self, metric_id: str) -> List[Outcome]:
        """Get all outcomes linked to a metric."""
        return await self.find_by({"metric_id": metric_id})
    
    async def get_by_status(self, status: str) -> List[Outcome]:
        """Get all outcomes with a specific status."""
        return await self.find_by({"status": status})

