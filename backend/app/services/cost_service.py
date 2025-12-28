"""Cost service for business logic."""
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory
from database.models.base_models import CostItem, Product
from database.schema import ProductCostsResponse, CostItemResponse, ProductResponse


class CostService:
    """Service for cost-related business logic."""
    
    @staticmethod
    async def get_product_costs(
        product_id: str,
        scenario_id: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> ProductCostsResponse:
        """Get all costs for a product."""
        cost_repo = RepositoryFactory.get_cost_repository(session)
        product_repo = RepositoryFactory.get_product_repository(session)
        
        # Get product
        product = await product_repo.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product with id {product_id} not found")
        
        # Get costs
        cost_items = await cost_repo.get_by_product(product_id, scenario_id)
        
        # Calculate total
        total = sum(item.amount for item in cost_items)
        
        return ProductCostsResponse(
            product=ProductResponse(
                id=product.id,
                name=product.name,
                description=product.description,
                created_at=product.created_at,
                updated_at=product.updated_at,
            ),
            costs=[CostItemResponse(**item.model_dump()) for item in cost_items],
            total=total,
        )
    
    @staticmethod
    async def get_totals_by_product(
        scenario_id: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> Dict[str, float]:
        """Get total costs grouped by product."""
        cost_repo = RepositoryFactory.get_cost_repository(session)
        return await cost_repo.get_totals_by_product(scenario_id)
    
    @staticmethod
    async def get_totals_by_scenario(
        product_id: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> Dict[str, float]:
        """Get total costs grouped by scenario."""
        cost_repo = RepositoryFactory.get_cost_repository(session)
        return await cost_repo.get_totals_by_scenario(product_id)
    
    @staticmethod
    async def get_all_costs(
        product_id: Optional[str] = None,
        scenario_id: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> List[CostItemResponse]:
        """Get all cost items with optional filters."""
        cost_repo = RepositoryFactory.get_cost_repository(session)
        
        if product_id and scenario_id:
            items = await cost_repo.get_by_product(product_id, scenario_id)
        elif product_id:
            items = await cost_repo.get_by_product(product_id)
        elif scenario_id:
            items = await cost_repo.get_by_scenario(scenario_id)
        else:
            items = await cost_repo.get_all()
        
        return [CostItemResponse(**item.model_dump()) for item in items]

