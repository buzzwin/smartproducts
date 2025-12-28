"""UsageMetric repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import UsageMetric
from .base_repository import BaseRepository


class UsageMetricRepository(BaseRepository[UsageMetric], ABC):
    """UsageMetric repository interface."""
    
    async def get_by_product(self, product_id: str) -> List[UsageMetric]:
        """Get all usage metrics for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_type(self, product_id: str, metric_type: str) -> List[UsageMetric]:
        """Get usage metrics by type for a product."""
        return await self.find_by({"product_id": product_id, "metric_type": metric_type})

