"""Generic ProcessedEmail model for storing email analysis results."""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ProcessedEmail(BaseModel):
    """
    Generic processed email from Gmail for AI analysis.
    
    This model is domain-agnostic and contains only generic extracted information.
    Calling applications map these generic fields to their own domain models.
    """
    id: Optional[str] = None
    email_id: str  # Gmail message ID
    thread_id: str  # Gmail thread ID
    from_email: str
    subject: str
    received_date: datetime
    processed_at: Optional[datetime] = None
    status: str = "pending"  # "pending", "approved", "rejected", "sent"
    suggested_entity_type: str  # "feature", "task", "response", "no_action"
    suggested_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Generic extracted data: title, description, priority, status, assignees, due_date, etc."
    )
    confidence_score: Optional[float] = None  # Confidence in the analysis (0.0-1.0)
    gmail_label_id: Optional[str] = None  # Gmail label ID if labeled
    email_body: Optional[str] = None  # Full email body text
    email_html: Optional[str] = None  # Full email body HTML
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

