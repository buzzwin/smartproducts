"""In-memory repository implementation for ProcessedEmail."""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from ..models.processed_email import ProcessedEmail
from .base_repository import BaseRepository


class InMemoryProcessedEmailRepository(BaseRepository[ProcessedEmail]):
    """In-memory repository for ProcessedEmail using dictionary storage."""
    
    def __init__(self):
        """Initialize the in-memory repository."""
        self._storage: Dict[str, ProcessedEmail] = {}
        self._email_id_index: Dict[str, str] = {}  # email_id -> id mapping
    
    async def create(self, entity: ProcessedEmail) -> ProcessedEmail:
        """Create a new ProcessedEmail entity."""
        if entity.id is None:
            entity.id = str(uuid.uuid4())
        
        # Set timestamps
        now = datetime.utcnow()
        if entity.created_at is None:
            entity.created_at = now
        entity.updated_at = now
        
        # Store entity
        self._storage[entity.id] = entity
        self._email_id_index[entity.email_id] = entity.id
        
        return entity
    
    async def get_by_id(self, entity_id: str) -> Optional[ProcessedEmail]:
        """Get ProcessedEmail by ID."""
        return self._storage.get(entity_id)
    
    async def get_all(self) -> List[ProcessedEmail]:
        """Get all ProcessedEmail entities."""
        return list(self._storage.values())
    
    async def update(self, entity_id: str, entity: ProcessedEmail) -> Optional[ProcessedEmail]:
        """Update an existing ProcessedEmail entity."""
        if entity_id not in self._storage:
            return None
        
        # Update timestamps
        entity.updated_at = datetime.utcnow()
        entity.id = entity_id  # Ensure ID matches
        
        # Update storage
        self._storage[entity_id] = entity
        if entity.email_id:
            self._email_id_index[entity.email_id] = entity_id
        
        return entity
    
    async def delete(self, entity_id: str) -> bool:
        """Delete a ProcessedEmail entity."""
        if entity_id not in self._storage:
            return False
        
        entity = self._storage[entity_id]
        # Remove from email_id index
        if entity.email_id in self._email_id_index:
            del self._email_id_index[entity.email_id]
        
        # Remove from storage
        del self._storage[entity_id]
        return True
    
    async def find_by(self, filters: Dict[str, Any]) -> List[ProcessedEmail]:
        """Find ProcessedEmail entities matching filters."""
        results = []
        for entity in self._storage.values():
            match = True
            for key, value in filters.items():
                entity_value = getattr(entity, key, None)
                if entity_value != value:
                    match = False
                    break
            if match:
                results.append(entity)
        return results
    
    async def get_by_email_id(self, email_id: str) -> Optional[ProcessedEmail]:
        """Get ProcessedEmail by Gmail email_id."""
        entity_id = self._email_id_index.get(email_id)
        if entity_id:
            return self._storage.get(entity_id)
        return None
    
    async def clear(self) -> None:
        """Clear all stored entities (useful for testing)."""
        self._storage.clear()
        self._email_id_index.clear()

