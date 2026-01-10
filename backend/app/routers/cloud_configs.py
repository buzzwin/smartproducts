"""Cloud configuration API routes."""
import json
import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    CloudConfigCreate,
    CloudConfigResponse,
    CloudConfigUpdate,
    AWSCloudConfigCreate,
)
from database.models.base_models import CloudConfig
from app.services.encryption_service import EncryptionService

router = APIRouter(prefix="/api/cloud-configs", tags=["cloud-configs"])


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


@router.get("", response_model=List[CloudConfigResponse])
async def get_cloud_configs(
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    provider: Optional[str] = Query(None, description="Filter by provider (aws, azure, gcp)"),
    session: AsyncSession = Depends(get_db_session),
):
    """Get all cloud configs for an organization."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    
    if provider:
        configs = await repo.get_by_provider(organization_id, provider)
    else:
        configs = await repo.get_by_organization(organization_id)
    
    return [CloudConfigResponse(**c.model_dump()) for c in configs]


@router.get("/{config_id}", response_model=CloudConfigResponse)
async def get_cloud_config(
    config_id: str,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Get a specific cloud config (credentials never returned)."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    config = await repo.get_by_id(config_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if config.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return CloudConfigResponse(**config.model_dump())


@router.post("", response_model=CloudConfigResponse, status_code=201)
async def create_cloud_config(
    config: CloudConfigCreate,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Create a new cloud configuration."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    
    # Encrypt credentials before storing
    credentials_dict = {}
    if config.provider == "aws":
        if not config.access_key_id or not config.secret_access_key:
            raise HTTPException(status_code=400, detail="AWS requires access_key_id and secret_access_key")
        credentials_dict = {
            "access_key_id": config.access_key_id,
            "secret_access_key": config.secret_access_key,
        }
    elif config.provider == "azure":
        if not config.subscription_id or not config.client_id or not config.client_secret or not config.tenant_id:
            raise HTTPException(status_code=400, detail="Azure requires subscription_id, client_id, client_secret, and tenant_id")
        credentials_dict = {
            "subscription_id": config.subscription_id,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "tenant_id": config.tenant_id,
        }
    elif config.provider == "gcp":
        if not config.project_id or not config.service_account_json:
            raise HTTPException(status_code=400, detail="GCP requires project_id and service_account_json")
        credentials_dict = {
            "project_id": config.project_id,
            "service_account_json": config.service_account_json,
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {config.provider}")
    
    # Encrypt credentials
    credentials_json = json.dumps(credentials_dict)
    credentials_encrypted = encryption_service.encrypt(credentials_json)
    
    # Create cloud config model
    config_data = config.model_dump(exclude={
        "access_key_id", "secret_access_key",
        "subscription_id", "client_id", "client_secret", "tenant_id",
        "project_id", "service_account_json"
    })
    config_data["organization_id"] = organization_id
    config_data["credentials_encrypted"] = credentials_encrypted
    
    config_model = CloudConfig(**config_data)
    created = await repo.create(config_model)
    
    return CloudConfigResponse(**created.model_dump())


@router.put("/{config_id}", response_model=CloudConfigResponse)
async def update_cloud_config(
    config_id: str,
    config: CloudConfigUpdate,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Update a cloud configuration."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    existing = await repo.get_by_id(config_id)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if existing.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_data = config.model_dump(exclude_unset=True, exclude={
        "access_key_id", "secret_access_key",
        "subscription_id", "client_id", "client_secret", "tenant_id",
        "project_id", "service_account_json"
    })
    
    # If credentials are being updated, encrypt them
    credentials_updated = False
    credentials_dict = {}
    
    if config.access_key_id or config.secret_access_key:
        # AWS credentials
        if not config.access_key_id or not config.secret_access_key:
            raise HTTPException(status_code=400, detail="Both access_key_id and secret_access_key are required for AWS")
        credentials_dict = {
            "access_key_id": config.access_key_id,
            "secret_access_key": config.secret_access_key,
        }
        credentials_updated = True
    elif config.subscription_id or config.client_id or config.client_secret or config.tenant_id:
        # Azure credentials
        if not all([config.subscription_id, config.client_id, config.client_secret, config.tenant_id]):
            raise HTTPException(status_code=400, detail="All Azure credentials are required: subscription_id, client_id, client_secret, tenant_id")
        credentials_dict = {
            "subscription_id": config.subscription_id,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "tenant_id": config.tenant_id,
        }
        credentials_updated = True
    elif config.project_id or config.service_account_json:
        # GCP credentials
        if not config.project_id or not config.service_account_json:
            raise HTTPException(status_code=400, detail="Both project_id and service_account_json are required for GCP")
        credentials_dict = {
            "project_id": config.project_id,
            "service_account_json": config.service_account_json,
        }
        credentials_updated = True
    
    if credentials_updated:
        credentials_json = json.dumps(credentials_dict)
        update_data["credentials_encrypted"] = encryption_service.encrypt(credentials_json)
    
    # Update the model
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(config_id, existing)
    return CloudConfigResponse(**updated.model_dump())


@router.delete("/{config_id}", status_code=204)
async def delete_cloud_config(
    config_id: str,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Delete a cloud configuration."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    config = await repo.get_by_id(config_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if config.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await repo.delete(config_id)
    return None


@router.post("/{config_id}/test", status_code=200)
async def test_cloud_config(
    config_id: str,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session),
    encryption_service: EncryptionService = Depends(get_encryption_service),
):
    """Test cloud configuration credentials."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    config = await repo.get_by_id(config_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if config.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Decrypt credentials
    credentials_json = encryption_service.decrypt(config.credentials_encrypted)
    credentials = json.loads(credentials_json)
    
    # Test credentials based on provider
    if config.provider == "aws":
        from app.services.aws_cost_service import AWSCostService
        try:
            service = AWSCostService(
                access_key_id=credentials["access_key_id"],
                secret_access_key=credentials["secret_access_key"],
                region=config.region or "us-east-1"
            )
            await service.test_connection()
            return {"status": "success", "message": "AWS credentials are valid"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid credentials: {str(e)}")
    elif config.provider == "azure":
        from app.services.azure_cost_service import AzureCostService
        try:
            service = AzureCostService(
                subscription_id=credentials["subscription_id"],
                client_id=credentials["client_id"],
                client_secret=credentials["client_secret"],
                tenant_id=credentials["tenant_id"]
            )
            await service.test_connection()
            return {"status": "success", "message": "Azure credentials are valid"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid credentials: {str(e)}")
    elif config.provider == "gcp":
        # TODO: Implement GCP credential testing
        return {"status": "not_implemented", "message": "GCP credential testing not yet implemented"}
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {config.provider}")


@router.post("/{config_id}/activate", response_model=CloudConfigResponse)
async def activate_cloud_config(
    config_id: str,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Activate a cloud configuration (deactivates others for the same provider)."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    config = await repo.get_by_id(config_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if config.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Activate this config
    # Note: Multiple configs can be active at the same time for the same provider
    # This allows users to sync from multiple AWS accounts or Azure subscriptions
    config.is_active = True
    updated = await repo.update(config_id, config)
    return CloudConfigResponse(**updated.model_dump())


@router.post("/{config_id}/deactivate", response_model=CloudConfigResponse)
async def deactivate_cloud_config(
    config_id: str,
    organization_id: str = Query(..., description="Organization ID (Clerk)"),
    session: AsyncSession = Depends(get_db_session)
):
    """Deactivate a cloud configuration."""
    repo = RepositoryFactory.get_cloud_config_repository(session)
    config = await repo.get_by_id(config_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Cloud configuration not found")
    
    if config.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    config.is_active = False
    updated = await repo.update(config_id, config)
    return CloudConfigResponse(**updated.model_dump())

