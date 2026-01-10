"""Email agent API routes."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database.database import RepositoryFactory, get_db_session
from database.config import db_config
from database.schema import (
    ProcessedEmailResponse,
    ProcessedEmailUpdate,
)
from app.services.email_processor import EmailProcessor
from app.services.gmail_service import GmailService
from app.services.task_correlator import TaskCorrelator
from app.services.email_agent import EmailAgent


router = APIRouter(prefix="/api/email-agent", tags=["email-agent"])


def get_email_processor() -> EmailProcessor:
    """Dependency to get email processor instance."""
    return EmailProcessor()


def get_gmail_service() -> GmailService:
    """Dependency to get Gmail service instance."""
    return GmailService()


@router.post("/process")
async def process_emails(
    max_emails: int = Query(10, ge=1, le=50, description="Maximum number of emails to process"),
    since_date: Optional[datetime] = Query(None, description="Only process emails after this date"),
    user_id: Optional[str] = Query(None, description="User ID (Clerk) - required if email_account_id is provided"),
    email_account_id: Optional[str] = Query(None, description="Email account ID to use for processing"),
    session: AsyncSession = Depends(get_db_session)
):
    """Trigger on-demand email processing."""
    try:
        # Create EmailProcessor with account-specific credentials if provided
        processor = EmailProcessor(user_id=user_id, email_account_id=email_account_id)
        processed = await processor.process_emails(max_emails=max_emails, since_date=since_date, session=session)
        return {
            "processed_count": len(processed),
            "suggestions": [ProcessedEmailResponse(**p.model_dump()) for p in processed]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions", response_model=List[ProcessedEmailResponse])
async def get_suggestions(
    status: Optional[str] = Query(None, description="Filter by status"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_db_session)
):
    """Get pending suggestions for review."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        
        if status:
            suggestions = await repo.get_by_status(status)
        elif entity_type:
            suggestions = await repo.get_by_entity_type(entity_type)
        else:
            suggestions = await repo.get_all()
        
        # Apply pagination
        suggestions = suggestions[offset:offset + limit]
        
        return [ProcessedEmailResponse(**s.model_dump()) for s in suggestions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions/{suggestion_id}", response_model=ProcessedEmailResponse)
async def get_suggestion(
    suggestion_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get suggestion details."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        return ProcessedEmailResponse(**suggestion.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ApproveRequest(BaseModel):
    """Request body for approving a suggestion."""
    product_id: Optional[str] = None
    module_id: Optional[str] = None
    response_text: Optional[str] = None
    cc: Optional[str] = None
    task_id: Optional[str] = None
    update_status: Optional[bool] = False
    add_comment: Optional[bool] = False
    status: Optional[str] = None
    comment_text: Optional[str] = None


@router.post("/suggestions/{suggestion_id}/approve")
async def approve_suggestion(
    suggestion_id: str,
    request: ApproveRequest = Body(...),
    session: AsyncSession = Depends(get_db_session)
):
    """Approve and create feature/task, correlate to task, or send response."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        if suggestion.status != "pending":
            raise HTTPException(status_code=400, detail="Suggestion is not pending")
        
        entity_type = suggestion.suggested_entity_type
        suggested_data = suggestion.suggested_data
        
        if entity_type == "feature":
            # Create feature
            from database.schema import FeatureCreate
            from database.models.base_models import Feature
            
            feature_data = FeatureCreate(
                product_id=request.product_id or suggested_data.get("product_id"),
                module_id=request.module_id or suggested_data.get("module_id"),
                name=suggested_data.get("name", ""),
                description=suggested_data.get("description"),
                status=suggested_data.get("status", "discovery"),
                owner=suggested_data.get("owner")
            )
            
            feature_repo = RepositoryFactory.get_feature_repository(session)
            feature = Feature(**feature_data.model_dump())
            created = await feature_repo.create(feature)
            if db_config.is_sql and session is not None:
                await session.commit()
            
            suggestion.status = "created"
            suggestion.created_entity_id = created.id
            await repo.update(suggestion_id, suggestion)
            if db_config.is_sql and session is not None:
                await session.commit()
            
            return {"message": "Feature created", "feature_id": created.id}
        
        elif entity_type == "task":
            # Create task
            from database.schema import TaskCreate
            from database.models.base_models import Task
            
            task_data = TaskCreate(
                product_id=request.product_id or suggested_data.get("product_id"),
                module_id=request.module_id or suggested_data.get("module_id"),
                feature_id=suggested_data.get("feature_id"),
                title=suggested_data.get("title", ""),
                description=suggested_data.get("description"),
                status=suggested_data.get("status", "todo"),
                priority=suggested_data.get("priority", "medium"),
                assignee_ids=suggested_data.get("assignee_ids", [])
            )
            
            task_repo = RepositoryFactory.get_task_repository(session)
            task = Task(**task_data.model_dump())
            created = await task_repo.create(task)
            if db_config.is_sql and session is not None:
                await session.commit()
            
            suggestion.status = "created"
            suggestion.created_entity_id = created.id
            await repo.update(suggestion_id, suggestion)
            if db_config.is_sql and session is not None:
                await session.commit()
            
            return {"message": "Task created", "task_id": created.id}
        
        elif entity_type == "response":
            # Send email response
            gmail_service = GmailService()
            reply_text = request.response_text or suggested_data.get("suggested_response_text", "")
            
            if not reply_text:
                raise HTTPException(status_code=400, detail="Response text is required")
            
            result = gmail_service.send_reply(
                message_id=suggestion.email_id,
                thread_id=suggestion.thread_id,
                reply_text=reply_text,
                cc=request.cc if hasattr(request, 'cc') else None
            )
            
            suggestion.status = "sent"
            await repo.update(suggestion_id, suggestion)
            if db_config.is_sql and session is not None:
                await session.commit()
            
            return {"message": "Response sent", "message_id": result.get("id")}
        
        elif entity_type == "correlate_task":
            # Correlate to existing task
            task_id = request.task_id or suggestion.correlated_task_id
            if not task_id:
                raise HTTPException(status_code=400, detail="Task ID is required for correlation")
            
            task_repo = RepositoryFactory.get_task_repository(session)
            task = await task_repo.get_by_id(task_id)
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
            
            # Update task status if requested
            if request.update_status and request.status:
                task.status = request.status
                await task_repo.update(task_id, task)
            
            # Add comment if requested
            if request.add_comment:
                suggested_data_dict = suggested_data or {}
                comment_text = request.comment_text or (suggested_data_dict.get("comment_text", "") if isinstance(suggested_data_dict, dict) else "")
                if comment_text:
                    import uuid
                    comment = {
                        "id": str(uuid.uuid4()),
                        "text": comment_text,
                        "author": suggestion.from_email,
                        "created_at": datetime.utcnow().isoformat(),
                        "source": "email",
                        "email_id": suggestion.email_id,
                        "email_subject": suggestion.subject
                    }
                    if not task.comments:
                        task.comments = []
                    task.comments.append(comment)
                    await task_repo.update(task_id, task)
            
            if db_config.is_sql and session is not None:
                await session.commit()
            
            suggestion.status = "correlated"
            suggestion.correlated_task_id = task_id
            await repo.update(suggestion_id, suggestion)
            if db_config.is_sql and session is not None:
                await session.commit()
            
            return {"message": "Email correlated to task", "task_id": task_id}
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown entity type: {entity_type}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggestions/{suggestion_id}/reject")
async def reject_suggestion(
    suggestion_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Reject suggestion."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        suggestion.status = "rejected"
        await repo.update(suggestion_id, suggestion)
        if db_config.is_sql and session is not None:
            await session.commit()
        
        return {"message": "Suggestion rejected"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggestions/{suggestion_id}/update")
async def update_suggestion(
    suggestion_id: str,
    update: ProcessedEmailUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update suggestion before approval."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        update_data = update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(suggestion, key, value)
        
        await repo.update(suggestion_id, suggestion)
        if db_config.is_sql and session is not None:
            await session.commit()
        
        return ProcessedEmailResponse(**suggestion.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SendResponseRequest(BaseModel):
    """Request body for sending email response."""
    response_text: Optional[str] = None
    to: Optional[str] = None
    cc: Optional[str] = None


@router.post("/suggestions/{suggestion_id}/send-response")
async def send_response(
    suggestion_id: str,
    request: SendResponseRequest = Body(...),
    session: AsyncSession = Depends(get_db_session),
    gmail_service: GmailService = Depends(get_gmail_service)
):
    """Send email response via Gmail API."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # Allow sending responses for any entity type (task, feature, response, etc.)
        suggested_data = suggestion.suggested_data or {}
        reply_text = request.response_text or (suggested_data.get("suggested_response_text", "") if isinstance(suggested_data, dict) else "")
        if not reply_text:
            raise HTTPException(status_code=400, detail="Response text is required")
        
        result = gmail_service.send_reply(
            message_id=suggestion.email_id,
            thread_id=suggestion.thread_id,
            reply_text=reply_text,
            to=request.to,
            cc=request.cc
        )
        
        from database.config import db_config
        suggestion.status = "sent"
        await repo.update(suggestion_id, suggestion)
        # Only commit for SQL databases (MongoDB doesn't use sessions/commits)
        if db_config.is_sql and session is not None:
            await session.commit()
        
        return {"message": "Response sent", "message_id": result.get("id")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CorrelateRequest(BaseModel):
    """Request body for correlating email to task."""
    task_id: str
    update_status: Optional[bool] = False
    status: Optional[str] = None
    add_comment: Optional[bool] = False
    comment_text: Optional[str] = None


@router.post("/suggestions/{suggestion_id}/correlate")
async def correlate_to_task(
    suggestion_id: str,
    request: CorrelateRequest = Body(...),
    session: AsyncSession = Depends(get_db_session)
):
    """Correlate email to existing task."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        task_repo = RepositoryFactory.get_task_repository(session)
        task = await task_repo.get_by_id(request.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Update task status if requested
        if request.update_status and request.status:
            if request.status not in ["todo", "in_progress", "blocked", "done"]:
                raise HTTPException(status_code=400, detail="Invalid status")
            task.status = request.status
            await task_repo.update(request.task_id, task)
        
        # Add comment if requested
        if request.add_comment:
            suggested_data = suggestion.suggested_data or {}
            comment_text = request.comment_text or suggested_data.get("comment_text", "") if isinstance(suggested_data, dict) else (request.comment_text or "")
            if comment_text:
                import uuid
                comment = {
                    "id": str(uuid.uuid4()),
                    "text": comment_text,
                    "author": suggestion.from_email,
                    "created_at": datetime.utcnow().isoformat(),
                    "source": "email",
                    "email_id": suggestion.email_id,
                    "email_subject": suggestion.subject
                }
                if not task.comments:
                    task.comments = []
                task.comments.append(comment)
                await task_repo.update(request.task_id, task)
        
        # Only commit for SQL databases (MongoDB doesn't use sessions/commits)
        if db_config.is_sql and session is not None:
            await session.commit()
        
        suggestion.status = "correlated"
        suggestion.correlated_task_id = request.task_id
        await repo.update(suggestion_id, suggestion)
        
        # Only commit for SQL databases (MongoDB doesn't use sessions/commits)
        if db_config.is_sql and session is not None:
            await session.commit()
        
        return {"message": "Email correlated to task", "task_id": request.task_id}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error correlating task: {error_details}", flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to correlate task: {str(e)}")


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    processor: EmailProcessor = Depends(get_email_processor)
):
    """Get dashboard statistics."""
    try:
        stats = await processor.get_processing_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/activity")
async def get_activity_feed(
    limit: int = Query(50, ge=1, le=100),
    since_date: Optional[datetime] = Query(None),
    session: AsyncSession = Depends(get_db_session)
):
    """Get recent email processing activity."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        all_emails = await repo.get_all()
        
        # Filter by date if provided
        if since_date:
            all_emails = [e for e in all_emails 
                         if e.processed_at and e.processed_at.replace(tzinfo=None) >= since_date]
        
        # Sort by processed_at descending
        all_emails.sort(key=lambda x: x.processed_at or datetime.min, reverse=True)
        
        # Apply limit
        all_emails = all_emails[:limit]
        
        return [ProcessedEmailResponse(**e.model_dump()) for e in all_emails]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions/{suggestion_id}/matching-tasks")
async def get_matching_tasks(
    suggestion_id: str,
    product_id: Optional[str] = Query(None),
    module_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db_session)
):
    """Find matching tasks for a suggestion."""
    try:
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # Use product_id from query or suggestion data
        suggested_data = suggestion.suggested_data or {}
        search_product_id = product_id or (suggested_data.get("product_id") if isinstance(suggested_data, dict) else None)
        search_module_id = module_id or (suggested_data.get("module_id") if isinstance(suggested_data, dict) else None)
        
        # Get email content for matching
        email_content = suggestion.email_body or suggestion.subject or ""
        
        # Use task correlator to find matches
        from app.services.task_correlator import TaskCorrelator
        correlator = TaskCorrelator()
        matches = await correlator.find_matching_tasks(
            email_content,
            search_product_id,
            search_module_id
        )
        
        # Format matches for response
        formatted_matches = [
            {
                "task_id": match["task_id"],
                "task_title": match.get("task_title", ""),
                "confidence": match.get("confidence", 0.0)
            }
            for match in matches
        ]
        
        return {"matches": formatted_matches}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/suggestions/{suggestion_id}")
async def delete_suggestion(
    suggestion_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a processed email suggestion."""
    try:
        from database.config import db_config
        repo = RepositoryFactory.get_processed_email_repository(session)
        suggestion = await repo.get_by_id(suggestion_id)
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        await repo.delete(suggestion_id)
        # Only commit for SQL databases (MongoDB doesn't use sessions/commits)
        if db_config.is_sql and session is not None:
            await session.commit()
        
        return {"message": "Suggestion deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

