"""Generic email processing service that integrates GmailService with LangGraph agent."""
import os
from datetime import datetime, timedelta
from typing import List, Optional
from pathlib import Path

from ..gmail_service import GmailService
from .email_agent import EmailAgent
from ...models.processed_email import ProcessedEmail
from ...storage.in_memory_repository import InMemoryProcessedEmailRepository


class EmailProcessor:
    """Generic service for processing emails through the AI agent."""
    
    def __init__(
        self, 
        gmail_service: Optional[GmailService] = None,
        repository: Optional[InMemoryProcessedEmailRepository] = None
    ):
        """
        Initialize the email processor.
        
        Args:
            gmail_service: Optional GmailService instance (if None, will be created)
            repository: Optional repository instance (if None, will create new in-memory repository)
        """
        if gmail_service:
            self.gmail_service = gmail_service
        else:
            # Create GmailService from environment or defaults
            credentials_path = os.getenv(
                'GMAIL_CREDENTIALS_PATH',
                str(Path(__file__).parent.parent.parent.parent / 'gmail_credentials.json')
            )
            self.gmail_service = GmailService(credentials_path=credentials_path)
        
        # Initialize repository
        if repository:
            self.repository = repository
        else:
            self.repository = InMemoryProcessedEmailRepository()
        
        # Initialize email agent
        self.email_agent = EmailAgent(
            gmail_service=self.gmail_service,
            repository=self.repository
        )
        
        # Authenticate Gmail service
        if not self.gmail_service.authenticate():
            raise Exception("Failed to authenticate with Gmail API")
    
    async def process_emails(
        self,
        max_emails: int = 10,
        since_date: Optional[datetime] = None,
        query: Optional[str] = None
    ) -> List[ProcessedEmail]:
        """
        Process emails from Gmail through the AI agent.
        
        Args:
            max_emails: Maximum number of emails to process
            since_date: Only process emails after this date
            query: Optional Gmail search query (e.g., 'is:unread')
        
        Returns:
            List of ProcessedEmail objects
        """
        processed = []
        
        # Build Gmail query
        gmail_query = query or ""
        if since_date:
            # Gmail date format: after:YYYY/MM/DD
            date_str = since_date.strftime("%Y/%m/%d")
            if gmail_query:
                gmail_query = f"{gmail_query} after:{date_str}"
            else:
                gmail_query = f"after:{date_str}"
        
        # Get messages from Gmail
        try:
            result = self.gmail_service.get_messages(
                query=gmail_query,
                max_results=max_emails
            )
            messages = result.get('messages', [])
        except Exception as e:
            print(f"Error fetching messages from Gmail: {e}")
            return processed
        
        # Filter out already processed emails
        processed_email_ids = set()
        existing_emails = await self.repository.get_all()
        for existing in existing_emails:
            processed_email_ids.add(existing.email_id)
        
        # Process each message
        for message in messages:
            message_id = message.get('id')
            if not message_id:
                continue
            
            # Skip if already processed
            if message_id in processed_email_ids:
                continue
            
            try:
                # Get full message details
                message_data = self.gmail_service.get_message(message_id)
                
                # Parse received date
                received_date_str = message_data.get('date', '')
                try:
                    from email.utils import parsedate_to_datetime
                    received_date = parsedate_to_datetime(received_date_str)
                except:
                    received_date = datetime.utcnow()
                
                # Process email through agent
                processed_email = await self.email_agent.process_email(
                    email_id=message_id,
                    thread_id=message_data.get('threadId', ''),
                    from_email=message_data.get('from_email', ''),
                    subject=message_data.get('subject', ''),
                    received_date=received_date,
                    email_body=message_data.get('body_text'),
                    email_html=message_data.get('body_html')
                )
                
                if processed_email:
                    processed.append(processed_email)
                    processed_email_ids.add(message_id)
            
            except Exception as e:
                print(f"Error processing email {message_id}: {e}")
                continue
        
        return processed
    
    async def get_processed_emails(
        self,
        status: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> List[ProcessedEmail]:
        """
        Get processed emails with optional filters.
        
        Args:
            status: Filter by status (pending, approved, rejected, sent)
            entity_type: Filter by entity type (feature, task, response)
        
        Returns:
            List of ProcessedEmail objects
        """
        all_emails = await self.repository.get_all()
        
        if status:
            all_emails = [e for e in all_emails if e.status == status]
        
        if entity_type:
            all_emails = [e for e in all_emails if e.suggested_entity_type == entity_type]
        
        return all_emails

