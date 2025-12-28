"""Notification API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate,
)
from database.models.base_models import Notification

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    read: Optional[bool] = Query(None, description="Filter by read status"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all notifications with optional filters."""
    repo = RepositoryFactory.get_notification_repository(session)
    
    if user_id:
        notifications = await repo.get_by_user(user_id, read)
    elif organization_id:
        notifications = await repo.get_by_organization(organization_id, read)
    else:
        notifications = await repo.get_all()
        # Apply read filter if provided
        if read is not None:
            notifications = [n for n in notifications if n.read == read]
    
    return [NotificationResponse(**n.model_dump()) for n in notifications]


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific notification."""
    repo = RepositoryFactory.get_notification_repository(session)
    notification = await repo.get_by_id(notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return NotificationResponse(**notification.model_dump())


@router.post("", response_model=NotificationResponse, status_code=201)
async def create_notification(
    notification: NotificationCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new notification."""
    repo = RepositoryFactory.get_notification_repository(session)
    
    notification_obj = Notification(**notification.model_dump())
    created = await repo.create(notification_obj)
    
    return NotificationResponse(**created.model_dump())


@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    notification_update: NotificationUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a notification."""
    repo = RepositoryFactory.get_notification_repository(session)
    
    existing = await repo.get_by_id(notification_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Update fields
    update_data = notification_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(notification_id, existing)
    return NotificationResponse(**updated.model_dump())


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a notification."""
    repo = RepositoryFactory.get_notification_repository(session)
    
    existing = await repo.get_by_id(notification_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await repo.delete(notification_id)
    return None


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Mark a notification as read."""
    repo = RepositoryFactory.get_notification_repository(session)
    
    notification = await repo.mark_as_read(notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return NotificationResponse(**notification.model_dump())


@router.get("/user/{user_id}/unread-count")
async def get_unread_count(
    user_id: str,
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get the count of unread notifications for a user."""
    repo = RepositoryFactory.get_notification_repository(session)
    
    count = await repo.get_unread_count(user_id, organization_id)
    
    return {"user_id": user_id, "organization_id": organization_id, "unread_count": count}

