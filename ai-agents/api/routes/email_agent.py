"""Generic email agent API routes."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ...agents.email.email_processor import EmailProcessor
from ...agents.email.gmail_service import GmailService
from ...storage.in_memory_repository import InMemoryProcessedEmailRepository
from ...models.processed_email import ProcessedEmail

router = APIRouter(prefix="/email-agent", tags=["email-agent"])

# Singleton instances (in production, use dependency injection)
_repository: Optional[InMemoryProcessedEmailRepository] = None
_email_processor: Optional[EmailProcessor] = None


def get_repository() -> InMemoryProcessedEmailRepository:
    """Get or create repository singleton."""
    global _repository
    if _repository is None:
        _repository = InMemoryProcessedEmailRepository()
    return _repository


def get_email_processor() -> EmailProcessor:
    """Get or create email processor singleton."""
    global _email_processor
    if _email_processor is None:
        repository = get_repository()
        _email_processor = EmailProcessor(repository=repository)
    return _email_processor


class ProcessResponse(BaseModel):
    """Response model for process endpoint."""
    processed_count: int
    suggestions: List[ProcessedEmail]
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


@router.post("/process")
async def process_emails(
    max_emails: int = Query(10, ge=1, le=50, description="Maximum number of emails to process"),
    since_date: Optional[datetime] = Query(None, description="Only process emails after this date"),
    query: Optional[str] = Query(None, description="Gmail search query (e.g., 'is:unread')"),
    user_id: Optional[str] = Query(None, description="User ID (ignored - for compatibility)"),
    email_account_id: Optional[str] = Query(None, description="Email account ID (ignored - for compatibility)")
):
    """
    Process emails from Gmail through the AI agent.
    
    Returns generic analysis results that can be mapped to any domain model.
    Note: user_id and email_account_id are accepted for compatibility but ignored.
    """
    try:
        processor = get_email_processor()
        processed = await processor.process_emails(
            max_emails=max_emails,
            since_date=since_date,
            query=query
        )
        # Always return a valid response, even if empty
        # Return as dict to match frontend expectations
        response_dict = {
            "processed_count": len(processed),
            "suggestions": [p.model_dump() for p in processed] if processed else []
        }
        print(f"[API] Processed {len(processed)} emails, returning {len(response_dict['suggestions'])} suggestions")
        return response_dict
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"[API ERROR] Failed to process emails: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions", response_model=List[ProcessedEmail])
async def get_suggestions(
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, rejected, sent)"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (feature, task, response)")
):
    """
    Get all processed email suggestions.
    
    Returns generic results that can be mapped to any domain model.
    """
    try:
        processor = get_email_processor()
        suggestions = await processor.get_processed_emails(
            status=status,
            entity_type=entity_type
        )
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions/{suggestion_id}", response_model=ProcessedEmail)
async def get_suggestion(suggestion_id: str):
    """
    Get a specific processed email suggestion by ID.
    
    Returns generic result that can be mapped to any domain model.
    """
    try:
        repository = get_repository()
        suggestion = await repository.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        return suggestion
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/suggestions/{suggestion_id}", status_code=204)
async def delete_suggestion(suggestion_id: str):
    """
    Delete a processed email suggestion by ID.
    """
    try:
        repository = get_repository()
        success = await repository.delete(suggestion_id)
        if not success:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

