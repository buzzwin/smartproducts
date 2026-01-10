"""Service for correlating emails to existing tasks."""
import os
import re
from typing import List, Dict, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from database.database import RepositoryFactory, get_db_session


class TaskCorrelator:
    """Service for finding and correlating emails to existing tasks."""
    
    def __init__(self):
        """Initialize the task correlator."""
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("EMAIL_AGENT_AI_API_KEY")
        if api_key:
            model_name = os.getenv("EMAIL_AGENT_AI_MODEL", "gemini-3-flash-preview")
            self.llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=0.2
            )
        else:
            self.llm = None
    
    async def find_matching_tasks(self, email_content: str, product_id: Optional[str] = None,
                                  module_id: Optional[str] = None) -> List[Dict[str, any]]:
        """
        Find tasks that match the email content.
        
        Returns list of matches with task_id and confidence_score.
        """
        try:
            from database.database import get_db_session_context
            async with get_db_session_context() as session:
                task_repo = RepositoryFactory.get_task_repository(session)
                
                # Get tasks to search
                if product_id:
                    if module_id:
                        tasks = await task_repo.get_by_product_or_module(product_id, module_id)
                    else:
                        tasks = await task_repo.get_by_product(product_id)
                else:
                    tasks = await task_repo.get_all()
                
                if not tasks:
                    return []
                
                # Use keyword matching first (faster)
                matches = []
                email_lower = email_content.lower()
                
                for task in tasks:
                    score = 0.0
                    
                    # Check title match
                    if task.title.lower() in email_lower:
                        score += 0.4
                    
                    # Check description match
                    if task.description and task.description.lower() in email_lower:
                        score += 0.3
                    
                    # Check for task ID mentions
                    if task.id.lower() in email_lower:
                        score += 0.5
                    
                    # Check assignee emails
                    if task.assignee_ids:
                        # Note: Would need to look up resource emails
                        # For now, skip this check
                        pass
                    
                    if score > 0.3:  # Threshold for potential match
                        matches.append({
                            "task_id": task.id,
                            "task_title": task.title,
                            "confidence": min(score, 1.0)
                        })
                
                # Sort by confidence
                matches.sort(key=lambda x: x["confidence"], reverse=True)
                
                # If we have LLM, use it to refine matches
                if self.llm and matches:
                    matches = await self._refine_matches_with_llm(email_content, matches[:5])
                
                return matches[:3]  # Return top 3 matches
                
        except Exception as e:
            print(f"Error finding matching tasks: {str(e)}")
            return []
    
    async def _refine_matches_with_llm(self, email_content: str, 
                                       potential_matches: List[Dict]) -> List[Dict]:
        """Use LLM to refine task matches."""
        try:
            tasks_info = "\n".join([
                f"- Task ID: {m['task_id']}, Title: {m['task_title']}"
                for m in potential_matches
            ])
            
            prompt = f"""Given this email content and list of potential matching tasks, 
rate how well each task matches the email (0.0 to 1.0).

Email:
{email_content[:500]}

Potential Tasks:
{tasks_info}

Return JSON array with task_id and refined confidence score:
[
  {{"task_id": "task_id_1", "confidence": 0.85}},
  {{"task_id": "task_id_2", "confidence": 0.60}}
]"""
            
            messages = [HumanMessage(content=prompt)]
            response = await self.llm.ainvoke(messages)
            
            # Parse response (simplified - would need proper JSON parsing)
            # For now, return original matches
            return potential_matches
            
        except Exception as e:
            print(f"Error refining matches with LLM: {str(e)}")
            return potential_matches
    
    async def extract_status_update(self, email_content: str) -> Optional[str]:
        """Extract status change from email content."""
        if not self.llm:
            # Simple keyword matching
            status_keywords = {
                "done": "done",
                "completed": "done",
                "finished": "done",
                "blocked": "blocked",
                "stuck": "blocked",
                "in progress": "in_progress",
                "working on": "in_progress",
                "started": "in_progress",
                "todo": "todo",
                "pending": "todo"
            }
            
            email_lower = email_content.lower()
            for keyword, status in status_keywords.items():
                if keyword in email_lower:
                    return status
            return None
        
        try:
            prompt = f"""Extract task status update from this email. 
Return only the status value: "todo", "in_progress", "blocked", or "done".
If no status change is mentioned, return null.

Email:
{email_content[:500]}

Return JSON:
{{"status": "done" or null}}"""
            
            messages = [HumanMessage(content=prompt)]
            response = await self.llm.ainvoke(messages)
            
            # Parse response - handle both string and list responses
            response_content = response.content
            if isinstance(response_content, list):
                # Extract text from list of message parts
                response_text = " ".join([
                    item.get('text', '') if isinstance(item, dict) else str(item)
                    for item in response_content
                ]).lower()
            elif isinstance(response_content, str):
                response_text = response_content.lower()
            else:
                response_text = str(response_content).lower()
            
            if "done" in response_text or "completed" in response_text:
                return "done"
            elif "blocked" in response_text:
                return "blocked"
            elif "in_progress" in response_text or "working" in response_text:
                return "in_progress"
            elif "todo" in response_text:
                return "todo"
            
            return None
            
        except Exception as e:
            print(f"Error extracting status update: {str(e)}")
            return None
    
    async def extract_comment(self, email_content: str) -> str:
        """Extract clean comment text from email, removing signatures and quoted text."""
        if not email_content:
            return ""
        
        # Remove common email signatures
        patterns_to_remove = [
            r"^--.*$",  # Signature lines starting with --
            r"^Best regards.*$",
            r"^Sent from.*$",
            r"^On.*wrote:.*$",  # Quoted text headers
            r">.*$",  # Quoted lines starting with >
        ]
        
        lines = email_content.split("\n")
        clean_lines = []
        in_quoted_section = False
        
        for line in lines:
            # Check if we're entering a quoted section
            if re.match(r"^On .* wrote:", line, re.IGNORECASE):
                in_quoted_section = True
                break
            
            # Skip quoted lines
            if line.strip().startswith(">"):
                continue
            
            # Skip signature patterns
            skip = False
            for pattern in patterns_to_remove:
                if re.match(pattern, line, re.IGNORECASE):
                    skip = True
                    break
            
            if not skip:
                clean_lines.append(line)
        
        comment = "\n".join(clean_lines).strip()
        
        # If too short, return original
        if len(comment) < 10:
            return email_content[:500]  # Limit length
        
        return comment[:1000]  # Limit to 1000 chars

