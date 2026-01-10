"""LangGraph agent for email analysis and processing."""
import os
import json
import re
import uuid
from datetime import datetime
from typing import TypedDict, Annotated, Optional, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.services.gmail_service import GmailService
from app.services.task_correlator import TaskCorrelator
from database.database import RepositoryFactory, get_db_session
from database.models.base_models import ProcessedEmail


class EmailAgentState(TypedDict):
    """State for the email agent workflow."""
    email_id: str
    thread_id: str
    from_email: str
    subject: str
    received_date: datetime
    email_body: str
    email_html: Optional[str]
    entity_type: Optional[str]  # "feature", "task", "response", "correlate_task"
    suggested_data: Dict[str, Any]
    matched_task_id: Optional[str]
    confidence_score: Optional[float]
    error: Optional[str]


class EmailAgent:
    """LangGraph-based agent for analyzing emails and suggesting actions."""
    
    def __init__(self, gmail_service: GmailService, task_correlator: TaskCorrelator):
        """Initialize the email agent."""
        self.gmail_service = gmail_service
        self.task_correlator = task_correlator
        
        # Initialize LLM
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("EMAIL_AGENT_AI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY or EMAIL_AGENT_AI_API_KEY environment variable is required")
        
        model_name = os.getenv("EMAIL_AGENT_AI_MODEL", "gemini-3-flash-preview")
        # Use response_format="json_object" if supported to ensure JSON output
        # Note: Check if this parameter is supported by the model
        self.llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.3,
            # Try to use JSON mode if available (may not be supported by all models)
            # response_format="json_object"  # Uncomment if supported
        )
        
        # Build the workflow graph
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(EmailAgentState)
        
        # Add nodes
        workflow.add_node("parse_email", self._parse_email_node)
        workflow.add_node("analyze_email", self._analyze_email_node)
        workflow.add_node("correlate_task", self._correlate_task_node)
        workflow.add_node("validate_data", self._validate_data_node)
        workflow.add_node("store_suggestion", self._store_suggestion_node)
        workflow.add_node("label_email", self._label_email_node)
        workflow.add_node("error_handler", self._error_handler_node)
        
        # Set entry point
        workflow.set_entry_point("parse_email")
        
        # Add edges
        workflow.add_edge("parse_email", "analyze_email")
        workflow.add_conditional_edges(
            "analyze_email",
            self._route_after_analysis,
            {
                "correlate": "correlate_task",
                "validate": "validate_data",
                "end": END,  # Skip storing for no_action emails
                "error": "error_handler"
            }
        )
        workflow.add_edge("correlate_task", "validate_data")
        workflow.add_edge("validate_data", "store_suggestion")
        workflow.add_edge("store_suggestion", "label_email")
        workflow.add_edge("label_email", END)
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
        
        # Enable verbose logging only if EMAIL_AGENT_DEBUG is set
        debug_mode = os.getenv("EMAIL_AGENT_DEBUG", "false").lower() == "true"
        
        if raw is None:
            print("[EMAIL AGENT] ERROR: LLM response is None", file=sys.stderr, flush=True)
            raise ValueError("LLM response is None")
        
        if debug_mode:
            print("[EMAIL AGENT] Parsing JSON response (debug mode)", file=sys.stderr, flush=True)
        
        # Clean the response
        # Remove invisible BOM / zero-width + whitespace
        s = raw.lstrip("\ufeff\u200b \t\r\n")
        
        # If wrapped in code fences, unwrap
        s_before_fences = s
        s = re.sub(r"^\s*```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```\s*$", "", s)
        if debug_mode and s != s_before_fences:
            print(f"[EMAIL AGENT] Removed code fences", file=sys.stderr, flush=True)
        
        # Sometimes LLM adds prose before JSON; try to extract first JSON object
        first_brace = s.find("{")
        if first_brace > 0:
            if debug_mode:
                print(f"[EMAIL AGENT] Found prose before JSON at position {first_brace}", file=sys.stderr, flush=True)
            s = s[first_brace:]
        
        # Find the last closing brace to ensure we have complete JSON
        last_brace = s.rfind("}")
        if last_brace != -1:
            s = s[:last_brace + 1]
        else:
            print("[EMAIL AGENT] WARNING: No closing brace found in response", file=sys.stderr, flush=True)
        
        # Check if JSON looks complete (balanced braces)
        open_braces = s.count('{')
        close_braces = s.count('}')
        
        if open_braces != close_braces:
            missing = open_braces - close_braces
            print(f"[EMAIL AGENT] ERROR: Incomplete JSON - missing {missing} closing brace(s)", file=sys.stderr, flush=True)
            raise ValueError(f"Incomplete JSON - missing {missing} closing brace(s). This may indicate the response was truncated.")
        
        # Check if JSON ends properly
        if not s.rstrip().endswith('}'):
            print("[EMAIL AGENT] WARNING: JSON may be incomplete", file=sys.stderr, flush=True)
        
        try:
            result = json.loads(s)
            if debug_mode:
                print(f"[EMAIL AGENT] JSON parsed successfully, keys: {list(result.keys())}", file=sys.stderr, flush=True)
            return result
        except json.JSONDecodeError as e:
            print(f"[EMAIL AGENT] ERROR: JSON parsing failed - {str(e)}", file=sys.stderr, flush=True)
            if debug_mode:
                print(f"[EMAIL AGENT] Error at line {e.lineno}, column {e.colno}", file=sys.stderr, flush=True)
                print(f"[EMAIL AGENT] Problematic text: {repr(s[max(0, e.pos-50):e.pos+50])}", file=sys.stderr, flush=True)
            raise
    
    async def _analyze_email_node(self, state: EmailAgentState) -> EmailAgentState:
        """Analyze email content using LLM to determine action."""
        try:
            # Clean email content - remove newlines and extra whitespace
            clean_subject = self._clean_text(state['subject'], max_length=200)
            clean_body = self._clean_text(state['email_body'], max_length=1500)
            clean_from = self._clean_text(state['from_email'], max_length=100)
            
            email_content = f"Subject: {clean_subject} From: {clean_from} Date: {state['received_date']} Body: {clean_body}"
            
            system_prompt = """Analyze email and determine action type:

1. Feature: Strategic work, new capability
2. Task: Actionable work item
3. Response: Needs reply only
4. Correlate: Relates to existing task
5. no_action: Email does not require any response or action (newsletters, automated notifications, spam, marketing emails, system notifications, out-of-office replies, delivery confirmations, etc.)

IMPORTANT: Use "no_action" for emails that:
- Are newsletters, marketing emails, or promotional content
- Are automated system notifications (delivery confirmations, shipping updates, etc.)
- Are out-of-office or auto-reply messages
- Are spam or clearly not relevant
- Do not require any human response or action
- Are informational only with no actionable content

For Features/Tasks extract: title, description, product_id (optional, only if clearly mentioned), module_id (optional, only if clearly mentioned), priority (low/medium/high/critical), status (todo/in_progress/blocked/done), assignees, due_date

IMPORTANT: Do NOT suggest creating products or modules. Only extract product_id/module_id if they are explicitly mentioned in the email for an existing product/module.

For Correlation: task_id, status_update, comment_text

For Response: suggested_response_text, tone, key_points

For no_action: No suggested_data needed, just set entity_type to "no_action"

IMPORTANT: Return ONLY valid JSON starting with {. Do NOT include any newlines, spaces, or other characters before the opening brace. The response must start immediately with {.

Return JSON:
{
  "entity_type": "feature|task|response|correlate_task|no_action",
  "suggested_data": {...},
  "matched_task_id": "task_id or null",
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
                # Handle case where response.content might be a list of message parts
                if isinstance(response_text, list):
                    if debug_mode:
                        print(f"[EMAIL AGENT] Response is a list with {len(response_text)} items", file=sys.stderr, flush=True)
                    # Extract text from each part - LangChain message parts have 'text' or 'content' field
                    text_parts = []
                    for i, item in enumerate(response_text):
                        if isinstance(item, dict):
                            # Check for 'text' or 'content' field
                            text = item.get('text') or item.get('content', '')
                            if text:
                                text_parts.append(text)
                        elif isinstance(item, str):
                            # If it's a string that looks like a Python dict, try to parse it
                            if item.strip().startswith('{') and "'type'" in item and "'text'" in item:
                                try:
                                    # Try to parse as Python dict using ast.literal_eval
                                    import ast
                                    parsed = ast.literal_eval(item)
                                    if isinstance(parsed, dict):
                                        text = parsed.get('text') or parsed.get('content', '')
                                        if text:
                                            text_parts.append(text)
                                        else:
                                            text_parts.append(item)
                                    else:
                                        text_parts.append(item)
                                except:
                                    # If parsing fails, try regex to extract text field
                                    import re
                                    match = re.search(r"'text'\s*:\s*'([^']*(?:\\.[^']*)*)'", item)
                                    if match:
                                        text = match.group(1).replace("\\'", "'").replace("\\n", "\n")
                                        text_parts.append(text)
                                    else:
                                        text_parts.append(item)
                            else:
                                text_parts.append(item)
                        else:
                            # For other types, check attributes
                            if hasattr(item, 'text'):
                                text_parts.append(item.text)
                            elif hasattr(item, 'content'):
                                text_parts.append(item.content)
                            else:
                                # Last resort: string representation
                                text_parts.append(str(item))
                    response_text = " ".join(text_parts)
                elif not isinstance(response_text, str):
                    response_text = str(response_text)
                
                # Use the safe JSON parser
                analysis = self._safe_parse_json(response_text)
                
                state["entity_type"] = analysis.get("entity_type")
                state["suggested_data"] = analysis.get("suggested_data", {})
                state["matched_task_id"] = analysis.get("matched_task_id")
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
        if state.get("entity_type") == "correlate_task":
            return "correlate"
        return "validate"
    
    async def _correlate_task_node(self, state: EmailAgentState) -> EmailAgentState:
        """Correlate email to existing task."""
        try:
            if not state.get("matched_task_id"):
                # Try to find matching tasks
                matches = await self.task_correlator.find_matching_tasks(
                    state["email_body"],
                    state["suggested_data"].get("product_id"),
                    state["suggested_data"].get("module_id")
                )
                if matches:
                    best_match = matches[0]
                    state["matched_task_id"] = best_match["task_id"]
                    state["confidence_score"] = best_match["confidence"]
            
            if state.get("matched_task_id"):
                # Extract status update and comment
                status_update = await self.task_correlator.extract_status_update(state["email_body"])
                comment_text = await self.task_correlator.extract_comment(state["email_body"])
                
                state["suggested_data"]["status_update"] = status_update
                state["suggested_data"]["comment_text"] = comment_text
            
            return state
        except Exception as e:
            state["error"] = f"Failed to correlate task: {str(e)}"
            return state
    
    async def _validate_data_node(self, state: EmailAgentState) -> EmailAgentState:
        """Validate extracted data (check if product/module exist)."""
        try:
            if state.get("error"):
                return state
            
            suggested_data = state.get("suggested_data", {})
            from database.database import get_db_session_context
            
            # Validate product_id if present
            if "product_id" in suggested_data and suggested_data["product_id"]:
                async with get_db_session_context() as session:
                    product_repo = RepositoryFactory.get_product_repository(session)
                    product = await product_repo.get_by_id(suggested_data["product_id"])
                    if not product:
                        state["error"] = f"Product {suggested_data['product_id']} not found"
                        return state
            
            # Validate module_id if present
            if "module_id" in suggested_data and suggested_data["module_id"]:
                async with get_db_session_context() as session:
                    module_repo = RepositoryFactory.get_module_repository(session)
                    module = await module_repo.get_by_id(suggested_data["module_id"])
                    if not module:
                        state["error"] = f"Module {suggested_data['module_id']} not found"
                        return state
            
            # Validate task_id for correlation
            if state.get("matched_task_id"):
                async with get_db_session_context() as session:
                    task_repo = RepositoryFactory.get_task_repository(session)
                    task = await task_repo.get_by_id(state["matched_task_id"])
                    if not task:
                        state["error"] = f"Task {state['matched_task_id']} not found"
                        return state
            
            return state
        except Exception as e:
            state["error"] = f"Validation failed: {str(e)}"
            return state
    
    async def _store_suggestion_node(self, state: EmailAgentState) -> EmailAgentState:
        """Store suggestion in database."""
        import sys
        print("\n" + "=" * 80, file=sys.stderr, flush=True)
        print("[STORE SUGGESTION] Starting to store suggestion", file=sys.stderr, flush=True)
        print("=" * 80, file=sys.stderr, flush=True)
        try:
            if state.get("error"):
                print(f"[STORE SUGGESTION] WARNING: State has error: {state.get('error')}", file=sys.stderr, flush=True)
                # Store error state but still create a ProcessedEmail with error info
                entity_type = "response"  # Default to response when there's an error
            else:
                entity_type = state.get("entity_type") or "response"
            
            # Ensure entity_type is always a valid string
            if not entity_type or not isinstance(entity_type, str):
                print(f"[STORE SUGGESTION] WARNING: entity_type invalid, defaulting to 'response'", file=sys.stderr, flush=True)
                entity_type = "response"
            
            print(f"[STORE SUGGESTION] Creating ProcessedEmail with:", file=sys.stderr, flush=True)
            print(f"[STORE SUGGESTION]   - email_id: {state['email_id']}", file=sys.stderr, flush=True)
            print(f"[STORE SUGGESTION]   - entity_type: {entity_type}", file=sys.stderr, flush=True)
            print(f"[STORE SUGGESTION]   - status: {'error' if state.get('error') else 'pending'}", file=sys.stderr, flush=True)
            print(f"[STORE SUGGESTION]   - suggested_data keys: {list(state.get('suggested_data', {}).keys())}", file=sys.stderr, flush=True)
            
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
                correlated_task_id=state.get("matched_task_id")
            )
            
            print(f"[STORE SUGGESTION] ProcessedEmail created, ID: {processed_email.id}", file=sys.stderr, flush=True)
            
            from database.database import get_db_session_context
            from database.config import db_config
            async with get_db_session_context() as session:
                repo = RepositoryFactory.get_processed_email_repository(session)
                print(f"[STORE SUGGESTION] Repository obtained, creating record...", file=sys.stderr, flush=True)
                await repo.create(processed_email)
                print(f"[STORE SUGGESTION] Record created, committing...", file=sys.stderr, flush=True)
                # Only commit for SQL databases (MongoDB doesn't use sessions/commits)
                if db_config.is_sql and session is not None:
                    await session.commit()
                print(f"[STORE SUGGESTION] SUCCESS: Suggestion stored with ID: {processed_email.id}", file=sys.stderr, flush=True)
            
            print("=" * 80, file=sys.stderr, flush=True)
            return state
        except Exception as e:
            import sys
            print(f"[STORE SUGGESTION] ERROR: Failed to store suggestion: {str(e)}", file=sys.stderr, flush=True)
            import traceback
            print(f"[STORE SUGGESTION] Traceback:", file=sys.stderr, flush=True)
            print(traceback.format_exc(), file=sys.stderr, flush=True)
            print("=" * 80, file=sys.stderr, flush=True)
            state["error"] = f"Failed to store suggestion: {str(e)}"
            return state
    
    async def _label_email_node(self, state: EmailAgentState) -> EmailAgentState:
        """Add Gmail label to mark email as processed."""
        try:
            if state.get("error"):
                return state
            
            # Get or create "Processed by AI" label
            label_name = os.getenv("GMAIL_PROCESSED_LABEL", "Processed by AI")
            # Note: GmailService would need a method to create/get labels
            # For now, we'll skip this and handle it in the email processor
            
            return state
        except Exception as e:
            # Don't fail the workflow if labeling fails
            print(f"Warning: Failed to label email: {str(e)}")
            return state
    
    async def _error_handler_node(self, state: EmailAgentState) -> EmailAgentState:
        """Handle errors in the workflow."""
        error = state.get("error", "Unknown error")
        print(f"Email agent error: {error}")
        # Store error in suggestion for debugging
        state["suggested_data"]["error"] = error
        return state
    
    async def process_email(self, email_id: str, thread_id: str, from_email: str, 
                           subject: str, received_date: datetime, 
                           email_body: Optional[str] = None, 
                           email_html: Optional[str] = None) -> ProcessedEmail:
        """Process a single email through the workflow."""
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
            "matched_task_id": None,
            "confidence_score": None,
            "error": None
        }
        
        # Run the workflow
        final_state = await self.workflow.ainvoke(initial_state)
        
        # Skip storing and return None for emails that don't require action
        import sys
        entity_type = final_state.get("entity_type")
        if entity_type == "no_action":
            print(f"[EMAIL AGENT] Email {email_id} marked as no_action, skipping storage", file=sys.stderr, flush=True)
            return None
        
        # Get the stored suggestion
        from database.database import get_db_session_context
        async with get_db_session_context() as session:
            repo = RepositoryFactory.get_processed_email_repository(session)
            processed_email = await repo.get_by_email_id(email_id)
            if processed_email:
                return processed_email
            # If not found, return a basic ProcessedEmail with the data we have
            entity_type = entity_type or "response"
            if not isinstance(entity_type, str):
                entity_type = "response"
            
            return ProcessedEmail(
                id=str(uuid.uuid4()),
                email_id=email_id,
                thread_id=thread_id,
                from_email=from_email,
                subject=subject,
                received_date=received_date,
                processed_at=datetime.utcnow(),
                status="error" if final_state.get("error") else "pending",
                suggested_entity_type=entity_type,
                suggested_data=final_state.get("suggested_data", {}),
                correlated_task_id=final_state.get("matched_task_id"),
                email_body=final_state.get("email_body"),
                email_html=final_state.get("email_html")
            )

