"""Abstract base repository interface."""
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List, Dict, Any
from ..models.base_models import BaseEntity

T = TypeVar('T', bound=BaseEntity)


class BaseRepository(ABC, Generic[T]):
    """Abstract base repository with common CRUD operations."""
    
    @abstractmethod
    async def create(self, entity: T) -> T:
        """Create a new entity."""
        pass
    
    @abstractmethod
    async def get_by_id(self, entity_id: str) -> Optional[T]:
        """Get an entity by ID."""
        pass
    
    @abstractmethod
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all entities with pagination."""
        pass
    
    @abstractmethod
    async def update(self, entity_id: str, entity: T) -> Optional[T]:
        """Update an existing entity."""
        pass
    
    @abstractmethod
    async def delete(self, entity_id: str) -> bool:
        """Delete an entity by ID."""
        pass
    
    @abstractmethod
    async def find_by(self, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[T]:
        """Find entities by filters."""
        pass
    
    @abstractmethod
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count entities matching filters."""
        pass

