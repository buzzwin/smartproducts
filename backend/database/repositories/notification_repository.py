"""Notification repository interface."""
from abc import ABC
from typing import Optional, List
from datetime import datetime
from ..models.base_models import Notification
from .base_repository import BaseRepository


class NotificationRepository(BaseRepository[Notification], ABC):
    """Notification repository interface."""
    
    async def get_by_user(self, user_id: str, organization_id: Optional[str] = None) -> List[Notification]:
        """Get all notifications for a user."""
        filters = {"user_id": user_id}
        if organization_id:
            filters["organization_id"] = organization_id
        return await self.find_by(filters)
    
    async def get_unread(self, user_id: str, organization_id: Optional[str] = None) -> List[Notification]:
        """Get unread notifications for a user."""
        filters = {"user_id": user_id, "read": False}
        if organization_id:
            filters["organization_id"] = organization_id
        return await self.find_by(filters)
    
    async def get_unread_count(self, user_id: str, organization_id: Optional[str] = None) -> int:
        """Get count of unread notifications for a user."""
        unread = await self.get_unread(user_id, organization_id)
        return len(unread)
    
    async def mark_as_read(self, notification_id: str, read_at: Optional[datetime] = None) -> bool:
        """Mark a notification as read."""
        notification = await self.get_by_id(notification_id)
        if not notification:
            return False
        notification.read = True
        notification.read_at = read_at or datetime.now()
        await self.update(notification_id, notification)
        return True
    
    async def mark_all_as_read(self, user_id: str, organization_id: Optional[str] = None) -> int:
        """Mark all notifications as read for a user."""
        unread = await self.get_unread(user_id, organization_id)
        count = 0
        read_at = datetime.now()
        for notification in unread:
            if await self.mark_as_read(notification.id, read_at):
                count += 1
        return count

