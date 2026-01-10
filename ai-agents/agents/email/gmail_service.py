"""Gmail API service for reading emails."""
import os
import base64
import json
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Gmail API scopes
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
]


class GmailService:
    """Service for interacting with Gmail API."""
    
    def __init__(self, credentials_path: Optional[str] = None, token_path: Optional[str] = None, 
                 credentials_json: Optional[str] = None):
        """
        Initialize Gmail service.
        
        Args:
            credentials_path: Path to OAuth2 credentials JSON file (for OAuth client config)
            token_path: Path to store/load OAuth2 token (for file-based auth)
            credentials_json: JSON string of OAuth2 token credentials (for database-stored auth)
        """
        self.credentials_path = credentials_path or os.getenv(
            'GMAIL_CREDENTIALS_PATH',
            str(Path(__file__).parent.parent.parent.parent / 'gmail_credentials.json')
        )
        self.token_path = token_path or os.getenv(
            'GMAIL_TOKEN_PATH',
            str(Path(__file__).parent.parent.parent.parent / 'gmail_token.json')
        )
        self.credentials_json = credentials_json  # Database-stored credentials
        self.service = None
        self.creds = None
    
    @classmethod
    def from_credentials_json(cls, credentials_json: str, credentials_path: Optional[str] = None):
        """
        Create GmailService instance from database-stored credentials JSON.
        
        Args:
            credentials_json: JSON string of OAuth2 token credentials
            credentials_path: Path to OAuth2 credentials JSON file (for OAuth client config)
        
        Returns:
            GmailService instance
        """
        return cls(credentials_path=credentials_path, credentials_json=credentials_json)
    
    def authenticate(self) -> bool:
        """
        Authenticate with Gmail API using OAuth2.
        
        Returns:
            True if authentication successful, False otherwise
        """
        try:
            # If credentials_json is provided (from database), use it
            if self.credentials_json:
                try:
                    creds_dict = json.loads(self.credentials_json)
                    self.creds = Credentials.from_authorized_user_info(creds_dict, SCOPES)
                    
                    # Refresh if expired
                    if self.creds and self.creds.expired and self.creds.refresh_token:
                        self.creds.refresh(Request())
                    
                    # Build the Gmail service
                    if self.creds and self.creds.valid:
                        self.service = build('gmail', 'v1', credentials=self.creds)
                        return True
                    else:
                        return False
                except json.JSONDecodeError as e:
                    print(f"Error parsing credentials JSON: {e}")
                    return False
                except Exception as e:
                    print(f"Error loading credentials from JSON: {e}")
                    return False
            
            # Fallback to file-based authentication
            # Load existing token if available
            if os.path.exists(self.token_path):
                self.creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
            
            # If there are no (valid) credentials available, let the user log in
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                else:
                    if not os.path.exists(self.credentials_path):
                        raise FileNotFoundError(
                            f"Gmail credentials file not found at {self.credentials_path}. "
                            "Please download OAuth2 credentials from Google Cloud Console."
                        )
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path, SCOPES
                    )
                    self.creds = flow.run_local_server(port=0)
                
                # Save the credentials for the next run
                with open(self.token_path, 'w') as token:
                    token.write(self.creds.to_json())
            
            # Build the Gmail service
            self.service = build('gmail', 'v1', credentials=self.creds)
            return True
            
        except Exception as e:
            print(f"Error authenticating with Gmail: {e}")
            return False
    
    def get_messages(
        self,
        query: Optional[str] = None,
        max_results: int = 10,
        page_token: Optional[str] = None
    ) -> Dict:
        """
        Get list of messages from Gmail.
        
        Args:
            query: Gmail search query (e.g., 'from:example@gmail.com', 'subject:test')
            max_results: Maximum number of messages to return
            page_token: Token for pagination
        
        Returns:
            Dictionary with messages list and nextPageToken if available
        """
        if not self.service:
            if not self.authenticate():
                raise Exception("Failed to authenticate with Gmail API")
        
        try:
            # Build query parameters
            params = {
                'userId': 'me',
                'maxResults': max_results,
            }
            
            if query:
                params['q'] = query
            
            if page_token:
                params['pageToken'] = page_token
            
            # Get messages
            results = self.service.users().messages().list(**params).execute()
            messages = results.get('messages', [])
            
            return {
                'messages': messages,
                'nextPageToken': results.get('nextPageToken'),
                'resultSizeEstimate': results.get('resultSizeEstimate', 0)
            }
            
        except HttpError as error:
            print(f"An error occurred: {error}")
            raise
    
    def get_message(self, message_id: str) -> Dict:
        """
        Get full message details by ID.
        
        Args:
            message_id: Gmail message ID
        
        Returns:
            Full message object with headers, body, etc.
        """
        if not self.service:
            if not self.authenticate():
                raise Exception("Failed to authenticate with Gmail API")
        
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            return self._parse_message(message)
            
        except HttpError as error:
            print(f"An error occurred: {error}")
            raise
    
    def _parse_message(self, message: Dict) -> Dict:
        """
        Parse Gmail message into a more readable format.
        
        Args:
            message: Raw Gmail message object
        
        Returns:
            Parsed message dictionary
        """
        payload = message.get('payload', {})
        headers = payload.get('headers', [])
        
        # Extract headers
        header_dict = {h['name']: h['value'] for h in headers}
        
        # Get body
        body_text = ''
        body_html = ''
        
        if 'parts' in payload:
            for part in payload['parts']:
                mime_type = part.get('mimeType', '')
                body_data = part.get('body', {}).get('data', '')
                
                if mime_type == 'text/plain' and body_data:
                    body_text = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')
                elif mime_type == 'text/html' and body_data:
                    body_html = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')
        else:
            # Single part message
            body_data = payload.get('body', {}).get('data', '')
            if body_data:
                body_text = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')
        
        # Parse date
        date_str = header_dict.get('Date', '')
        parsed_date = None
        if date_str:
            try:
                from email.utils import parsedate_to_datetime
                parsed_date = parsedate_to_datetime(date_str)
            except:
                pass
        
        return {
            'id': message.get('id'),
            'threadId': message.get('threadId'),
            'snippet': message.get('snippet', ''),
            'subject': header_dict.get('Subject', ''),
            'from_email': header_dict.get('From', ''),
            'to': header_dict.get('To', ''),
            'cc': header_dict.get('Cc', ''),
            'bcc': header_dict.get('Bcc', ''),
            'date': parsed_date.isoformat() if parsed_date else date_str,
            'labels': message.get('labelIds', []),
            'body_text': body_text,
            'body_html': body_html,
            'attachments': self._get_attachments(payload),
            'size_estimate': message.get('sizeEstimate', 0)
        }
    
    def _get_attachments(self, payload: Dict) -> List[Dict]:
        """Extract attachment information from message payload."""
        attachments = []
        
        def extract_from_parts(parts):
            for part in parts:
                if part.get('filename'):
                    attachments.append({
                        'filename': part.get('filename'),
                        'mime_type': part.get('mimeType', ''),
                        'size': part.get('body', {}).get('size', 0),
                        'attachment_id': part.get('body', {}).get('attachmentId')
                    })
                if 'parts' in part:
                    extract_from_parts(part['parts'])
        
        if 'parts' in payload:
            extract_from_parts(payload['parts'])
        
        return attachments
    
    def send_reply(self, message_id: str, thread_id: str, reply_text: str, 
                   to: Optional[str] = None, cc: Optional[str] = None) -> Dict:
        """
        Send a reply to a Gmail message.
        
        Args:
            message_id: Original message ID
            thread_id: Thread ID to reply in
            reply_text: Text content of the reply
            to: Recipient email (defaults to original sender)
            cc: CC recipients (comma-separated email addresses)
        
        Returns:
            Dictionary with sent message info
        """
        if not self.service:
            if not self.authenticate():
                raise Exception("Failed to authenticate with Gmail API")
        
        try:
            # Get original message to get headers
            original_message_raw = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            # Extract headers from original message
            headers = original_message_raw.get('payload', {}).get('headers', [])
            header_dict = {h['name']: h['value'] for h in headers}
            
            # Get recipient (default to original sender)
            if not to:
                to = header_dict.get('From', '')
            
            # Get original CC recipients
            original_cc = header_dict.get('Cc', '')
            
            # Get subject and Message-ID from original
            original_subject = header_dict.get('Subject', '')
            original_message_id = header_dict.get('Message-ID', '')
            
            # Build reply subject
            if original_subject.startswith("Re:"):
                reply_subject = original_subject
            else:
                reply_subject = f"Re: {original_subject}"
            
            # Create message
            from email.mime.text import MIMEText
            
            message = MIMEText(reply_text)
            message['to'] = to
            message['subject'] = reply_subject
            
            # Combine original CC with new CC if provided
            cc_list = []
            if original_cc:
                cc_list.append(original_cc)
            if cc:
                cc_list.append(cc)
            
            if cc_list:
                # Join all CC addresses, handling comma-separated values
                combined_cc = ', '.join(cc_list)
                message['cc'] = combined_cc
            
            # Set In-Reply-To and References headers if we have the original Message-ID
            if original_message_id:
                message['In-Reply-To'] = original_message_id
                # Build References header - include original and any existing references
                references = header_dict.get('References', '')
                if references:
                    message['References'] = f"{references} {original_message_id}"
                else:
                    message['References'] = original_message_id
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Send message
            send_message = {
                'raw': raw_message,
                'threadId': thread_id
            }
            
            result = self.service.users().messages().send(
                userId='me',
                body=send_message
            ).execute()
            
            return result
            
        except HttpError as error:
            error_details = error.error_details if hasattr(error, 'error_details') else str(error)
            print(f"An error occurred sending reply: {error}")
            print(f"Error details: {error_details}")
            raise Exception(f"Failed to send Gmail reply: {str(error)}")
        except Exception as e:
            print(f"Unexpected error sending reply: {e}")
            import traceback
            print(traceback.format_exc())
            raise

