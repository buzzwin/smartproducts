"""Resource cost service for calculating task and feature costs from resource assignments."""
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory
from database.models.base_models import Task, Feature, Resource


class ResourceCostService:
    """Service for calculating resource costs from task assignments."""
    
    @staticmethod
    def _get_task_classification(task: Task, feature: Optional[Feature] = None) -> Optional[str]:
        """Get cost classification for a task, with inheritance from feature."""
        # If task has explicit classification, use it
        if task.cost_classification:
            return task.cost_classification
        # Otherwise, inherit from feature
        if feature and feature.cost_classification:
            return feature.cost_classification
        return None
    
    @staticmethod
    def _convert_hours_to_period(hours: float, cost_period: Optional[str]) -> float:
        """Convert hours to the appropriate period for cost calculation."""
        if not cost_period or cost_period == "hour":
            return hours
        elif cost_period == "month":
            # Assume 160 hours per month (full-time equivalent)
            return hours / 160.0
        elif cost_period == "year":
            # Assume 2080 hours per year (full-time equivalent)
            return hours / 2080.0
        else:
            # Default to hours if period is unknown
            return hours
    
    @staticmethod
    def _calculate_resource_cost(
        hours: float,
        resource: Resource,
        use_actual: bool = False
    ) -> float:
        """Calculate cost for a resource given hours."""
        if not resource.cost_rate:
            return 0.0
        
        # Convert hours to resource's cost_period if needed
        period_amount = ResourceCostService._convert_hours_to_period(
            hours, resource.cost_period
        )
        
        return period_amount * resource.cost_rate
    
    @staticmethod
    async def calculate_task_costs(
        product_id: str,
        module_id: Optional[str] = None,
        feature_id: Optional[str] = None,
        cost_classification: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> List[Dict]:
        """Calculate costs for tasks based on resource assignments."""
        task_repo = RepositoryFactory.get_task_repository(session)
        resource_repo = RepositoryFactory.get_resource_repository(session)
        feature_repo = RepositoryFactory.get_feature_repository(session)
        
        # Get tasks based on filters
        if feature_id:
            tasks = await task_repo.get_by_feature(feature_id)
        elif module_id:
            tasks = await task_repo.get_by_product_or_module(product_id, module_id)
        else:
            tasks = await task_repo.get_by_product(product_id)
        
        # Get all resources to build a lookup
        all_resources = await resource_repo.get_all()
        resource_map = {r.id: r for r in all_resources}
        
        # Get all features for classification inheritance
        if feature_id:
            features = [await feature_repo.get_by_id(feature_id)]
            features = [f for f in features if f]
        elif module_id:
            features = await feature_repo.find_by({"product_id": product_id, "module_id": module_id})
        else:
            features = await feature_repo.find_by({"product_id": product_id})
        
        feature_map = {f.id: f for f in features}
        
        task_costs = []
        for task in tasks:
            # Get classification
            feature = feature_map.get(task.feature_id) if task.feature_id else None
            classification = ResourceCostService._get_task_classification(task, feature)
            
            # Filter by classification if specified
            if cost_classification and classification != cost_classification:
                continue
            
            # Calculate costs for this task
            estimated_cost = 0.0
            total_cost = 0.0
            
            if task.assignee_ids:
                for resource_id in task.assignee_ids:
                    resource = resource_map.get(resource_id)
                    if not resource:
                        continue
                    
                    # Use actual_hours if available, else estimated_hours
                    hours_for_total = task.actual_hours if task.actual_hours is not None else task.estimated_hours
                    hours_for_estimated = task.estimated_hours or 0.0
                    
                    if hours_for_estimated:
                        estimated_cost += ResourceCostService._calculate_resource_cost(
                            hours_for_estimated, resource, use_actual=False
                        )
                    
                    if hours_for_total:
                        total_cost += ResourceCostService._calculate_resource_cost(
                            hours_for_total, resource, use_actual=True
                        )
            
            task_costs.append({
                "task_id": task.id,
                "task_title": task.title,
                "product_id": task.product_id,
                "module_id": task.module_id,
                "feature_id": task.feature_id,
                "estimated_hours": task.estimated_hours,
                "actual_hours": task.actual_hours,
                "estimated_cost": estimated_cost,
                "total_cost": total_cost,
                "cost_classification": classification,
                "assignee_ids": task.assignee_ids or [],
            })
        
        return task_costs
    
    @staticmethod
    async def calculate_feature_costs(
        product_id: str,
        module_id: Optional[str] = None,
        cost_classification: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> List[Dict]:
        """Calculate costs for features by summing task costs."""
        feature_repo = RepositoryFactory.get_feature_repository(session)
        task_repo = RepositoryFactory.get_task_repository(session)
        resource_repo = RepositoryFactory.get_resource_repository(session)
        
        # Get features
        if module_id:
            features = await feature_repo.find_by({"product_id": product_id, "module_id": module_id})
        else:
            features = await feature_repo.find_by({"product_id": product_id})
        
        # Get all resources
        all_resources = await resource_repo.get_all()
        resource_map = {r.id: r for r in all_resources}
        
        feature_costs = []
        for feature in features:
            # Get all tasks for this feature
            tasks = await task_repo.get_by_feature(feature.id)
            
            # Calculate task costs
            task_total_cost = 0.0
            task_estimated_cost = 0.0
            task_count = 0
            
            for task in tasks:
                # Get classification for this task
                classification = ResourceCostService._get_task_classification(task, feature)
                
                # Filter by classification if specified
                if cost_classification and classification != cost_classification:
                    continue
                
                # Calculate task cost
                task_estimated = 0.0
                task_total = 0.0
                
                if task.assignee_ids:
                    for resource_id in task.assignee_ids:
                        resource = resource_map.get(resource_id)
                        if not resource:
                            continue
                        
                        hours_for_total = task.actual_hours if task.actual_hours is not None else task.estimated_hours
                        hours_for_estimated = task.estimated_hours or 0.0
                        
                        if hours_for_estimated:
                            task_estimated += ResourceCostService._calculate_resource_cost(
                                hours_for_estimated, resource, use_actual=False
                            )
                        
                        if hours_for_total:
                            task_total += ResourceCostService._calculate_resource_cost(
                                hours_for_total, resource, use_actual=True
                            )
                
                task_estimated_cost += task_estimated
                task_total_cost += task_total
                task_count += 1
            
            # Determine feature classification
            # Use feature's explicit classification, or infer from tasks (majority rule)
            feature_classification = feature.cost_classification
            if not feature_classification and tasks:
                # Count classifications from tasks
                classifications = []
                for task in tasks:
                    task_class = ResourceCostService._get_task_classification(task, feature)
                    if task_class:
                        classifications.append(task_class)
                
                if classifications:
                    # Use majority rule
                    run_count = classifications.count("run")
                    change_count = classifications.count("change")
                    if run_count > change_count:
                        feature_classification = "run"
                    elif change_count > run_count:
                        feature_classification = "change"
            
            # Filter by classification if specified
            if cost_classification and feature_classification != cost_classification:
                continue
            
            feature_costs.append({
                "feature_id": feature.id,
                "feature_name": feature.name,
                "product_id": feature.product_id,
                "module_id": feature.module_id,
                "estimated_cost": task_estimated_cost,
                "total_cost": task_total_cost,
                "task_count": task_count,
                "cost_classification": feature_classification,
            })
        
        return feature_costs
    
    @staticmethod
    async def calculate_classification_summary(
        product_id: str,
        module_id: Optional[str] = None,
        session: Optional[AsyncSession] = None
    ) -> Dict:
        """Calculate cost summary grouped by classification (run vs change)."""
        # Get all feature costs
        all_feature_costs = await ResourceCostService.calculate_feature_costs(
            product_id, module_id, cost_classification=None, session=session
        )
        
        # Group by classification
        run_total = 0.0
        run_estimated = 0.0
        change_total = 0.0
        change_estimated = 0.0
        unclassified_total = 0.0
        unclassified_estimated = 0.0
        
        run_features = []
        change_features = []
        unclassified_features = []
        
        for feature_cost in all_feature_costs:
            classification = feature_cost.get("cost_classification")
            if classification == "run":
                run_total += feature_cost["total_cost"]
                run_estimated += feature_cost["estimated_cost"]
                run_features.append(feature_cost)
            elif classification == "change":
                change_total += feature_cost["total_cost"]
                change_estimated += feature_cost["estimated_cost"]
                change_features.append(feature_cost)
            else:
                unclassified_total += feature_cost["total_cost"]
                unclassified_estimated += feature_cost["estimated_cost"]
                unclassified_features.append(feature_cost)
        
        grand_total = run_total + change_total + unclassified_total
        grand_estimated = run_estimated + change_estimated + unclassified_estimated
        
        return {
            "run": {
                "total_cost": run_total,
                "estimated_cost": run_estimated,
                "percentage": (run_total / grand_total * 100) if grand_total > 0 else 0.0,
                "feature_count": len(run_features),
                "features": run_features,
            },
            "change": {
                "total_cost": change_total,
                "estimated_cost": change_estimated,
                "percentage": (change_total / grand_total * 100) if grand_total > 0 else 0.0,
                "feature_count": len(change_features),
                "features": change_features,
            },
            "unclassified": {
                "total_cost": unclassified_total,
                "estimated_cost": unclassified_estimated,
                "percentage": (unclassified_total / grand_total * 100) if grand_total > 0 else 0.0,
                "feature_count": len(unclassified_features),
                "features": unclassified_features,
            },
            "total": {
                "total_cost": grand_total,
                "estimated_cost": grand_estimated,
            }
        }

