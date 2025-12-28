"""Interview API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    InterviewCreate,
    InterviewResponse,
    InterviewUpdate,
)
from database.models.base_models import Interview

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.get("", response_model=List[InterviewResponse])
async def get_interviews(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all interviews with optional filters."""
    repo = RepositoryFactory.get_interview_repository(session)
    
    if product_id:
        interviews = await repo.get_by_product(product_id)
    else:
        interviews = await repo.get_all()
    
    return [InterviewResponse(**i.model_dump()) for i in interviews]


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(interview_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get an interview by ID."""
    repo = RepositoryFactory.get_interview_repository(session)
    interview = await repo.get_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return InterviewResponse(**interview.model_dump())


@router.post("", response_model=InterviewResponse, status_code=201)
async def create_interview(interview: InterviewCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new interview."""
    repo = RepositoryFactory.get_interview_repository(session)
    
    interview_model = Interview(**interview.model_dump())
    created = await repo.create(interview_model)
    return InterviewResponse(**created.model_dump())


@router.put("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: str,
    interview_update: InterviewUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update an interview."""
    repo = RepositoryFactory.get_interview_repository(session)
    interview = await repo.get_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Update fields
    update_data = interview_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(interview, key, value)
    
    updated = await repo.update(interview)
    return InterviewResponse(**updated.model_dump())


@router.delete("/{interview_id}", status_code=204)
async def delete_interview(interview_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete an interview."""
    repo = RepositoryFactory.get_interview_repository(session)
    interview = await repo.get_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    await repo.delete(interview_id)
    return None


@router.get("/product/{product_id}", response_model=List[InterviewResponse])
async def get_interviews_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level interviews."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all interviews for a product. If module_id is provided, returns module-specific interviews. Otherwise returns all product-level interviews."""
    repo = RepositoryFactory.get_interview_repository(session)
    interviews = await repo.get_by_product_or_module(product_id, module_id)
    return [InterviewResponse(**i.model_dump()) for i in interviews]

