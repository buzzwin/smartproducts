"""Generic LangGraph agent for email analysis and processing."""
import os
import json
import re
import uuid
from datetime import datetime
from typing import TypedDict, Optional, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from ..base.base_agent import BaseAgent
from .gmail_service import GmailService
from ...models.processed_email import ProcessedEmail
from ...storage.base_repository import BaseRepository


class EmailAgentState(TypedDict):
    """State for the email agent workflow."""
    email_id: str
    thread_id: str
    from_email: str
    subject: str
    received_date: datetime
    email_body: str
    email_html: Optional[str]
    entity_type: Optional[str]  # "feature", "task", "response", "no_action"
    suggested_data: Dict[str, Any]
    confidence_score: Optional[float]
    error: Optional[str]


class EmailAgent(BaseAgent):
    """Generic LangGraph-based agent for analyzing emails and extracting information."""
    
    def __init__(
        self, 
        gmail_service: GmailService,
        repository: BaseRepository[ProcessedEmail]
    ):
        """
        Initialize the email agent.
        
        Args:
            gmail_service: GmailService instance for fetching emails
            repository: Repository for storing processed emails
        """
        super().__init__("email_agent")
        self.gmail_service = gmail_service
        self.repository = repository
        
        # Initialize LLM
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("EMAIL_AGENT_AI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY or EMAIL_AGENT_AI_API_KEY environment variable is required")
        
        model_name = os.getenv("EMAIL_AGENT_AI_MODEL", "gemini-3-flash-preview")
        self.llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.3,
        )
        
        # Build the workflow graph
        self.workflow = self.build_workflow()
    
    def build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(EmailAgentState)
        
        # Add nodes
        workflow.add_node("parse_email", self._parse_email_node)
        workflow.add_node("analyze_email", self._analyze_email_node)
        workflow.add_node("store_suggestion", self._store_suggestion_node)
        workflow.add_node("error_handler", self._error_handler_node)
        
        # Set entry point
        workflow.set_entry_point("parse_email")
        
        # Add edges
        workflow.add_edge("parse_email", "analyze_email")
        workflow.add_conditional_edges(
            "analyze_email",
            self._route_after_analysis,
            {
                "store": "store_suggestion",
                "end": END,  # Skip storing for no_action emails
                "error": "error_handler"
            }
        )
        workflow.add_edge("store_suggestion", END)
        workflow.add_edge("error_handler", END)
        
        return workflow.compile()
    
    async def _parse_email_node(self, state: EmailAgentState) -> EmailAgentState:
        """Parse email content from Gmail."""
        try:
            message = self.gmail_service.get_message(state["email_id"])
            state["email_body"] = message.get("body_text", "")
            state["email_html"] = message.get("body_html")
            state["from_email"] = message.get("from_email", state.get("from_email", ""))
            state["subject"] = message.get("subject", state.get("subject", ""))
            return state
        except Exception as e:
            state["error"] = f"Failed to parse email: {str(e)}"
            return state
    
    def _clean_text(self, text: str, max_length: int = 2000) -> str:
        """Clean text by removing newlines, extra whitespace, and truncating if needed."""
        if not text:
            return ""
        # Remove newlines and replace with spaces
        text = text.replace('\n', ' ').replace('\r', ' ')
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        # Remove leading/trailing whitespace
        text = text.strip()
        # Truncate if too long
        if len(text) > max_length:
            text = text[:max_length] + "..."
        return text
    
    def _safe_parse_json(self, raw: str) -> dict:
        """Safely parse JSON from LLM response, handling common issues."""
        import sys
        
        debug_mode = os.getenv("EMAIL_AGENT_DEBUG", "false").lower() == "true"
        
        if raw is None:
            print("[EMAIL AGENT] ERROR: LLM response is None", file=sys.stderr, flush=True)
            raise ValueError("LLM response is None")
        
        if debug_mode:
            print("[EMAIL AGENT] Parsing JSON response (debug mode)", file=sys.stderr, flush=True)
        
        # Clean the response
        s = raw.lstrip("\ufeff\u200b \t\r\n")
        
        # If wrapped in code fences, unwrap
        s = re.sub(r"^\s*```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```\s*$", "", s)
        
        # Sometimes LLM adds prose before JSON; try to extract first JSON object
        first_brace = s.find("{")
        if first_brace > 0:
            s = s[first_brace:]
        
        # Find the last closing brace to ensure we have complete JSON
        last_brace = s.rfind("}")
        if last_brace != -1:
            s = s[:last_brace + 1]
        
        # Check if JSON looks complete (balanced braces)
        open_braces = s.count('{')
        close_braces = s.count('}')
        
        if open_braces != close_braces:
            missing = open_braces - close_braces
            raise ValueError(f"Incomplete JSON - missing {missing} closing brace(s)")
        
        try:
            result = json.loads(s)
            if debug_mode:
                print(f"[EMAIL AGENT] JSON parsed successfully, keys: {list(result.keys())}", file=sys.stderr, flush=True)
            return result
        except json.JSONDecodeError as e:
            print(f"[EMAIL AGENT] ERROR: JSON parsing failed - {str(e)}", file=sys.stderr, flush=True)
            raise
    
    async def _analyze_email_node(self, state: EmailAgentState) -> EmailAgentState:
        """Analyze email content using LLM to determine action."""
        try:
            # Clean email content
            clean_subject = self._clean_text(state['subject'], max_length=200)
            clean_body = self._clean_text(state['email_body'], max_length=1500)
            clean_from = self._clean_text(state['from_email'], max_length=100)
            
            email_content = f"Subject: {clean_subject} From: {clean_from} Date: {state['received_date']} Body: {clean_body}"
            
            system_prompt = """Analyze email and determine action type. Extract generic information only.

Entity Types:
1. feature: Strategic work, new capability, enhancement request
2. task: Actionable work item, to-do, bug fix
3. response: Needs reply only, question to answer
4. no_action: Email does not require any response or action (newsletters, automated notifications, spam, marketing emails, system notifications, out-of-office replies, delivery confirmations, etc.)

IMPORTANT: Use "no_action" for emails that:
- Are newsletters, marketing emails, or promotional content
- Are automated system notifications (delivery confirmations, shipping updates, etc.)
- Are out-of-office or auto-reply messages
- Are spam or clearly not relevant
- Do not require any human response or action
- Are informational only with no actionable content

Extract generic information (do NOT extract domain-specific IDs like product_id, module_id, task_id):
- title: Brief title/summary
- description: Detailed description
- priority: low/medium/high/critical
- status: todo/in_progress/blocked/done
- assignees: List of email addresses or names
- due_date: ISO date string if mentioned
- suggested_response_text: For response type emails
- tone: professional/casual/urgent (for responses)

IMPORTANT: Return ONLY valid JSON starting with {. Do NOT include any newlines, spaces, or other characters before the opening brace.

Return JSON:
{
  "entity_type": "feature|task|response|no_action",
  "suggested_data": {
    "title": "...",
    "description": "...",
    "priority": "low|medium|high|critical",
    "status": "todo|in_progress|blocked|done",
    "assignees": ["..."],
    "due_date": "YYYY-MM-DD",
    ...
  },
  "confidence_score": 0.0-1.0
}"""
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Analyze: {email_content}")
            ]
            
            response = await self.llm.ainvoke(messages)
            response_text = response.content
            
            import sys
            debug_mode = os.getenv("EMAIL_AGENT_DEBUG", "false").lower() == "true"
            
            # Parse JSON response
            try:
                # Handle case where response.content might be a list
                if isinstance(response_text, list):
                    text_parts = []
                    for item in response_text:
                        if isinstance(item, dict):
                            text = item.get('text') or item.get('content', '')
                            if text:
                                text_parts.append(text)
                        elif isinstance(item, str):
                            text_parts.append(item)
                        else:
                            if hasattr(item, 'text'):
                                text_parts.append(item.text)
                            elif hasattr(item, 'content'):
                                text_parts.append(item.content)
                            else:
                                text_parts.append(str(item))
                    response_text = " ".join(text_parts)
                elif not isinstance(response_text, str):
                    response_text = str(response_text)
                
                # Use the safe JSON parser
                analysis = self._safe_parse_json(response_text)
                
                state["entity_type"] = analysis.get("entity_type")
                state["suggested_data"] = analysis.get("suggested_data", {})
                state["confidence_score"] = analysis.get("confidence_score", 0.5)
                
                # Ensure entity_type is not None
                if not state["entity_type"]:
                    print(f"[EMAIL AGENT] WARNING: entity_type is None, defaulting to 'response'", file=sys.stderr, flush=True)
                    state["entity_type"] = "response"
            except (json.JSONDecodeError, TypeError, ValueError) as e:
                print(f"[EMAIL AGENT] ERROR: Failed to parse LLM response - {type(e).__name__}: {str(e)}", file=sys.stderr, flush=True)
                if debug_mode:
                    print(f"[EMAIL AGENT] Response text (first 500 chars): {repr(response_text[:500]) if response_text else 'None'}", file=sys.stderr, flush=True)
                state["error"] = f"Failed to parse LLM response: {str(e)}. Response: {response_text[:200] if response_text else 'None'}"
                return state
            
            return state
        except Exception as e:
            state["error"] = f"Failed to analyze email: {str(e)}"
            return state
    
    def _route_after_analysis(self, state: EmailAgentState) -> str:
        """Route to next node based on analysis result."""
        if state.get("error"):
            return "error"
        # Skip processing for emails that don't require action
        if state.get("entity_type") == "no_action":
            return "end"  # Skip to end without storing
        return "store"
    
    async def _store_suggestion_node(self, state: EmailAgentState) -> EmailAgentState:
        """Store suggestion in repository."""
        try:
            if state.get("error"):
                entity_type = "response"  # Default when there's an error
            else:
                entity_type = state.get("entity_type") or "response"
            
            # Ensure entity_type is always a valid string
            if not entity_type or not isinstance(entity_type, str):
                entity_type = "response"
            
            processed_email = ProcessedEmail(
                id=str(uuid.uuid4()),
                email_id=state["email_id"],
                thread_id=state["thread_id"],
                from_email=state["from_email"],
                subject=state["subject"],
                received_date=state["received_date"],
                processed_at=datetime.utcnow(),
                status="error" if state.get("error") else "pending",
                suggested_entity_type=entity_type,
                suggested_data=state.get("suggested_data", {}),
                confidence_score=state.get("confidence_score"),
                email_body=state.get("email_body"),
                email_html=state.get("email_html")
            )
            
            await self.repository.create(processed_email)
            
            return state
        except Exception as e:
            import sys
            print(f"[STORE SUGGESTION] ERROR: Failed to store suggestion: {str(e)}", file=sys.stderr, flush=True)
            state["error"] = f"Failed to store suggestion: {str(e)}"
            return state
    
    async def _error_handler_node(self, state: EmailAgentState) -> EmailAgentState:
        """Handle errors in the workflow."""
        error = state.get("error", "Unknown error")
        print(f"Email agent error: {error}")
        # Store error in suggestion for debugging
        if "suggested_data" not in state:
            state["suggested_data"] = {}
        state["suggested_data"]["error"] = error
        return state
    
    async def process_email(
        self, 
        email_id: str, 
        thread_id: str, 
        from_email: str, 
        subject: str, 
        received_date: datetime, 
        email_body: Optional[str] = None, 
        email_html: Optional[str] = None
    ) -> Optional[ProcessedEmail]:
        """
        Process a single email through the workflow.
        
        Returns:
            ProcessedEmail if stored, None if no_action or error
        """
        initial_state: EmailAgentState = {
            "email_id": email_id,
            "thread_id": thread_id,
            "from_email": from_email,
            "subject": subject,
            "received_date": received_date,
            "email_body": email_body or "",
            "email_html": email_html,
            "entity_type": None,
            "suggested_data": {},
            "confidence_score": None,
            "error": None
        }
        
        # Run the workflow
        final_state = await self.workflow.ainvoke(initial_state)
        
        # Skip storing and return None for emails that don't require action
        entity_type = final_state.get("entity_type")
        if entity_type == "no_action":
            import sys
            print(f"[EMAIL AGENT] Email {email_id} marked as no_action, skipping storage", file=sys.stderr, flush=True)
            return None
        
        # Get the stored suggestion
        processed_email = await self.repository.get_by_email_id(email_id)
        return processed_email
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input data through the agent workflow.
        
        Args:
            input_data: Dictionary with email_id, thread_id, from_email, subject, received_date
            
        Returns:
            Dictionary with processed email result
        """
        result = await self.process_email(
            email_id=input_data["email_id"],
            thread_id=input_data.get("thread_id", ""),
            from_email=input_data["from_email"],
            subject=input_data["subject"],
            received_date=input_data["received_date"],
            email_body=input_data.get("email_body"),
            email_html=input_data.get("email_html")
        )
        
        if result:
            return result.model_dump()
        return {"status": "no_action", "message": "Email did not require action"}

