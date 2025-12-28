"""Status report repository interface."""
from abc import ABC
from typing import Optional, List
from datetime import datetime
from ..models.base_models import StatusReport
from .base_repository import BaseRepository


class StatusReportRepository(BaseRepository[StatusReport], ABC):
    """Status report repository interface with status report-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[StatusReport]:
        """Get all status reports for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_date_range(self, start_date: datetime, end_date: datetime) -> List[StatusReport]:
        """Get status reports within a date range."""
        # This will be implemented in concrete repositories
        raise NotImplementedError("Date range filtering should be implemented in concrete repository")
    
    async def get_by_module(self, module_id: str) -> List[StatusReport]:
        """Get all status reports for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[StatusReport]:
        """Get status reports for a product, optionally filtered by module. If module_id is None, returns all product-level status reports."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})

