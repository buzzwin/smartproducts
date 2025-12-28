"""Metric repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Metric
from .base_repository import BaseRepository


class MetricRepository(BaseRepository[Metric], ABC):
    """Metric repository interface with metric-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Metric]:
        """Get all metrics for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_scope(self, product_id: str, scope: str) -> List[Metric]:
        """Get all metrics for a specific scope (product, capability, feature)."""
        return await self.find_by({"product_id": product_id, "scope": scope})
    
    async def get_by_scope_id(self, product_id: str, scope: str, scope_id: str) -> List[Metric]:
        """Get all metrics for a specific scope entity."""
        return await self.find_by({
            "product_id": product_id,
            "scope": scope,
            "scope_id": scope_id
        })
    
    async def get_by_metric_type(self, product_id: str, metric_type: str) -> List[Metric]:
        """Get all metrics of a specific metric type (outcome, output, health)."""
        return await self.find_by({"product_id": product_id, "metric_type": metric_type})
    
    async def get_by_module(self, module_id: str) -> List[Metric]:
        """Get all metrics for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Metric]:
        """Get metrics for a product, optionally filtered by module. If module_id is None, returns all product-level metrics."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

