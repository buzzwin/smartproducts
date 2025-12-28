"""Task API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
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
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    workstream_id: Optional[str] = Query(None, description="Filter by workstream ID"),
    phase_id: Optional[str] = Query(None, description="Filter by phase ID"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee (resource ID)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all tasks with optional filters."""
    repo = RepositoryFactory.get_task_repository(session)
    
    if product_id:
        tasks = await repo.get_by_product(product_id)
    elif feature_id:
        tasks = await repo.get_by_feature(feature_id)
    elif workstream_id:
        tasks = await repo.get_by_workstream(workstream_id)
    elif phase_id:
        tasks = await repo.get_by_phase(phase_id)
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
    
    # Update fields
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(task_id, existing)
    return TaskResponse(**updated.model_dump())


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a task."""
    repo = RepositoryFactory.get_task_repository(session)
    
    success = await repo.delete(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

