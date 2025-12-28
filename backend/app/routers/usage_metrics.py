"""UsageMetric API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    UsageMetricCreate,
    UsageMetricResponse,
    UsageMetricUpdate,
)
from database.models.base_models import UsageMetric

router = APIRouter(prefix="/api/usage-metrics", tags=["usage-metrics"])


@router.get("", response_model=List[UsageMetricResponse])
async def get_usage_metrics(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    metric_type: Optional[str] = Query(None, description="Filter by metric type"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all usage metrics with optional filters."""
    repo = RepositoryFactory.get_usage_metric_repository(session)
    
    if product_id and metric_type:
        metrics = await repo.get_by_type(product_id, metric_type)
    elif product_id:
        metrics = await repo.get_by_product(product_id)
    else:
        metrics = await repo.get_all()
    
    return [UsageMetricResponse(**m.model_dump()) for m in metrics]


@router.get("/{metric_id}", response_model=UsageMetricResponse)
async def get_usage_metric(
    metric_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific usage metric."""
    repo = RepositoryFactory.get_usage_metric_repository(session)
    metric = await repo.get_by_id(metric_id)
    
    if not metric:
        raise HTTPException(status_code=404, detail="Usage metric not found")
    
    return UsageMetricResponse(**metric.model_dump())


@router.post("", response_model=UsageMetricResponse, status_code=201)
async def create_usage_metric(
    metric: UsageMetricCreate,
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new usage metric."""
    repo = RepositoryFactory.get_usage_metric_repository(session)
    
    metric_obj = UsageMetric(**metric.model_dump())
    created = await repo.create(metric_obj)
    
    return UsageMetricResponse(**created.model_dump())


@router.put("/{metric_id}", response_model=UsageMetricResponse)
async def update_usage_metric(
    metric_id: str,
    metric_update: UsageMetricUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a usage metric."""
    repo = RepositoryFactory.get_usage_metric_repository(session)
    
    existing = await repo.get_by_id(metric_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Usage metric not found")
    
    # Update fields
    update_data = metric_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(metric_id, existing)
    return UsageMetricResponse(**updated.model_dump())


@router.delete("/{metric_id}", status_code=204)
async def delete_usage_metric(
    metric_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a usage metric."""
    repo = RepositoryFactory.get_usage_metric_repository(session)
    
    existing = await repo.get_by_id(metric_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Usage metric not found")
    
    await repo.delete(metric_id)
    return None

