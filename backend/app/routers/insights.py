"""Insight API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    InsightCreate,
    InsightResponse,
    InsightUpdate,
)
from database.models.base_models import Insight

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("", response_model=List[InsightResponse])
async def get_insights(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    problem_id: Optional[str] = Query(None, description="Filter by problem ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    source: Optional[str] = Query(None, description="Filter by source"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all insights with optional filters. If module_id is provided, returns module-specific insights. If product_id is provided without module_id, returns all product-level insights."""
    repo = RepositoryFactory.get_insight_repository(session)
    
    if product_id:
        insights = await repo.get_by_product_or_module(product_id, module_id)
    elif feature_id:
        insights = await repo.get_by_feature(feature_id)
    elif problem_id:
        insights = await repo.get_by_problem(problem_id)
    elif status:
        insights = await repo.get_by_status(status)
    elif source:
        insights = await repo.get_by_source(source)
    else:
        insights = await repo.get_all()
    
    # Apply additional filters if multiple provided
    if product_id and status:
        insights = [i for i in insights if i.status == status]
    if product_id and source:
        insights = [i for i in insights if i.source == source]
    if feature_id and status:
        insights = [i for i in insights if i.status == status]
    if problem_id:
        insights = [i for i in insights if i.problem_id == problem_id]
    
    return [InsightResponse(**i.model_dump()) for i in insights]


@router.get("/{insight_id}", response_model=InsightResponse)
async def get_insight(insight_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get an insight by ID."""
    repo = RepositoryFactory.get_insight_repository(session)
    insight = await repo.get_by_id(insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return InsightResponse(**insight.model_dump())


@router.get("/product/{product_id}", response_model=List[InsightResponse])
async def get_insights_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level insights."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all insights for a product. If module_id is provided, returns module-specific insights. Otherwise returns all product-level insights."""
    repo = RepositoryFactory.get_insight_repository(session)
    insights = await repo.get_by_product_or_module(product_id, module_id)
    return [InsightResponse(**i.model_dump()) for i in insights]


@router.post("", response_model=InsightResponse, status_code=201)
async def create_insight(
    insight: InsightCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new insight."""
    repo = RepositoryFactory.get_insight_repository(session)
    new_insight = Insight(**insight.model_dump())
    created = await repo.create(new_insight)
    return InsightResponse(**created.model_dump())


@router.put("/{insight_id}", response_model=InsightResponse)
async def update_insight(
    insight_id: str,
    insight_update: InsightUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update an insight."""
    repo = RepositoryFactory.get_insight_repository(session)
    insight = await repo.get_by_id(insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    # Update fields
    update_data = insight_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(insight, key, value)
    
    updated = await repo.update(insight)
    return InsightResponse(**updated.model_dump())


@router.delete("/{insight_id}", status_code=204)
async def delete_insight(insight_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete an insight."""
    repo = RepositoryFactory.get_insight_repository(session)
    insight = await repo.get_by_id(insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    await repo.delete(insight_id)
    return None

