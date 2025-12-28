"""TCO (Total Cost of Ownership) computation service."""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory
from database.models.base_models import Cost, Product


class TCOService:
    """Service for TCO computation and breakdown."""
    
    @staticmethod
    async def compute_tco(
        product_id: str,
        time_period_months: int = 12,
        session: Optional[AsyncSession] = None
    ) -> Dict:
        """
        Compute TCO for a product.
        
        TCO = Amortized Build Costs + Run Costs + Maintenance Costs + Scale Costs + Allocated Overhead
        
        Args:
            product_id: Product ID
            time_period_months: Time period in months for TCO calculation (default: 12)
            session: Database session
            
        Returns:
            Dict with:
                - total_tco: Total TCO amount
                - currency: Currency code
                - time_period_months: Time period used
                - breakdown: Dict by category (build, run, maintain, scale, overhead)
                - breakdown_by_scope: Dict by scope (task, capability, product, shared)
                - breakdown_by_cost_type: Dict by cost type (labor, infra, license, vendor, other)
                - costs: List of all costs included
        """
        cost_repo = RepositoryFactory.get_cost_repository(session)
        product_repo = RepositoryFactory.get_product_repository(session)
        
        # Get product
        product = await product_repo.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product with id {product_id} not found")
        
        # Get all costs for the product
        all_costs = await cost_repo.get_by_product(product_id)
        
        # Initialize breakdowns
        breakdown_by_category: Dict[str, float] = {
            "build": 0.0,
            "run": 0.0,
            "maintain": 0.0,
            "scale": 0.0,
            "overhead": 0.0
        }
        breakdown_by_scope: Dict[str, float] = {
            "task": 0.0,
            "capability": 0.0,
            "product": 0.0,
            "shared": 0.0
        }
        breakdown_by_cost_type: Dict[str, float] = {
            "labor": 0.0,
            "infra": 0.0,
            "license": 0.0,
            "vendor": 0.0,
            "other": 0.0
        }
        
        # Process each cost
        processed_costs = []
        for cost in all_costs:
            # Calculate amortized/period cost
            period_cost = TCOService._calculate_period_cost(
                cost, time_period_months
            )
            
            if period_cost > 0:
                # Add to category breakdown
                category = cost.category.lower()
                if category in breakdown_by_category:
                    breakdown_by_category[category] += period_cost
                else:
                    breakdown_by_category[category] = period_cost
                
                # Add to scope breakdown
                scope = cost.scope.lower()
                if scope in breakdown_by_scope:
                    breakdown_by_scope[scope] += period_cost
                else:
                    breakdown_by_scope[scope] = period_cost
                
                # Add to cost type breakdown
                cost_type = cost.cost_type.lower()
                if cost_type in breakdown_by_cost_type:
                    breakdown_by_cost_type[cost_type] += period_cost
                else:
                    breakdown_by_cost_type[cost_type] = period_cost
                
                processed_costs.append({
                    "id": cost.id,
                    "name": cost.name,
                    "scope": cost.scope,
                    "scope_id": cost.scope_id,
                    "category": cost.category,
                    "cost_type": cost.cost_type,
                    "amount": cost.amount,
                    "currency": cost.currency,
                    "recurrence": cost.recurrence,
                    "period_cost": period_cost,
                    "description": cost.description
                })
        
        # Calculate total TCO
        total_tco = sum(breakdown_by_category.values())
        
        # Use product currency or default to USD
        currency = product.tco_currency if product.tco_currency else "USD"
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "total_tco": total_tco,
            "currency": currency,
            "time_period_months": time_period_months,
            "calculated_at": datetime.utcnow(),
            "breakdown": breakdown_by_category,
            "breakdown_by_scope": breakdown_by_scope,
            "breakdown_by_cost_type": breakdown_by_cost_type,
            "costs": processed_costs
        }
    
    @staticmethod
    def _calculate_period_cost(cost: Cost, time_period_months: int) -> float:
        """
        Calculate the cost for a given time period.
        
        Handles:
        - One-time costs: Amortized over amortization_period or time_period_months
        - Recurring costs: Multiplied by number of periods
        """
        if cost.recurrence == "one-time":
            # Amortize one-time costs
            amortization_months = cost.amortization_period or time_period_months
            if amortization_months > 0:
                return cost.amount / amortization_months * time_period_months
            else:
                return cost.amount  # If no amortization, treat as full cost
        elif cost.recurrence == "monthly":
            return cost.amount * time_period_months
        elif cost.recurrence == "quarterly":
            quarters = time_period_months / 3.0
            return cost.amount * quarters
        elif cost.recurrence == "annual":
            years = time_period_months / 12.0
            return cost.amount * years
        else:
            # Unknown recurrence, treat as one-time
            return cost.amount
    
    @staticmethod
    async def update_product_tco(
        product_id: str,
        time_period_months: int = 12,
        session: Optional[AsyncSession] = None
    ) -> Product:
        """
        Compute and update the TCO on the product record.
        
        Args:
            product_id: Product ID
            time_period_months: Time period in months for TCO calculation
            session: Database session
            
        Returns:
            Updated Product with TCO fields populated
        """
        tco_result = await TCOService.compute_tco(product_id, time_period_months, session)
        
        product_repo = RepositoryFactory.get_product_repository(session)
        product = await product_repo.get_by_id(product_id)
        
        if not product:
            raise ValueError(f"Product with id {product_id} not found")
        
        # Update product TCO fields
        product.tco = tco_result["total_tco"]
        product.tco_currency = tco_result["currency"]
        product.tco_last_calculated = tco_result["calculated_at"]
        
        # Save updated product
        updated_product = await product_repo.update(product_id, product)
        
        return updated_product
    
    @staticmethod
    async def get_tco_breakdown(
        product_id: str,
        time_period_months: int = 12,
        session: Optional[AsyncSession] = None
    ) -> Dict:
        """
        Get detailed TCO breakdown for a product.
        
        Returns the same structure as compute_tco but with additional details.
        """
        return await TCOService.compute_tco(product_id, time_period_months, session)
    
    @staticmethod
    async def get_tco_by_scope(
        product_id: str,
        scope: str,
        time_period_months: int = 12,
        session: Optional[AsyncSession] = None
    ) -> Dict:
        """
        Get TCO for a specific scope (task, capability, product, shared).
        
        Args:
            product_id: Product ID
            scope: Scope type ("task", "capability", "product", "shared")
            time_period_months: Time period in months
            session: Database session
            
        Returns:
            Dict with TCO breakdown for the specified scope
        """
        cost_repo = RepositoryFactory.get_cost_repository(session)
        product_repo = RepositoryFactory.get_product_repository(session)
        
        # Get product
        product = await product_repo.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product with id {product_id} not found")
        
        # Get costs for the scope
        scope_costs = await cost_repo.get_by_scope(product_id, scope)
        
        total = 0.0
        costs = []
        
        for cost in scope_costs:
            period_cost = TCOService._calculate_period_cost(cost, time_period_months)
            total += period_cost
            
            costs.append({
                "id": cost.id,
                "name": cost.name,
                "scope_id": cost.scope_id,
                "category": cost.category,
                "cost_type": cost.cost_type,
                "amount": cost.amount,
                "currency": cost.currency,
                "recurrence": cost.recurrence,
                "period_cost": period_cost,
                "description": cost.description
            })
        
        currency = product.tco_currency if product.tco_currency else "USD"
        
        return {
            "product_id": product_id,
            "scope": scope,
            "total": total,
            "currency": currency,
            "time_period_months": time_period_months,
            "costs": costs
        }

