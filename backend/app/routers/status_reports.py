"""Status report API routes."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    StatusReportCreate,
    StatusReportResponse,
    StatusReportUpdate,
)
from database.models.base_models import StatusReport

router = APIRouter(prefix="/api/status-reports", tags=["status-reports"])


@router.get("", response_model=List[StatusReportResponse])
async def get_status_reports(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all status reports with optional filters."""
    repo = RepositoryFactory.get_status_report_repository(session)
    
    if product_id:
        reports = await repo.get_by_product(product_id)
    else:
        reports = await repo.get_all()
    
    return [StatusReportResponse(**r.model_dump()) for r in reports]


@router.get("/{report_id}", response_model=StatusReportResponse)
async def get_status_report(report_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a status report by ID."""
    repo = RepositoryFactory.get_status_report_repository(session)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Status report not found")
    return StatusReportResponse(**report.model_dump())


@router.post("", response_model=StatusReportResponse, status_code=201)
async def create_status_report(report: StatusReportCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new status report."""
    repo = RepositoryFactory.get_status_report_repository(session)
    
    report_model = StatusReport(**report.model_dump())
    created = await repo.create(report_model)
    return StatusReportResponse(**created.model_dump())


@router.put("/{report_id}", response_model=StatusReportResponse)
async def update_status_report(
    report_id: str,
    report_update: StatusReportUpdate,
    session: AsyncSession = Depends(get_db_session)
):
    """Update a status report."""
    repo = RepositoryFactory.get_status_report_repository(session)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Status report not found")
    
    update_data = report_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
    
    updated = await repo.update(report)
    return StatusReportResponse(**updated.model_dump())


@router.delete("/{report_id}", status_code=204)
async def delete_status_report(report_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a status report."""
    repo = RepositoryFactory.get_status_report_repository(session)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Status report not found")
    
    await repo.delete(report_id)
    return None


@router.get("/product/{product_id}", response_model=List[StatusReportResponse])
async def get_status_reports_by_product(
    product_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module ID. If not provided, returns all product-level status reports."),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all status reports for a product. If module_id is provided, returns module-specific status reports. Otherwise returns all product-level status reports."""
    repo = RepositoryFactory.get_status_report_repository(session)
    reports = await repo.get_by_product_or_module(product_id, module_id)
    return [StatusReportResponse(**r.model_dump()) for r in reports]

