"""Email processing service that integrates GmailService with LangGraph agent."""
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from app.services.gmail_service import GmailService
from app.services.email_agent import EmailAgent
from app.services.task_correlator import TaskCorrelator
from app.services.encryption_service import EncryptionService
from database.database import RepositoryFactory, get_db_session
from database.models.base_models import ProcessedEmail


class EmailProcessor:
    """Service for processing emails through the AI agent."""
    
    def __init__(self, gmail_service: Optional[GmailService] = None, 
                 user_id: Optional[str] = None, 
                 email_account_id: Optional[str] = None):
        """
        Initialize the email processor.
        
        Args:
            gmail_service: Optional GmailService instance (if None, will be created from account)
            user_id: User ID (Clerk) - required if email_account_id is provided
            email_account_id: Email account ID to use for processing
        """
        self.user_id = user_id
        self.email_account_id = email_account_id
        
        if gmail_service:
            self.gmail_service = gmail_service
        else:
            # Will be initialized in _initialize_gmail_service
            self.gmail_service = None
        
        self.task_correlator = TaskCorrelator()
        self.email_agent = None  # Will be initialized after GmailService
        self.processed_label_id = None
        self.target_email = os.getenv("GMAIL_TARGET_EMAIL", "gunjan@quacito.com")
    
    async def _initialize_gmail_service(self, session=None):
        """Initialize GmailService from email account if account_id is provided."""
        if self.gmail_service:
            return  # Already initialized
        
        if self.email_account_id and self.user_id:
            # Load account from database
            repo = RepositoryFactory.get_email_account_repository(session)
            account = await repo.get_by_id(self.email_account_id)
            
            if not account:
                raise ValueError(f"Email account {self.email_account_id} not found")
            
            if account.user_id != self.user_id:
                raise ValueError("Access denied: email account does not belong to user")
            
            if not account.is_active:
                raise ValueError("Email account is not active")
            
            # Decrypt credentials
            encryption_service = EncryptionService()
            credentials_json = encryption_service.decrypt(account.credentials_encrypted)
            
            # Create GmailService with account credentials
            self.gmail_service = GmailService.from_credentials_json(credentials_json)
            self.target_email = account.email
        else:
            # Fallback to file-based authentication
            self.gmail_service = GmailService()
        
        # Initialize email agent
        self.email_agent = EmailAgent(self.gmail_service, self.task_correlator)
    
    async def _ensure_label_exists(self) -> Optional[str]:
        """Ensure the 'Processed by AI' label exists in Gmail."""
        try:
            label_name = os.getenv("GMAIL_PROCESSED_LABEL", "Processed by AI")
            # Note: GmailService would need label management methods
            # For now, return None and handle labeling later
            return None
        except Exception as e:
            print(f"Warning: Could not ensure label exists: {str(e)}")
            return None
    
    async def _get_unprocessed_emails(self, max_results: int = 10, 
                                      since_date: Optional[datetime] = None,
                                      session=None) -> List[Dict]:
        """Get unprocessed emails from Gmail."""
        try:
            # Initialize GmailService if needed
            if not self.gmail_service:
                await self._initialize_gmail_service(session)
            
            # Authenticate
            if not self.gmail_service.authenticate():
                raise Exception("Failed to authenticate with Gmail")
            
            # Build query to filter for target email
            query = f"to:{self.target_email} is:unread"
            if since_date:
                # Gmail date format: YYYY/MM/DD
                date_str = since_date.strftime("%Y/%m/%d")
                query += f" after:{date_str}"
            
            # Get messages
            result = self.gmail_service.get_messages(query=query, max_results=max_results)
            messages = result.get("messages", [])
            
            # Filter out already processed emails
            if session is None:
                from database.database import get_db_session_context
                async with get_db_session_context() as db_session:
                    return await self._filter_processed_emails(messages, db_session)
            else:
                return await self._filter_processed_emails(messages, session)
        except Exception as e:
            print(f"Error getting unprocessed emails: {str(e)}")
            return []
    
    async def _filter_processed_emails(self, messages: List[Dict], session) -> List[Dict]:
        """Filter out already processed emails."""
        repo = RepositoryFactory.get_processed_email_repository(session)
        processed_emails = []
        
        for msg in messages:
            email_id = msg["id"]
            existing = await repo.get_by_email_id(email_id)
            if not existing:
                # Get full message details
                full_message = self.gmail_service.get_message(email_id)
                processed_emails.append({
                    "id": email_id,
                    "thread_id": full_message.get("threadId", ""),
                    "from_email": full_message.get("from_email", ""),
                    "subject": full_message.get("subject", ""),
                    "date": full_message.get("date", ""),
                    "body_text": full_message.get("body_text", ""),
                    "body_html": full_message.get("body_html")
                })
        
        return processed_emails
    
    async def process_emails(self, max_emails: int = 10, 
                            since_date: Optional[datetime] = None,
                            session=None) -> List[ProcessedEmail]:
        """
        Process emails through the AI agent.
        
        Args:
            max_emails: Maximum number of emails to process
            since_date: Only process emails after this date
            session: Optional database session
        
        Returns:
            List of ProcessedEmail objects
        """
        try:
            # Initialize GmailService if needed
            if not self.gmail_service:
                await self._initialize_gmail_service(session)
            
            # Get unprocessed emails
            emails = await self._get_unprocessed_emails(max_emails, since_date, session)
            
            if not emails:
                return []
            
            # Ensure label exists
            await self._ensure_label_exists()
            
            processed = []
            for email_data in emails:
                try:
                    # Parse date
                    date_str = email_data.get("date", "")
                    # Try to parse Gmail date format
                    try:
                        from email.utils import parsedate_to_datetime
                        received_date = parsedate_to_datetime(date_str)
                    except:
                        received_date = datetime.utcnow()
                    
                    # Process through agent
                    import sys
                    print(f"[EMAIL PROCESSOR] Processing email {email_data.get('id', 'unknown')}", file=sys.stderr, flush=True)
                    processed_email = await self.email_agent.process_email(
                        email_id=email_data["id"],
                        thread_id=email_data["thread_id"],
                        from_email=email_data["from_email"],
                        subject=email_data["subject"],
                        received_date=received_date,
                        email_body=email_data.get("body_text", ""),
                        email_html=email_data.get("body_html")
                    )
                    
                    if processed_email:
                        print(f"[EMAIL PROCESSOR] Successfully processed email {email_data.get('id', 'unknown')}, status: {processed_email.status}, entity_type: {processed_email.suggested_entity_type}", file=sys.stderr, flush=True)
                        processed.append(processed_email)
                    else:
                        print(f"[EMAIL PROCESSOR] Email {email_data.get('id', 'unknown')} filtered out (no_action) - not stored", file=sys.stderr, flush=True)
                        
                except Exception as e:
                    import sys
                    import traceback
                    print(f"[EMAIL PROCESSOR] ERROR processing email {email_data.get('id', 'unknown')}: {str(e)}", file=sys.stderr, flush=True)
                    print(f"[EMAIL PROCESSOR] Traceback:", file=sys.stderr, flush=True)
                    print(traceback.format_exc(), file=sys.stderr, flush=True)
                    continue
            
            return processed
            
        except Exception as e:
            print(f"Error in process_emails: {str(e)}")
            return []
    
    async def get_processing_stats(self) -> Dict[str, any]:
        """Get statistics about email processing."""
        try:
            from database.database import get_db_session_context
            async with get_db_session_context() as session:
                repo = RepositoryFactory.get_processed_email_repository(session)
                
                all_emails = await repo.get_all()
                pending = await repo.get_by_status("pending")
                approved = await repo.get_by_status("approved")
                rejected = await repo.get_by_status("rejected")
                created = await repo.get_by_status("created")
                correlated = await repo.get_by_status("correlated")
                sent = await repo.get_by_status("sent")
                
                # Count by entity type
                features = await repo.get_by_entity_type("feature")
                tasks = await repo.get_by_entity_type("task")
                responses = await repo.get_by_entity_type("response")
                correlations = await repo.get_by_entity_type("correlate_task")
                
                return {
                    "total_emails": len(all_emails),
                    "processed_count": len(all_emails) - len(pending),
                    "pending_suggestions": len(pending),
                    "correlated_count": len(correlated),
                    "created_features": len([e for e in created if e.suggested_entity_type == "feature"]),
                    "created_tasks": len([e for e in created if e.suggested_entity_type == "task"]),
                    "sent_responses": len(sent),
                    "recent_activity": len([e for e in all_emails 
                                           if e.processed_at and 
                                           (datetime.utcnow() - e.processed_at.replace(tzinfo=None)).days < 7])
                }
        except Exception as e:
            print(f"Error getting processing stats: {str(e)}")
            return {}

