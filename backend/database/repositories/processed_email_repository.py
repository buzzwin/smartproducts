"""ProcessedEmail repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import ProcessedEmail
from .base_repository import BaseRepository


class ProcessedEmailRepository(BaseRepository[ProcessedEmail], ABC):
    """ProcessedEmail repository interface with email-specific methods."""
    
    async def get_by_status(self, status: str) -> List[ProcessedEmail]:
        """Get all processed emails with a specific status."""
        return await self.find_by({"status": status})
    
    async def get_by_entity_type(self, entity_type: str) -> List[ProcessedEmail]:
        """Get all processed emails with a specific entity type."""
        return await self.find_by({"suggested_entity_type": entity_type})
    
    async def get_by_email_id(self, email_id: str) -> Optional[ProcessedEmail]:
        """Get processed email by Gmail email ID."""
        results = await self.find_by({"email_id": email_id})
        return results[0] if results else None
    
    async def get_pending(self) -> List[ProcessedEmail]:
        """Get all pending suggestions."""
        return await self.get_by_status("pending")
    
    async def get_by_correlated_task(self, task_id: str) -> List[ProcessedEmail]:
        """Get all emails correlated to a specific task."""
        return await self.find_by({"correlated_task_id": task_id})

