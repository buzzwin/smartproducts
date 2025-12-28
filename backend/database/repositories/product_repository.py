"""Product repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Product
from .base_repository import BaseRepository


class ProductRepository(BaseRepository[Product], ABC):
    """Product repository interface with product-specific methods."""
    
    async def get_by_name(self, name: str) -> Optional[Product]:
        """Get a product by name."""
        results = await self.find_by({"name": name}, limit=1)
        return results[0] if results else None
    
    async def get_all_with_costs(self) -> List[Product]:
        """Get all products with their associated costs."""
        return await self.get_all()

