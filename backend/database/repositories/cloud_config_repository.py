"""Cloud configuration repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import CloudConfig, CloudProvider
from .base_repository import BaseRepository


class CloudConfigRepository(BaseRepository[CloudConfig], ABC):
    """Cloud configuration repository interface with cloud config-specific methods."""
    
    async def get_by_organization(self, organization_id: str) -> List[CloudConfig]:
        """Get all cloud configs for an organization."""
        return await self.find_by({"organization_id": organization_id})
    
    async def get_by_provider(self, organization_id: str, provider: str) -> List[CloudConfig]:
        """Get all cloud configs for an organization and provider."""
        return await self.find_by({
            "organization_id": organization_id,
            "provider": provider
        })
    
    async def get_active_config(self, organization_id: str, provider: str) -> Optional[CloudConfig]:
        """Get the active cloud config for an organization and provider."""
        configs = await self.find_by({
            "organization_id": organization_id,
            "provider": provider,
            "is_active": True
        })
        return configs[0] if configs else None

