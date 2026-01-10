"""Feature Reports API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    FeatureReportCreate,
    FeatureReportResponse,
    FeatureReportUpdate,
)
from database.models.base_models import FeatureReport

router = APIRouter(prefix="/api/feature-reports", tags=["feature-reports"])


@router.get("", response_model=List[FeatureReportResponse])
async def get_feature_reports(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    feature_id: Optional[str] = Query(None, description="Filter by feature ID"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all feature reports with optional filters."""
    repo = RepositoryFactory.get_feature_report_repository(session)
    
    if product_id:
        if feature_id:
            reports = await repo.get_by_feature(feature_id)
        else:
            reports = await repo.get_by_product(product_id)
    elif feature_id:
        reports = await repo.get_by_feature(feature_id)
    else:
        reports = await repo.get_all()
    
    return reports


@router.get("/{report_id}", response_model=FeatureReportResponse)
async def get_feature_report(
    report_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    """Get a specific feature report by ID."""
    repo = RepositoryFactory.get_feature_report_repository(session)
    report = await repo.get_by_id(report_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="Feature report not found")
    
    return report


@router.post("", response_model=FeatureReportResponse, status_code=201)
async def create_feature_report(
    report_data: FeatureReportCreate,
    session: AsyncSession = Depends(get_db_session),
):
    """Create a new feature report."""
    repo = RepositoryFactory.get_feature_report_repository(session)
    
    # Verify feature exists
    feature_repo = RepositoryFactory.get_feature_repository(session)
    feature = await feature_repo.get_by_id(report_data.feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    report = await repo.create(report_data)
    return report


@router.put("/{report_id}", response_model=FeatureReportResponse)
async def update_feature_report(
    report_id: str,
    report_data: FeatureReportUpdate,
    session: AsyncSession = Depends(get_db_session),
):
    """Update a feature report."""
    repo = RepositoryFactory.get_feature_report_repository(session)
    report = await repo.get_by_id(report_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="Feature report not found")
    
    updated = await repo.update(report_id, report_data)
    return updated


@router.delete("/{report_id}", status_code=204)
async def delete_feature_report(
    report_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    """Delete a feature report."""
    repo = RepositoryFactory.get_feature_report_repository(session)
    report = await repo.get_by_id(report_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="Feature report not found")
    
    await repo.delete(report_id)

