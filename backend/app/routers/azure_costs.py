"""Azure Costs API routes for syncing costs from Azure."""
import json
import os
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import CostResponse, CostCreate
from database.models.base_models import Cost
from app.services.azure_cost_service import AzureCostService
from app.services.encryption_service import EncryptionService
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/azure-costs", tags=["azure-costs"])


class AzureCostSyncRequest(BaseModel):
    """Request schema for Azure cost sync."""
    product_id: str
    config_id: str  # Cloud config ID
    module_id: Optional[str] = None
    start_date: Optional[datetime] = None  # Default: start of last month
    end_date: Optional[datetime] = None    # Default: end of last month
    dry_run: bool = False


class AzureCostSyncResponse(BaseModel):
    """Response schema for Azure cost sync."""
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


@router.post("/sync", response_model=AzureCostSyncResponse)
async def sync_azure_costs(
    request: AzureCostSyncRequest,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Sync Azure costs for a product."""
    logger.info(f"[AZURE DEBUG] ========== SYNC REQUEST RECEIVED ==========")
    logger.info(f"[AZURE DEBUG] Request body: {request.model_dump()}")
    logger.info(f"[AZURE DEBUG] Organization ID: {organization_id}")
    logger.info(f"[AZURE DEBUG] Product ID: {request.product_id}")
    logger.info(f"[AZURE DEBUG] Config ID: {request.config_id}")
    logger.info(f"[AZURE DEBUG] Module ID: {request.module_id}")
    logger.info(f"[AZURE DEBUG] Start Date: {request.start_date}")
    logger.info(f"[AZURE DEBUG] End Date: {request.end_date}")
    logger.info(f"[AZURE DEBUG] Dry Run: {request.dry_run}")
    
    # Load cloud config
    cloud_config_repo = RepositoryFactory.get_cloud_config_repository(session)
    config = await cloud_config_repo.get_by_id(request.config_id)
    
    logger.info(f"[AZURE DEBUG] Cloud config loaded: {config.id if config else 'NOT FOUND'}")
    if config:
        logger.info(f"[AZURE DEBUG] Config provider: {config.provider}")
        logger.info(f"[AZURE DEBUG] Config name: {config.name}")
        logger.info(f"[AZURE DEBUG] Config region: {config.region}")
        logger.info(f"[AZURE DEBUG] Config account_id: {config.account_id}")
    
    if not config:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if config.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if config.provider != "azure":
        raise HTTPException(status_code=400, detail="Configuration is not for Azure")
    
    # Decrypt credentials
    logger.info(f"[AZURE DEBUG] Decrypting credentials...")
    credentials_json = encryption_service.decrypt(config.credentials_encrypted)
    credentials = json.loads(credentials_json)
    logger.info(f"[AZURE DEBUG] Credentials decrypted. Has keys: {list(credentials.keys())}")
    logger.info(f"[AZURE DEBUG] Subscription ID: {credentials.get('subscription_id', 'NOT FOUND')}")
    logger.info(f"[AZURE DEBUG] Client ID: {credentials.get('client_id', 'NOT FOUND')[:10]}...")
    logger.info(f"[AZURE DEBUG] Tenant ID: {credentials.get('tenant_id', 'NOT FOUND')}")
    
    # Determine date range
    start_date = request.start_date
    end_date = request.end_date
    
    logger.info(f"[AZURE DEBUG] Request date range - start: {start_date}, end: {end_date}")
    
    if not start_date or not end_date:
        start_date, end_date = get_last_month_range()
        logger.info(f"[AZURE DEBUG] Using default date range (last month): {start_date} to {end_date}")
    else:
        logger.info(f"[AZURE DEBUG] Using provided date range: {start_date} to {end_date}")
    
    # Create Azure cost service
    logger.info(f"[AZURE DEBUG] Creating AzureCostService...")
    azure_service = AzureCostService(
        subscription_id=credentials["subscription_id"],
        client_id=credentials["client_id"],
        client_secret=credentials["client_secret"],
        tenant_id=credentials["tenant_id"]
    )
    logger.info(f"[AZURE DEBUG] AzureCostService created successfully")
    
    # Get costs from Azure
    logger.info(f"[AZURE DEBUG] Starting Azure cost sync for product {request.product_id}")
    logger.info(f"[AZURE DEBUG] Config ID: {request.config_id}, Module ID: {request.module_id}")
    logger.info(f"[AZURE DEBUG] Date range: {start_date} to {end_date}")
    
    try:
        logger.info(f"[AZURE DEBUG] ========== CALLING AZURE API ==========")
        logger.info(f"[AZURE DEBUG] Calling azure_service.get_monthly_costs with:")
        logger.info(f"[AZURE DEBUG]   - start_date: {start_date} (type: {type(start_date).__name__})")
        logger.info(f"[AZURE DEBUG]   - end_date: {end_date} (type: {type(end_date).__name__})")
        logger.info(f"[AZURE DEBUG]   - subscription_id: {credentials['subscription_id']}")
        azure_costs = await azure_service.get_monthly_costs(start_date, end_date)
        logger.info(f"[AZURE DEBUG] ========== AZURE API RESPONSE ==========")
        logger.info(f"[AZURE DEBUG] Received {len(azure_costs)} costs from Azure API")
        logger.info(f"[AZURE DEBUG] Type of azure_costs: {type(azure_costs).__name__}")
        if azure_costs:
            logger.info(f"[AZURE DEBUG] First cost structure: {json.dumps(azure_costs[0], indent=2, default=str)}")
            logger.info(f"[AZURE DEBUG] Azure costs data (first 5): {json.dumps(azure_costs[:5], indent=2, default=str)}")
            if len(azure_costs) > 5:
                logger.info(f"[AZURE DEBUG] ... and {len(azure_costs) - 5} more costs")
        else:
            logger.warning(f"[AZURE DEBUG] WARNING: Azure API returned empty list!")
            today = datetime.now().date()
            if start_date.date() > today or end_date.date() > today:
                logger.warning(f"[AZURE DEBUG] ⚠️ Date range includes future dates ({start_date.date()} to {end_date.date()})")
                logger.warning(f"[AZURE DEBUG] Azure costs are only available for past dates. Please select a date range from the past.")
            else:
                logger.warning(f"[AZURE DEBUG] No costs found for date range {start_date.date()} to {end_date.date()}")
                logger.warning(f"[AZURE DEBUG] This could mean:")
                logger.warning(f"[AZURE DEBUG]   - No usage occurred during this period")
                logger.warning(f"[AZURE DEBUG]   - Cost data may take 24-48 hours to appear")
                logger.warning(f"[AZURE DEBUG]   - Try a date range from 2-3 days ago")
    except Exception as e:
            logger.error(f"[AZURE DEBUG] ========== ERROR FETCHING AZURE COSTS ==========")
            logger.error(f"[AZURE DEBUG] Error type: {type(e).__name__}")
            logger.error(f"[AZURE DEBUG] Error message: {str(e)}")
            logger.error(f"[AZURE DEBUG] Date range: {start_date.date()} to {end_date.date()}")
            today = datetime.now().date()
            if start_date.date() > today or end_date.date() > today:
                logger.error(f"[AZURE DEBUG] ⚠️ Date range includes future dates! Azure costs are only available for past dates.")
            logger.error(f"[AZURE DEBUG] Full traceback:", exc_info=True)
            # Update config with error
            config.last_sync_status = "error"
            config.last_sync_error = str(e)
            await cloud_config_repo.update(config.id, config)
            raise HTTPException(status_code=400, detail=f"Failed to fetch Azure costs: {str(e)}")
    
    # Transform and save costs
    logger.info(f"[AZURE DEBUG] Processing {len(azure_costs)} Azure costs for transformation")
    
    cost_repo = RepositoryFactory.get_unified_cost_repository(session)
    created_count = 0
    updated_count = 0
    skipped_count = 0
    costs = []
    errors = []
    
    for idx, azure_cost_data in enumerate(azure_costs):
        logger.info(f"[AZURE DEBUG] Processing Azure cost {idx + 1}/{len(azure_costs)}: {azure_cost_data}")
        try:
            # Map Azure cost to Cost model
            logger.info(f"[AZURE DEBUG] Mapping Azure cost to Cost model: {azure_cost_data}")
            cost_create = azure_service.map_azure_cost_to_cost_model(
                azure_cost_data,
                request.product_id,
                request.module_id
            )
            logger.info(f"[AZURE DEBUG] Mapped cost: {cost_create.model_dump()}")
            
            if request.dry_run:
                # Just add to response without saving
                cost_model = Cost(**cost_create.model_dump())
                cost_response = CostResponse(**cost_model.model_dump())
                costs.append(cost_response)
                logger.info(f"[AZURE DEBUG] Added to preview costs (dry_run): {cost_response.model_dump()}")
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
            errors.append(f"Error processing {azure_cost_data.get('service_name', 'Unknown')}: {str(e)}")
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
    
    logger.info(f"[AZURE DEBUG] ========== SYNC RESPONSE ==========")
    logger.info(f"[AZURE DEBUG] Created: {created_count}, Updated: {updated_count}, Skipped: {skipped_count}")
    logger.info(f"[AZURE DEBUG] Total costs in response: {len(costs)}")
    logger.info(f"[AZURE DEBUG] Total errors: {len(errors)}")
    if costs:
        logger.info(f"[AZURE DEBUG] First cost sample: {costs[0].model_dump() if hasattr(costs[0], 'model_dump') else costs[0]}")
    if errors:
        logger.info(f"[AZURE DEBUG] First error: {errors[0]}")
    
    response = AzureCostSyncResponse(
        created_count=created_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        costs=costs,
        errors=errors
    )
    
    logger.info(f"[AZURE DEBUG] Response created, returning...")
    return response


@router.get("/preview", response_model=AzureCostSyncResponse)
async def preview_azure_costs(
    product_id: str = Query(..., description="Product ID"),
    config_id: str = Query(..., description="Cloud config ID"),
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    module_id: Optional[str] = Query(None, description="Optional module ID"),
    start_date: Optional[datetime] = Query(None, description="Start date (default: start of last month)"),
    end_date: Optional[datetime] = Query(None, description="End date (default: end of last month)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Preview Azure costs without importing (dry-run)."""
    logger.info(f"[AZURE DEBUG] ========== PREVIEW REQUEST RECEIVED ==========")
    logger.info(f"[AZURE DEBUG] Query parameters:")
    logger.info(f"[AZURE DEBUG]   - product_id: {product_id}")
    logger.info(f"[AZURE DEBUG]   - config_id: {config_id}")
    logger.info(f"[AZURE DEBUG]   - organization_id: {organization_id}")
    logger.info(f"[AZURE DEBUG]   - module_id: {module_id}")
    logger.info(f"[AZURE DEBUG]   - start_date: {start_date}")
    logger.info(f"[AZURE DEBUG]   - end_date: {end_date}")
    
    # Use sync endpoint with dry_run=True
    request = AzureCostSyncRequest(
        product_id=product_id,
        config_id=config_id,
        module_id=module_id,
        start_date=start_date,
        end_date=end_date,
        dry_run=True
    )
    
    logger.info(f"[AZURE DEBUG] Created sync request: {request.model_dump()}")
    result = await sync_azure_costs(request, organization_id, session, encryption_service)
    logger.info(f"[AZURE DEBUG] Preview result: {len(result.costs)} costs, {len(result.errors)} errors")
    return result

