"""Feature report repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import FeatureReport
from .base_repository import BaseRepository


class FeatureReportRepository(BaseRepository[FeatureReport], ABC):
    """Feature report repository interface with feature report-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[FeatureReport]:
        """Get all feature reports for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_feature(self, feature_id: str) -> List[FeatureReport]:
        """Get all feature reports for a feature."""
        return await self.find_by({"feature_id": feature_id})

