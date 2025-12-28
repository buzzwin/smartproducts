"""Task repository interface."""
from abc import ABC
from typing import Optional, List
from ..models.base_models import Task
from .base_repository import BaseRepository


class TaskRepository(BaseRepository[Task], ABC):
    """Task repository interface with task-specific methods."""
    
    async def get_by_product(self, product_id: str) -> List[Task]:
        """Get all tasks for a product."""
        return await self.find_by({"product_id": product_id})
    
    async def get_by_module(self, module_id: str) -> List[Task]:
        """Get all tasks for a module."""
        return await self.find_by({"module_id": module_id})
    
    async def get_by_product_or_module(self, product_id: str, module_id: Optional[str] = None) -> List[Task]:
        """Get tasks for a product, optionally filtered by module. If module_id is None, returns all product-level tasks."""
        if module_id:
            return await self.find_by({"product_id": product_id, "module_id": module_id})
        else:
            return await self.find_by({"product_id": product_id, "module_id": None})
    
    async def get_by_feature(self, feature_id: str) -> List[Task]:
        """Get all tasks for a feature."""
        return await self.find_by({"feature_id": feature_id})
    
    async def get_by_workstream(self, workstream_id: str) -> List[Task]:
        """Get all tasks for a workstream."""
        return await self.find_by({"workstream_id": workstream_id})
    
    async def get_by_phase(self, phase_id: str) -> List[Task]:
        """Get all tasks for a phase."""
        return await self.find_by({"phase_id": phase_id})
    
    async def get_dependent_tasks(self, task_id: str) -> List[Task]:
        """Get all tasks that depend on the given task (use dependencies field)."""
        raise NotImplementedError("Subclasses must implement get_dependent_tasks")
    
    async def get_by_assignee(self, resource_id: str) -> List[Task]:
        """Get all tasks assigned to a resource."""
        raise NotImplementedError("Subclasses must implement get_by_assignee")
    
    async def get_by_status(self, status: str) -> List[Task]:
        """Get all tasks with a specific status."""
        return await self.find_by({"status": status})

