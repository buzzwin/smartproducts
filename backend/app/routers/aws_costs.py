"""AWS Costs API routes for syncing costs from AWS."""
import json
import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import CostResponse, CostCreate
from database.models.base_models import Cost
from app.services.aws_cost_service import AWSCostService
from app.services.encryption_service import EncryptionService
from pydantic import BaseModel

router = APIRouter(prefix="/api/aws-costs", tags=["aws-costs"])


class AWSCostSyncRequest(BaseModel):
    """Request schema for AWS cost sync."""
    product_id: str
    config_id: str  # Cloud config ID
    module_id: Optional[str] = None
    start_date: Optional[datetime] = None  # Default: start of last month
    end_date: Optional[datetime] = None    # Default: end of last month
    dry_run: bool = False


class AWSCostSyncResponse(BaseModel):
    """Response schema for AWS cost sync."""
    created_count: int
    updated_count: int
    skipped_count: int
    costs: List[CostResponse]
    errors: List[str]


def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise HTTPException(
            status_code=500,
            detail=(
                "ENCRYPTION_KEY environment variable is not set. "
                "Please set it in your .env.local file. "
                "Generate a key using: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        )
    return EncryptionService(encryption_key=encryption_key)


def get_last_month_range() -> tuple[datetime, datetime]:
    """Get start and end dates for last month."""
    today = datetime.now()
    # First day of current month
    first_day_current = today.replace(day=1)
    # Last day of last month
    last_day_last_month = first_day_current - timedelta(days=1)
    # First day of last month
    first_day_last_month = last_day_last_month.replace(day=1)
    
    start_date = first_day_last_month.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = first_day_current.replace(hour=0, minute=0, second=0, microsecond=0)
    
    return start_date, end_date


@router.post("/sync", response_model=AWSCostSyncResponse)
async def sync_aws_costs(
    request: AWSCostSyncRequest,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Sync AWS costs for a product."""
    # Load cloud config
    cloud_config_repo = RepositoryFactory.get_cloud_config_repository(session)
    config = await cloud_config_repo.get_by_id(request.config_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if config.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if config.provider != "aws":
        raise HTTPException(status_code=400, detail="Configuration is not for AWS")
    
    # Decrypt credentials
    credentials_json = encryption_service.decrypt(config.credentials_encrypted)
    credentials = json.loads(credentials_json)
    
    # Determine date range
    start_date = request.start_date
    end_date = request.end_date
    
    if not start_date or not end_date:
        start_date, end_date = get_last_month_range()
    
    # Create AWS cost service
    aws_service = AWSCostService(
        access_key_id=credentials["access_key_id"],
        secret_access_key=credentials["secret_access_key"],
        region=config.region or "us-east-1"
    )
    
    # Get costs from AWS
    try:
        aws_costs = await aws_service.get_monthly_costs(start_date, end_date)
    except Exception as e:
        # Update config with error
        config.last_sync_status = "error"
        config.last_sync_error = str(e)
        await cloud_config_repo.update(config.id, config)
        raise HTTPException(status_code=400, detail=f"Failed to fetch AWS costs: {str(e)}")
    
    # Transform and save costs
    cost_repo = RepositoryFactory.get_unified_cost_repository(session)
    created_count = 0
    updated_count = 0
    skipped_count = 0
    costs = []
    errors = []
    
    for aws_cost_data in aws_costs:
        try:
            # Map AWS cost to Cost model
            cost_create = aws_service.map_aws_cost_to_cost_model(
                aws_cost_data,
                request.product_id,
                request.module_id
            )
            
            if request.dry_run:
                # Just add to response without saving
                cost_model = Cost(**cost_create.model_dump())
                costs.append(CostResponse(**cost_model.model_dump()))
                continue
            
            # Check for existing cost (deduplication)
            existing_costs = await cost_repo.find_by({
                "product_id": request.product_id,
                "name": cost_create.name,
                "time_period_start": cost_create.time_period_start,
                "time_period_end": cost_create.time_period_end
            })
            
            if existing_costs:
                # Update existing cost
                existing = existing_costs[0]
                existing.amount = cost_create.amount
                existing.currency = cost_create.currency
                updated = await cost_repo.update(existing.id, existing)
                updated_count += 1
                costs.append(CostResponse(**updated.model_dump()))
            else:
                # Create new cost
                cost_model = Cost(**cost_create.model_dump())
                created = await cost_repo.create(cost_model)
                created_count += 1
                costs.append(CostResponse(**created.model_dump()))
                
        except Exception as e:
            errors.append(f"Error processing {aws_cost_data.get('service_name', 'Unknown')}: {str(e)}")
            skipped_count += 1
    
    # Update config with sync status
    if not request.dry_run:
        config.last_synced_at = datetime.now()
        if errors:
            config.last_sync_status = "error"
            config.last_sync_error = "; ".join(errors[:3])  # Store first 3 errors
        else:
            config.last_sync_status = "success"
            config.last_sync_error = None
        await cloud_config_repo.update(config.id, config)
    
    return AWSCostSyncResponse(
        created_count=created_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        costs=costs,
        errors=errors
    )


@router.get("/preview", response_model=AWSCostSyncResponse)
async def preview_aws_costs(
    product_id: str = Query(..., description="Product ID"),
    config_id: str = Query(..., description="Cloud config ID"),
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    module_id: Optional[str] = Query(None, description="Optional module ID"),
    start_date: Optional[datetime] = Query(None, description="Start date (default: start of last month)"),
    end_date: Optional[datetime] = Query(None, description="End date (default: end of last month)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Preview AWS costs without importing (dry-run)."""
    # Use sync endpoint with dry_run=True
    request = AWSCostSyncRequest(
        product_id=product_id,
        config_id=config_id,
        module_id=module_id,
        start_date=start_date,
        end_date=end_date,
        dry_run=True
    )
    return await sync_aws_costs(request, organization_id, session, encryption_service)

