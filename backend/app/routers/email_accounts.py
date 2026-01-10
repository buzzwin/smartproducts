"""Email account API routes for managing user email accounts."""
import os
import json
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

from database.database import RepositoryFactory, get_db_session
from database.config import db_config
from database.schema import (
    EmailAccountResponse,
    EmailAccountCreate,
    EmailAccountUpdate,
    OAuthInitRequest,
    OAuthInitResponse,
    OAuthCallbackRequest,
)
from database.models.base_models import EmailAccount
from app.services.encryption_service import EncryptionService
from app.services.gmail_service import GmailService, SCOPES

router = APIRouter(prefix="/api/email-accounts", tags=["email-accounts"])


def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "ENCRYPTION_KEY environment variable is not set. "
                "Please set it in your .env.local file. "
                "Generate a key using: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        )
    return EncryptionService(encryption_key=encryption_key)


def get_oauth_credentials_path() -> str:
    """Get path to OAuth2 credentials file."""
    return os.getenv(
        'GMAIL_CREDENTIALS_PATH',
        str(Path(__file__).parent.parent.parent / 'gmail_credentials.json')
    )


@router.get("", response_model=List[EmailAccountResponse])
async def get_email_accounts(
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all email accounts for a user."""
    repo = RepositoryFactory.get_email_account_repository(session)
    accounts = await repo.get_by_user_id(user_id)
    return [EmailAccountResponse(**a.model_dump()) for a in accounts]


@router.get("/{account_id}", response_model=EmailAccountResponse)
async def get_email_account(
    account_id: str,
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get a specific email account."""
    repo = RepositoryFactory.get_email_account_repository(session)
    account = await repo.get_by_id(account_id)
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    if account.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return EmailAccountResponse(**account.model_dump())


@router.post("", response_model=OAuthInitResponse, status_code=201)
async def create_email_account(
    request: OAuthInitRequest,
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Initiate OAuth flow to create a new email account."""
    credentials_path = get_oauth_credentials_path()
    
    if not os.path.exists(credentials_path):
        raise HTTPException(
            status_code=500,
            detail=f"Gmail credentials file not found at {credentials_path}. "
                   "Please download OAuth2 credentials from Google Cloud Console."
        )
    
    # Generate state token
    state = str(uuid.uuid4())
    
    # Create temporary account record (without credentials yet)
    repo = RepositoryFactory.get_email_account_repository(session)
    account = EmailAccount(
        user_id=user_id,
        email="",  # Will be set after OAuth callback
        name=request.name,
        is_active=False,  # Not active until OAuth completes
        is_default=False,
        credentials_encrypted=encryption_service.encrypt(state),  # Temporarily store state
    )
    account = await repo.create(account)
    
    if db_config.is_sql and session:
        await session.commit()
    
    # Create OAuth flow
    # Default to frontend callback URL for web apps
    redirect_uri = os.getenv(
        "GMAIL_OAUTH_REDIRECT_URI",
        "http://localhost:3000/api/email-accounts/oauth/callback"
    )
    
    flow = Flow.from_client_secrets_file(
        credentials_path,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    
    # Generate authorization URL
    authorization_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        state=state,
        prompt='consent'  # Force consent to get refresh token
    )
    
    return OAuthInitResponse(
        oauth_url=authorization_url,
        state=state,
        account_id=account.id
    )


@router.post("/{account_id}/oauth/callback", response_model=EmailAccountResponse)
async def oauth_callback(
    account_id: str,
    request: OAuthCallbackRequest,
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Complete OAuth flow and store credentials."""
    repo = RepositoryFactory.get_email_account_repository(session)
    account = await repo.get_by_id(account_id)
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    if account.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify state
    stored_state = encryption_service.decrypt(account.credentials_encrypted)
    if stored_state != request.state:
        raise HTTPException(status_code=400, detail="Invalid state token")
    
    # Exchange authorization code for tokens
    credentials_path = get_oauth_credentials_path()
    redirect_uri = os.getenv(
        "GMAIL_OAUTH_REDIRECT_URI",
        "http://localhost:3000/api/email-accounts/oauth/callback"
    )
    
    flow = Flow.from_client_secrets_file(
        credentials_path,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
        state=request.state
    )
    
    # Exchange code for token
    flow.fetch_token(code=request.code)
    credentials = flow.credentials
    
    # Get user's email from Gmail API
    gmail_service = GmailService.from_credentials_json(credentials.to_json())
    if not gmail_service.authenticate():
        raise HTTPException(status_code=500, detail="Failed to authenticate with Gmail API")
    
    # Get user profile to extract email
    try:
        profile = gmail_service.service.users().getProfile(userId='me').execute()
        user_email = profile.get('emailAddress', '')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user email: {str(e)}")
    
    # Encrypt and store credentials
    credentials_json = credentials.to_json()
    credentials_encrypted = encryption_service.encrypt(credentials_json)
    
    # Update account
    account.email = user_email
    account.credentials_encrypted = credentials_encrypted
    account.is_active = True
    account.last_authenticated_at = datetime.utcnow()
    
    # If this is the first account for the user, set it as default
    existing_accounts = await repo.get_by_user_id(user_id)
    if len(existing_accounts) == 1:  # Only this one
        account.is_default = True
    
    account = await repo.update(account.id, account)
    
    if db_config.is_sql and session:
        await session.commit()
    
    return EmailAccountResponse(**account.model_dump())


@router.put("/{account_id}", response_model=EmailAccountResponse)
async def update_email_account(
    account_id: str,
    updates: EmailAccountUpdate,
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Update an email account."""
    repo = RepositoryFactory.get_email_account_repository(session)
    account = await repo.get_by_id(account_id)
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    if account.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    if updates.name is not None:
        account.name = updates.name
    if updates.is_active is not None:
        account.is_active = updates.is_active
    if updates.is_default is not None:
        if updates.is_default:
            # Set as default (unset others)
            await repo.set_default(account_id, user_id)
        else:
            account.is_default = False
    
    account.updated_at = datetime.utcnow()
    account = await repo.update(account.id, account)
    
    if db_config.is_sql and session:
        await session.commit()
    
    return EmailAccountResponse(**account.model_dump())


@router.post("/{account_id}/set-default", response_model=EmailAccountResponse)
async def set_default_account(
    account_id: str,
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Set an email account as the default for a user."""
    repo = RepositoryFactory.get_email_account_repository(session)
    account = await repo.get_by_id(account_id)
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    if account.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not account.is_active:
        raise HTTPException(status_code=400, detail="Cannot set inactive account as default")
    
    await repo.set_default(account_id, user_id)
    
    if db_config.is_sql and session:
        await session.commit()
    
    # Reload account to get updated state
    account = await repo.get_by_id(account_id)
    return EmailAccountResponse(**account.model_dump())


@router.post("/{account_id}/refresh-token", response_model=EmailAccountResponse)
async def refresh_token(
    account_id: str,
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Refresh OAuth token for an email account."""
    repo = RepositoryFactory.get_email_account_repository(session)
    account = await repo.get_by_id(account_id)
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    if account.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Decrypt credentials
    credentials_json = encryption_service.decrypt(account.credentials_encrypted)
    
    # Create GmailService and refresh token
    gmail_service = GmailService.from_credentials_json(credentials_json)
    refresh_result = gmail_service.refresh_token()
    
    if not refresh_result.get("refreshed", False):
        raise HTTPException(
            status_code=400,
            detail=refresh_result.get("error", "Failed to refresh token")
        )
    
    # Update credentials if they were refreshed
    if "updated_credentials_json" in refresh_result:
        account.credentials_encrypted = encryption_service.encrypt(refresh_result["updated_credentials_json"])
        account.last_authenticated_at = datetime.utcnow()
        account.updated_at = datetime.utcnow()
        account = await repo.update(account.id, account)
        
        if db_config.is_sql and session:
            await session.commit()
    
    return EmailAccountResponse(**account.model_dump())


@router.delete("/{account_id}", status_code=204)
async def delete_email_account(
    account_id: str,
    user_id: str = Query(..., description="User ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Delete an email account."""
    repo = RepositoryFactory.get_email_account_repository(session)
    account = await repo.get_by_id(account_id)
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    if account.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await repo.delete(account_id)
    
    if db_config.is_sql and session:
        await session.commit()
    
    return None

