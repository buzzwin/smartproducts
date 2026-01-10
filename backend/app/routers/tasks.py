"""Task API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from database.models.base_models import Task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    problem_id: Optional[str] = Query(None, description="Filter by problem ID"),
    workstream_id: Optional[str] = Query(None, description="Filter by workstream ID"),
    phase_id: Optional[str] = Query(None, description="Filter by phase ID"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee (resource ID)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all tasks with optional filters. If module_id is provided, returns module-specific tasks. If product_id is provided without module_id, returns all product-level tasks."""
    repo = RepositoryFactory.get_task_repository(session)
    
    if product_id:
        if module_id:
            # Get module-specific tasks
            tasks = await repo.get_by_product_or_module(product_id, module_id)
        else:
            # Get ALL tasks for the product (including those with and without module_id)
            tasks = await repo.get_by_product(product_id)
        
        # Apply additional filters
        if feature_id:
            tasks = [t for t in tasks if t.feature_id == feature_id]
        if problem_id:
            tasks = [t for t in tasks if t.problem_id == problem_id]
        if workstream_id:
            tasks = [t for t in tasks if t.workstream_id == workstream_id]
        if phase_id:
            tasks = [t for t in tasks if t.phase_id == phase_id]
        if assignee_id:
            tasks = [t for t in tasks if assignee_id in (t.assignee_ids or [])]
        if status:
            if status not in ["todo", "in_progress", "blocked", "done"]:
                raise HTTPException(status_code=400, detail="Status must be 'todo', 'in_progress', 'blocked', or 'done'")
            tasks = [t for t in tasks if t.status == status]
    elif feature_id:
        tasks = await repo.get_by_feature(feature_id)
    elif workstream_id:
        tasks = await repo.get_by_workstream(workstream_id)
    elif phase_id:
        tasks = await repo.get_by_phase(phase_id)
    elif problem_id:
        tasks = await repo.get_all()
        tasks = [t for t in tasks if t.problem_id == problem_id]
    elif assignee_id:
        tasks = await repo.get_by_assignee(assignee_id)
    elif status:
        if status not in ["todo", "in_progress", "blocked", "done"]:
            raise HTTPException(status_code=400, detail="Status must be 'todo', 'in_progress', 'blocked', or 'done'")
        tasks = await repo.get_by_status(status)
    else:
        tasks = await repo.get_all()
    
    return [TaskResponse(**t.model_dump()) for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a task by ID."""
    repo = RepositoryFactory.get_task_repository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**task.model_dump())


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(task: TaskCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new task."""
    repo = RepositoryFactory.get_task_repository(session)
    
    # Validate product exists
    product_repo = RepositoryFactory.get_product_repository(session)
    product = await product_repo.get_by_id(task.product_id)
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    
    # Validate feature exists if provided
    if task.feature_id:
        feature_repo = RepositoryFactory.get_feature_repository(session)
        feature = await feature_repo.get_by_id(task.feature_id)
        if not feature:
            raise HTTPException(status_code=400, detail="Feature not found")
    
    # Validate problem exists if provided
    if task.problem_id:
        problem_repo = RepositoryFactory.get_problem_repository(session)
        problem = await problem_repo.get_by_id(task.problem_id)
        if not problem:
            raise HTTPException(status_code=400, detail="Problem not found")
    
    # Validate workstream exists if provided
    if task.workstream_id:
        workstream_repo = RepositoryFactory.get_workstream_repository(session)
        workstream = await workstream_repo.get_by_id(task.workstream_id)
        if not workstream:
            raise HTTPException(status_code=400, detail="Workstream not found")
    
    # Validate phase exists if provided
    if task.phase_id:
        phase_repo = RepositoryFactory.get_phase_repository(session)
        phase = await phase_repo.get_by_id(task.phase_id)
        if not phase:
            raise HTTPException(status_code=400, detail="Phase not found")
    
    # Validate depends_on_task_ids - check tasks exist and no circular dependencies
    if task.depends_on_task_ids:
        for dep_task_id in task.depends_on_task_ids:
            dep_task = await repo.get_by_id(dep_task_id)
            if not dep_task:
                raise HTTPException(status_code=400, detail=f"Dependent task with ID {dep_task_id} not found")
            # Check for circular dependency (if the dependent task depends on this task, it would create a cycle)
            # This is a simple check - a full cycle detection would require traversing the dependency graph
    
    # Validate status
    if task.status not in ["todo", "in_progress", "blocked", "done"]:
        raise HTTPException(status_code=400, detail="Status must be 'todo', 'in_progress', 'blocked', or 'done'")
    
    # Validate priority
    if task.priority not in ["low", "medium", "high", "critical"]:
        raise HTTPException(status_code=400, detail="Priority must be 'low', 'medium', 'high', or 'critical'")
    
    # Validate assignee_ids reference valid resources
    if task.assignee_ids:
        resource_repo = RepositoryFactory.get_resource_repository(session)
        for resource_id in task.assignee_ids:
            resource = await resource_repo.get_by_id(resource_id)
            if not resource:
                raise HTTPException(status_code=400, detail=f"Resource with ID {resource_id} not found")
    
    task_model = Task(**task.model_dump())
    created = await repo.create(task_model)
    
    # If problem_id is set, also add this task to the problem's task_ids
    if task.problem_id:
        problem_repo = RepositoryFactory.get_problem_repository(session)
        problem = await problem_repo.get_by_id(task.problem_id)
        if problem and created.id not in problem.task_ids:
            problem.task_ids.append(created.id)
            await problem_repo.update(problem.id, problem)
    
    return TaskResponse(**created.model_dump())


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, session: AsyncSession = Depends(get_db_session)):
    """Update a task."""
    repo = RepositoryFactory.get_task_repository(session)
    
    existing = await repo.get_by_id(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Validate product if provided
    if task_update.product_id:
        product_repo = RepositoryFactory.get_product_repository(session)
        product = await product_repo.get_by_id(task_update.product_id)
        if not product:
            raise HTTPException(status_code=400, detail="Product not found")
    
    # Validate feature if provided
    if task_update.feature_id:
        feature_repo = RepositoryFactory.get_feature_repository(session)
        feature = await feature_repo.get_by_id(task_update.feature_id)
        if not feature:
            raise HTTPException(status_code=400, detail="Feature not found")
    
    # Validate problem if provided
    if task_update.problem_id:
        problem_repo = RepositoryFactory.get_problem_repository(session)
        problem = await problem_repo.get_by_id(task_update.problem_id)
        if not problem:
            raise HTTPException(status_code=400, detail="Problem not found")
    
    # Validate workstream if provided
    if task_update.workstream_id:
        workstream_repo = RepositoryFactory.get_workstream_repository(session)
        workstream = await workstream_repo.get_by_id(task_update.workstream_id)
        if not workstream:
            raise HTTPException(status_code=400, detail="Workstream not found")
    
    # Validate phase if provided
    if task_update.phase_id:
        phase_repo = RepositoryFactory.get_phase_repository(session)
        phase = await phase_repo.get_by_id(task_update.phase_id)
        if not phase:
            raise HTTPException(status_code=400, detail="Phase not found")
    
    # Validate depends_on_task_ids if provided
    if task_update.depends_on_task_ids is not None:
        for dep_task_id in task_update.depends_on_task_ids:
            dep_task = await repo.get_by_id(dep_task_id)
            if not dep_task:
                raise HTTPException(status_code=400, detail=f"Dependent task with ID {dep_task_id} not found")
            # Check for circular dependency (prevent task from depending on itself)
            if dep_task_id == task_id:
                raise HTTPException(status_code=400, detail="Task cannot depend on itself")
    
    # Validate status if provided
    if task_update.status is not None and task_update.status not in ["todo", "in_progress", "blocked", "done"]:
        raise HTTPException(status_code=400, detail="Status must be 'todo', 'in_progress', 'blocked', or 'done'")
    
    # Validate priority if provided
    if task_update.priority is not None and task_update.priority not in ["low", "medium", "high", "critical"]:
        raise HTTPException(status_code=400, detail="Priority must be 'low', 'medium', 'high', or 'critical'")
    
    # Validate assignee_ids if provided
    if task_update.assignee_ids is not None:
        resource_repo = RepositoryFactory.get_resource_repository(session)
        for resource_id in task_update.assignee_ids:
            resource = await resource_repo.get_by_id(resource_id)
            if not resource:
                raise HTTPException(status_code=400, detail=f"Resource with ID {resource_id} not found")
    
    # Handle problem_id changes - update bidirectional relationship
    old_problem_id = existing.problem_id
    new_problem_id = task_update.problem_id if hasattr(task_update, 'problem_id') and task_update.problem_id is not None else None
    
    # Update fields
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(task_id, existing)
    
    # Update problem's task_ids if problem_id changed
    problem_repo = RepositoryFactory.get_problem_repository(session)
    if old_problem_id and old_problem_id != new_problem_id:
        # Remove task from old problem
        old_problem = await problem_repo.get_by_id(old_problem_id)
        if old_problem and task_id in old_problem.task_ids:
            old_problem.task_ids.remove(task_id)
            await problem_repo.update(old_problem.id, old_problem)
    
    if new_problem_id and new_problem_id != old_problem_id:
        # Add task to new problem
        new_problem = await problem_repo.get_by_id(new_problem_id)
        if new_problem and task_id not in new_problem.task_ids:
            new_problem.task_ids.append(task_id)
            await problem_repo.update(new_problem.id, new_problem)
    
    return TaskResponse(**updated.model_dump())


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a task."""
    repo = RepositoryFactory.get_task_repository(session)
    
    success = await repo.delete(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")


class CommentCreate(BaseModel):
    """Schema for creating a comment."""
    text: str
    author: Optional[str] = None
    source: str = "manual"
    email_id: Optional[str] = None
    email_subject: Optional[str] = None


@router.post("/{task_id}/comments")
async def add_comment(
    task_id: str,
    comment: CommentCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Add comment to task."""
    import uuid
    from datetime import datetime
    
    repo = RepositoryFactory.get_task_repository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_comment = {
        "id": str(uuid.uuid4()),
        "text": comment.text,
        "author": comment.author or "System",
        "created_at": datetime.utcnow().isoformat(),
        "source": comment.source,
        "email_id": comment.email_id,
        "email_subject": comment.email_subject
    }
    
    if not task.comments:
        task.comments = []
    task.comments.append(new_comment)
    
    await repo.update(task_id, task)
    await session.commit()
    
    return {"message": "Comment added", "comment": new_comment}


@router.get("/{task_id}/comments")
async def get_comments(
    task_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get all comments for a task."""
    repo = RepositoryFactory.get_task_repository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"comments": task.comments or []}


def _extract_text_from_content(content) -> str:
    """Extract text from LLM response content, handling various formats."""
    if isinstance(content, str):
        return content.strip()
    elif isinstance(content, list):
        # Handle list of content blocks
        texts = []
        for item in content:
            if isinstance(item, dict) and 'text' in item:
                texts.append(item['text'])
            elif isinstance(item, str):
                texts.append(item)
            else:
                texts.append(str(item))
        return " ".join(texts).strip()
    elif isinstance(content, dict):
        # Handle dict format like {'type': 'text', 'text': '...'}
        if 'text' in content:
            return str(content['text']).strip()
        else:
            return str(content).strip()
    else:
        return str(content).strip()


class GenerateStatusEmailRequest(BaseModel):
    """Request to generate status check email."""
    resource_id: Optional[str] = None
    resource_email: Optional[str] = None
    resource_name: Optional[str] = None
    user_name: Optional[str] = None


class GenerateStatusEmailResponse(BaseModel):
    """Response with generated email content."""
    subject: str
    body: str
    to_email: str
    to_name: str


@router.post("/{task_id}/generate-status-email", response_model=GenerateStatusEmailResponse)
async def generate_status_email(
    task_id: str,
    request: GenerateStatusEmailRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Generate AI-powered status check email for a task."""
    import os
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage, SystemMessage
    
    # Get task
    repo = RepositoryFactory.get_task_repository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get resource info
    resource_repo = RepositoryFactory.get_resource_repository(session)
    resource_email = request.resource_email
    resource_name = request.resource_name
    
    if request.resource_id:
        resource = await resource_repo.get_by_id(request.resource_id)
        if resource:
            resource_email = resource.email or resource_email
            resource_name = resource.name or resource_name
    
    if not resource_email:
        raise HTTPException(status_code=400, detail="Resource email is required")
    
    if not resource_name:
        resource_name = resource_email.split("@")[0]  # Use email username as fallback
    
    # Get recent comments (last 3)
    comments = (task.comments or [])[-3:] if task.comments else []
    recent_comments_text = "\n".join([
        f"- {c.get('author', 'Unknown')} ({c.get('created_at', 'Unknown date')}): {c.get('text', '')}"
        for c in comments
    ]) if comments else "No recent comments."
    
    # Initialize LLM
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("EMAIL_AGENT_AI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    
    model_name = os.getenv("EMAIL_AGENT_AI_MODEL", "gemini-3-flash-preview")
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.7
    )
    
    # Get user name (sender name)
    user_name = request.user_name or "User"
    
    # Build prompt
    system_prompt = """You are a professional project manager writing a status check email. 
Write a friendly, professional email asking for an update on a task. The email should:
- Be concise and clear
- Reference the task name and key details
- Mention recent comments/updates if available
- Ask specific questions about progress, blockers, or next steps
- Maintain a collaborative and supportive tone
- Be professional but not overly formal
- Always sign the email with the sender's name provided (do NOT use "[Your Name]" or placeholder text)

Return ONLY the email body text. Do not include subject line or headers."""
    
    task_info = f"""
Task: {task.title}
Status: {task.status}
Priority: {task.priority}
Description: {task.description or 'No description provided'}

Recent Comments:
{recent_comments_text}
"""
    
    user_prompt = f"""Write a status check email to {resource_name} ({resource_email}) about this task:

{task_info}

The email should be signed with the sender's name: {user_name}

Generate a professional, friendly email asking for a status update. Make sure to end with "Best regards," followed by the sender's name ({user_name})."""
    
    # Generate email
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = await llm.ainvoke(messages)
    # Extract text from response content (handles string, list, or dict formats)
    email_body = _extract_text_from_content(response.content)
    
    # Generate subject
    subject_prompt = f"""Generate a concise email subject line for a status check email about this task: "{task.title}".
Keep it under 60 characters and make it clear it's a status check request."""
    
    subject_messages = [
        SystemMessage(content="You are generating email subject lines. Return ONLY the subject text, no quotes or extra formatting."),
        HumanMessage(content=subject_prompt)
    ]
    
    subject_response = await llm.ainvoke(subject_messages)
    # Extract text from response content
    email_subject = _extract_text_from_content(subject_response.content)
    email_subject = email_subject.strip('"').strip("'")
    
    # Ensure subject is reasonable length
    if len(email_subject) > 60:
        email_subject = email_subject[:57] + "..."
    
    return GenerateStatusEmailResponse(
        subject=email_subject,
        body=email_body,
        to_email=resource_email,
        to_name=resource_name
    )


class SendStatusEmailRequest(BaseModel):
    """Request to send status check email."""
    to_email: str
    subject: str
    body: str
    cc: Optional[str] = None


@router.post("/{task_id}/send-status-email")
async def send_status_email(
    task_id: str,
    request: SendStatusEmailRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Send status check email for a task."""
    from app.services.gmail_service import GmailService
    
    # Get task
    repo = RepositoryFactory.get_task_repository(session)
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Send email via Gmail
    gmail_service = GmailService()
    try:
        result = gmail_service.send_email(
            to=request.to_email,
            subject=request.subject,
            body=request.body,
            cc=request.cc
        )
        
        return {
            "message": "Email sent successfully",
            "message_id": result.get("id"),
            "thread_id": result.get("threadId")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

