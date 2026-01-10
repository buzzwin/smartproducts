"""Gmail API router for reading emails."""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.gmail_service import GmailService
from app.services.encryption_service import EncryptionService
from database.database import RepositoryFactory, get_db_session

router = APIRouter(prefix="/api/gmail", tags=["gmail"])


class MessageResponse(BaseModel):
    """Response model for a single message."""
    id: str
    threadId: str
    snippet: str
    subject: str
    from_email: str = Field(alias="from")
    to: str
    cc: Optional[str] = None
    bcc: Optional[str] = None
    date: str
    labels: List[str]
    body_text: str
    body_html: Optional[str] = None
    attachments: List[dict]
    size_estimate: int

    model_config = {
        "populate_by_name": True
    }


class MessagesListResponse(BaseModel):
    """Response model for messages list."""
    messages: List[MessageResponse]
    next_page_token: Optional[str] = None
    result_size_estimate: int


async def get_gmail_service(
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use"),
    session: AsyncSession = Depends(get_db_session)
) -> GmailService:
    """Dependency to get Gmail service instance (account-specific if provided)."""
    if email_account_id and user_id:
        # Load account from database
        repo = RepositoryFactory.get_email_account_repository(session)
        account = await repo.get_by_id(email_account_id)
        
        if not account:
            raise HTTPException(status_code=404, detail="Email account not found")
        
        if account.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not account.is_active:
            raise HTTPException(status_code=400, detail="Email account is not active")
        
        # Decrypt credentials
        encryption_service = EncryptionService()
        credentials_json = encryption_service.decrypt(account.credentials_encrypted)
        
        # Create GmailService with account credentials
        return GmailService.from_credentials_json(credentials_json)
    else:
        # Fallback to file-based authentication
        return GmailService()


@router.get("/messages", response_model=MessagesListResponse)
async def get_messages(
    query: Optional[str] = Query(None, description="Gmail search query (e.g., 'from:example@gmail.com', 'subject:test', 'is:unread')"),
    max_results: int = Query(10, ge=1, le=500, description="Maximum number of messages to return"),
    page_token: Optional[str] = Query(None, description="Token for pagination"),
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use"),
    session: AsyncSession = Depends(get_db_session),
    gmail_service: GmailService = Depends(get_gmail_service)
):
    """
    Get list of Gmail messages.
    
    Query examples:
    - from:example@gmail.com
    - subject:test
    - is:unread
    - is:read
    - has:attachment
    - after:2024/1/1
    - before:2024/12/31
    """
    try:
        result = gmail_service.get_messages(
            query=query,
            max_results=max_results,
            page_token=page_token
        )
        
        # Parse messages
        parsed_messages = []
        for msg in result.get('messages', []):
            full_message = gmail_service.get_message(msg['id'])
            parsed_messages.append(MessageResponse(**full_message))
        
        return MessagesListResponse(
            messages=parsed_messages,
            next_page_token=result.get('nextPageToken'),
            result_size_estimate=result.get('resultSizeEstimate', 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: str,
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use"),
    session: AsyncSession = Depends(get_db_session),
    gmail_service: GmailService = Depends(get_gmail_service)
):
    """Get full details of a specific message by ID."""
    try:
        message = gmail_service.get_message(message_id)
        return MessageResponse(**message)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{message_id}/attachments/{attachment_id}")
async def get_attachment(
    message_id: str,
    attachment_id: str,
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use"),
    session: AsyncSession = Depends(get_db_session),
    gmail_service: GmailService = Depends(get_gmail_service)
):
    """Download an attachment from a message."""
    try:
        attachment_data = gmail_service.get_attachment(message_id, attachment_id)
        
        from fastapi.responses import Response
        
        return Response(
            content=attachment_data,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=attachment_{attachment_id}"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_messages(
    q: str = Query(..., description="Gmail search query"),
    max_results: int = Query(10, ge=1, le=500),
    page_token: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use"),
    session: AsyncSession = Depends(get_db_session),
    gmail_service: GmailService = Depends(get_gmail_service)
):
    """
    Search for messages using Gmail query syntax.
    
    This is an alias for /messages with query parameter.
    """
    try:
        result = gmail_service.search_messages(
            query=q,
            max_results=max_results,
            page_token=page_token
        )
        
        # Parse messages
        parsed_messages = []
        for msg in result.get('messages', []):
            full_message = gmail_service.get_message(msg['id'])
            parsed_messages.append(MessageResponse(**full_message))
        
        return MessagesListResponse(
            messages=parsed_messages,
            next_page_token=result.get('nextPageToken'),
            result_size_estimate=result.get('resultSizeEstimate', 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/status")
async def get_auth_status(
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use"),
    session: AsyncSession = Depends(get_db_session),
    gmail_service: GmailService = Depends(get_gmail_service)
):
    """Check Gmail API authentication status."""
    try:
        is_authenticated = gmail_service.authenticate()
        token_status = gmail_service.get_token_status()
        return {
            "authenticated": is_authenticated,
            "credentials_path": gmail_service.credentials_path,
            "token_path": gmail_service.token_path,
            "token_expires_at": token_status.get("expires_at"),
            "needs_refresh": token_status.get("needs_refresh", False),
            "has_refresh_token": token_status.get("has_refresh_token", False)
        }
    except Exception as e:
        return {
            "authenticated": False,
            "error": str(e)
        }


@router.post("/auth/refresh")
async def refresh_token(
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use"),
    session: AsyncSession = Depends(get_db_session),
    gmail_service: GmailService = Depends(get_gmail_service)
):
    """Manually trigger token refresh."""
    try:
        result = gmail_service.refresh_token()
        return result
    except Exception as e:
        return {
            "authenticated": False,
            "refreshed": False,
            "error": str(e)
        }

