"""Problem API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    ProblemCreate,
    ProblemResponse,
    ProblemUpdate,
)
from database.models.base_models import Problem

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("", response_model=List[ProblemResponse])
async def get_problems(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all problems with optional filters. If module_id is provided, returns module-specific problems. If product_id is provided without module_id, returns all product-level problems."""
    repo = RepositoryFactory.get_problem_repository(session)
    
    if product_id:
        problems = await repo.get_by_product_or_module(product_id, module_id)
    elif status:
        problems = await repo.get_by_status(status)
    elif priority:
        problems = await repo.get_by_priority(priority)
    elif feature_id:
        problems = await repo.get_by_feature(feature_id)
    else:
        problems = await repo.get_all()
    
    # Apply additional filters if multiple provided
    if product_id and status:
        problems = [p for p in problems if p.status == status]
    if product_id and priority:
        problems = [p for p in problems if p.priority == priority]
    
    return [ProblemResponse(**p.model_dump()) for p in problems]


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(problem_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a problem by ID."""
    repo = RepositoryFactory.get_problem_repository(session)
    problem = await repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return ProblemResponse(**problem.model_dump())


@router.post("", response_model=ProblemResponse, status_code=201)
async def create_problem(problem: ProblemCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new problem."""
    repo = RepositoryFactory.get_problem_repository(session)
    
    # Validate status
    if problem.status not in ["identified", "validating", "prioritized", "addressed", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Validate priority
    if problem.priority not in ["low", "medium", "high", "critical"]:
        raise HTTPException(status_code=400, detail="Invalid priority")
    
    problem_model = Problem(**problem.model_dump())
    created = await repo.create(problem_model)
    return ProblemResponse(**created.model_dump())


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: str,
    problem_update: ProblemUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a problem."""
    repo = RepositoryFactory.get_problem_repository(session)
    problem = await repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate status if provided
    if problem_update.status and problem_update.status not in ["identified", "validating", "prioritized", "addressed", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Validate priority if provided
    if problem_update.priority and problem_update.priority not in ["low", "medium", "high", "critical"]:
        raise HTTPException(status_code=400, detail="Invalid priority")
    
    # Update fields
    update_data = problem_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(problem, key, value)
    
    updated = await repo.update(problem)
    return ProblemResponse(**updated.model_dump())


@router.delete("/{problem_id}", status_code=204)
async def delete_problem(problem_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a problem."""
    repo = RepositoryFactory.get_problem_repository(session)
    problem = await repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    await repo.delete(problem_id)
    return None


@router.post("/{problem_id}/link-insight", response_model=ProblemResponse)
async def link_insight_to_problem(
    problem_id: str,
    insight_id: str = Query(..., description="Insight ID to link"),
    session: AsyncSession = Depends(get_db_session)
):
    """Link an insight to a problem."""
    repo = RepositoryFactory.get_problem_repository(session)
    problem = await repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    if insight_id not in problem.insight_ids:
        problem.insight_ids.append(insight_id)
        updated = await repo.update(problem)
        return ProblemResponse(**updated.model_dump())
    else:
        return ProblemResponse(**problem.model_dump())


@router.post("/{problem_id}/link-task", response_model=ProblemResponse)
async def link_task_to_problem(
    problem_id: str,
    task_id: str = Query(..., description="Task ID to link"),
    session: AsyncSession = Depends(get_db_session)
):
    """Link a task to a problem."""
    problem_repo = RepositoryFactory.get_problem_repository(session)
    task_repo = RepositoryFactory.get_task_repository(session)
    
    problem = await problem_repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    task = await task_repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update problem's task_ids
    if task_id not in problem.task_ids:
        problem.task_ids.append(task_id)
        updated_problem = await problem_repo.update(problem)
        
        # Also update task's problem_id if not already set
        if not task.problem_id:
            task.problem_id = problem_id
            await task_repo.update(task_id, task)
        
        return ProblemResponse(**updated_problem.model_dump())
    else:
        return ProblemResponse(**problem.model_dump())


@router.delete("/{problem_id}/unlink-task/{task_id}", response_model=ProblemResponse)
async def unlink_task_from_problem(
    problem_id: str,
    task_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Unlink a task from a problem."""
    problem_repo = RepositoryFactory.get_problem_repository(session)
    task_repo = RepositoryFactory.get_task_repository(session)
    
    problem = await problem_repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    if task_id in problem.task_ids:
        problem.task_ids.remove(task_id)
        updated_problem = await problem_repo.update(problem)
        
        # Also clear task's problem_id if it points to this problem
        task = await task_repo.get_by_id(task_id)
        if task and task.problem_id == problem_id:
            task.problem_id = None
            await task_repo.update(task_id, task)
        
        return ProblemResponse(**updated_problem.model_dump())
    else:
        return ProblemResponse(**problem.model_dump())


@router.get("/product/{product_id}", response_model=List[ProblemResponse])
async def get_problems_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level problems."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all problems for a product. If module_id is provided, returns module-specific problems. Otherwise returns all product-level problems."""
    repo = RepositoryFactory.get_problem_repository(session)
    problems = await repo.get_by_product_or_module(product_id, module_id)
    return [ProblemResponse(**p.model_dump()) for p in problems]

