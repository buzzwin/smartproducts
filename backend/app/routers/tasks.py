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
            # Get product-level tasks (module_id is None)
            tasks = await repo.get_by_product_or_module(product_id, None)
        
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
            await problem_repo.update(problem)
    
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
            await problem_repo.update(old_problem)
    
    if new_problem_id and new_problem_id != old_problem_id:
        # Add task to new problem
        new_problem = await problem_repo.get_by_id(new_problem_id)
        if new_problem and task_id not in new_problem.task_ids:
            new_problem.task_ids.append(task_id)
            await problem_repo.update(new_problem)
    
    return TaskResponse(**updated.model_dump())


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a task."""
    repo = RepositoryFactory.get_task_repository(session)
    
    success = await repo.delete(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

