"""Email account repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import EmailAccount
from .base_repository import BaseRepository


class EmailAccountRepository(BaseRepository[EmailAccount], ABC):
    """Email account repository interface with email account-specific methods."""
    
    async def get_by_user_id(self, user_id: str) -> List[EmailAccount]:
        """Get all email accounts for a user."""
        return await self.find_by({"user_id": user_id})
    
    async def get_active(self, user_id: str) -> List[EmailAccount]:
        """Get all active email accounts for a user."""
        return await self.find_by({
            "user_id": user_id,
            "is_active": True
        })
    
    async def get_default(self, user_id: str) -> Optional[EmailAccount]:
        """Get the default email account for a user."""
        accounts = await self.find_by({
            "user_id": user_id,
            "is_default": True,
            "is_active": True
        })
        return accounts[0] if accounts else None
    
    async def set_default(self, account_id: str, user_id: str) -> bool:
        """Set an account as default for a user (unsetting others)."""
        # Get all user's accounts
        accounts = await self.get_by_user_id(user_id)
        
        # Unset all defaults
        for account in accounts:
            if account.id != account_id:
                account.is_default = False
                await self.update(account.id, account)
        
        # Set the specified account as default
        account = await self.get_by_id(account_id)
        if account and account.user_id == user_id:
            account.is_default = True
            await self.update(account_id, account)
            return True
        return False

