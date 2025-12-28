"""Metric API routes."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    MetricCreate,
    MetricResponse,
    MetricUpdate,
)
from database.models.base_models import Metric

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("", response_model=List[MetricResponse])
async def get_metrics(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    module_id: Optional[str] = Query(None, description="Filter by module ID (requires product_id)"),
    scope: Optional[str] = Query(None, description="Filter by scope (product, capability, feature, module)"),
    scope_id: Optional[str] = Query(None, description="Filter by scope ID"),
    metric_type: Optional[str] = Query(None, description="Filter by metric type (outcome, output, health)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all metrics with optional filters. If module_id is provided, returns module-specific metrics. If product_id is provided without module_id, returns all product-level metrics."""
    repo = RepositoryFactory.get_metric_repository(session)
    
    if product_id:
        if scope and scope_id:
            metrics = await repo.get_by_scope_id(product_id, scope, scope_id)
            # Filter by module_id if provided
            if module_id:
                metrics = [m for m in metrics if m.module_id == module_id]
        elif scope:
            metrics = await repo.get_by_scope(product_id, scope)
            # Filter by module_id if provided
            if module_id:
                metrics = [m for m in metrics if m.module_id == module_id]
        elif metric_type:
            metrics = await repo.get_by_metric_type(product_id, metric_type)
            # Filter by module_id if provided
            if module_id:
                metrics = [m for m in metrics if m.module_id == module_id]
        else:
            metrics = await repo.get_by_product_or_module(product_id, module_id)
    else:
        metrics = await repo.get_all()
    
    # Apply additional filters
    if metric_type:
        metrics = [m for m in metrics if m.metric_type == metric_type]
    
    return [MetricResponse(**m.model_dump()) for m in metrics]


@router.get("/{metric_id}", response_model=MetricResponse)
async def get_metric(metric_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a metric by ID."""
    repo = RepositoryFactory.get_metric_repository(session)
    metric = await repo.get_by_id(metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    return MetricResponse(**metric.model_dump())


@router.post("", response_model=MetricResponse, status_code=201)
async def create_metric(metric: MetricCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new metric."""
    repo = RepositoryFactory.get_metric_repository(session)
    
    # Validate metric_type
    if metric.metric_type not in ["outcome", "output", "health"]:
        raise HTTPException(status_code=400, detail="Metric type must be 'outcome', 'output', or 'health'")
    
    # Validate scope
    if metric.scope not in ["product", "capability", "feature"]:
        raise HTTPException(status_code=400, detail="Scope must be 'product', 'capability', or 'feature'")
    
    metric_model = Metric(**metric.model_dump())
    created = await repo.create(metric_model)
    return MetricResponse(**created.model_dump())


@router.put("/{metric_id}", response_model=MetricResponse)
async def update_metric(
    metric_id: str,
    metric_update: MetricUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a metric."""
    repo = RepositoryFactory.get_metric_repository(session)
    metric = await repo.get_by_id(metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    # Validate metric_type if provided
    if metric_update.metric_type and metric_update.metric_type not in ["outcome", "output", "health"]:
        raise HTTPException(status_code=400, detail="Metric type must be 'outcome', 'output', or 'health'")
    
    # Validate scope if provided
    if metric_update.scope and metric_update.scope not in ["product", "capability", "feature"]:
        raise HTTPException(status_code=400, detail="Scope must be 'product', 'capability', or 'feature'")
    
    update_data = metric_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(metric, key, value)
    
    updated = await repo.update(metric)
    return MetricResponse(**updated.model_dump())


@router.delete("/{metric_id}", status_code=204)
async def delete_metric(metric_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a metric."""
    repo = RepositoryFactory.get_metric_repository(session)
    metric = await repo.get_by_id(metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    await repo.delete(metric_id)
    return None


@router.get("/product/{product_id}", response_model=List[MetricResponse])
async def get_metrics_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level metrics."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all metrics for a product. If module_id is provided, returns module-specific metrics. Otherwise returns all product-level metrics."""
    repo = RepositoryFactory.get_metric_repository(session)
    metrics = await repo.get_by_product_or_module(product_id, module_id)
    return [MetricResponse(**m.model_dump()) for m in metrics]


@router.get("/analytics/summary", response_model=Dict[str, Any])
async def get_metrics_analytics(
    product_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db_session)
):
    """Get aggregated analytics for metrics."""
    repo = RepositoryFactory.get_metric_repository(session)
    
    if product_id:
        metrics = await repo.get_by_product(product_id)
    else:
        metrics = await repo.get_all()
    
    # Calculate analytics
    total_metrics = len(metrics)
    outcome_metrics = len([m for m in metrics if m.metric_type == "outcome"])
    output_metrics = len([m for m in metrics if m.metric_type == "output"])
    health_metrics = len([m for m in metrics if m.metric_type == "health"])
    on_track = len([m for m in metrics if m.current_value and m.target_value and m.current_value >= m.target_value])
    
    return {
        "total_metrics": total_metrics,
        "outcome_metrics": outcome_metrics,
        "output_metrics": output_metrics,
        "health_metrics": health_metrics,
        "on_track": on_track,
        "metrics": [MetricResponse(**m.model_dump()).model_dump() for m in metrics]
    }

