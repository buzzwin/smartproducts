"""Migration script to convert capabilities to features and update all references."""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.database import get_database, RepositoryFactory
from database.models.base_models import Feature
from typing import Dict, List


async def migrate_capabilities_to_features():
    """DEPRECATED: This migration script is no longer needed.
    Capabilities have been removed from the codebase.
    If you have existing capability data in your database, you'll need to manually migrate it.
    This script cannot run because get_capability_repository() no longer exists."""
    print("⚠️  This migration script is deprecated.")
    print("Capabilities have been removed from the codebase.")
    print("If you have existing capability data, you'll need to manually migrate it to features.")
    return
    
    # The code below is kept for reference but will not execute
    db = await get_database()
    session = await db.get_session().__anext__()
    
    try:
        # Get repositories
        # capability_repo = RepositoryFactory.get_capability_repository(session)  # This no longer exists
        feature_repo = RepositoryFactory.get_feature_repository(session)
        task_repo = RepositoryFactory.get_task_repository(session)
        insight_repo = RepositoryFactory.get_insight_repository(session)
        problem_repo = RepositoryFactory.get_problem_repository(session)
        
        # Get all capabilities
        capabilities = await capability_repo.get_all()
        print(f"Found {len(capabilities)} capabilities to migrate")
        
        # Create mapping: capability_id -> feature_id
        capability_to_feature: Dict[str, str] = {}
        
        # First pass: Create features from capabilities (without parent references)
        for capability in capabilities:
            # Create feature from capability
            feature = Feature(
                product_id=capability.product_id or "",  # Will be set from module if needed
                module_id=capability.module_id,
                name=capability.name,
                description=capability.description,
                owner=capability.owner,
                order=capability.order,
                status="discovery",  # Default status for migrated features
            )
            
            created_feature = await feature_repo.create(feature)
            capability_to_feature[capability.id] = created_feature.id
            print(f"Created feature '{created_feature.name}' (ID: {created_feature.id}) from capability '{capability.name}' (ID: {capability.id})")
        
        # Second pass: Update parent_feature_id references
        for capability in capabilities:
            if capability.parent_capability_id and capability.parent_capability_id in capability_to_feature:
                feature_id = capability_to_feature[capability.id]
                parent_feature_id = capability_to_feature[capability.parent_capability_id]
                
                # Get the feature and update it
                feature = await feature_repo.get_by_id(feature_id)
                if feature:
                    feature.parent_feature_id = parent_feature_id
                    await feature_repo.update(feature_id, feature)
                    print(f"Updated feature '{feature.name}' with parent_feature_id: {parent_feature_id}")
        
        # Third pass: Update all entities with capability_id references
        print("\nUpdating task references...")
        tasks = await task_repo.get_all()
        for task in tasks:
            if task.capability_id and task.capability_id in capability_to_feature:
                # Migrate capability_id to feature_id if feature_id is not already set
                if not task.feature_id:
                    task.feature_id = capability_to_feature[task.capability_id]
                    # Remove capability_id (will be handled by model update)
                    task.capability_id = None
                    await task_repo.update(task.id, task)
                    print(f"Updated task '{task.title}' with feature_id: {task.feature_id}")
        
        print("\nUpdating insight references...")
        insights = await insight_repo.get_all()
        for insight in insights:
            if insight.capability_id and insight.capability_id in capability_to_feature:
                # Migrate capability_id to feature_id if feature_id is not already set
                if not insight.feature_id:
                    insight.feature_id = capability_to_feature[insight.capability_id]
                    # Remove capability_id
                    insight.capability_id = None
                    await insight_repo.update(insight.id, insight)
                    print(f"Updated insight '{insight.observation[:50]}...' with feature_id: {insight.feature_id}")
        
        print("\nUpdating problem references...")
        problems = await problem_repo.get_all()
        for problem in problems:
            if problem.capability_id and problem.capability_id in capability_to_feature:
                # Migrate capability_id to feature_id if feature_id is not already set
                if not problem.feature_id:
                    problem.feature_id = capability_to_feature[problem.capability_id]
                    # Remove capability_id
                    problem.capability_id = None
                    await problem_repo.update(problem.id, problem)
                    print(f"Updated problem '{problem.title}' with feature_id: {problem.feature_id}")
        
        print("\nMigration completed successfully!")
        print(f"Migrated {len(capabilities)} capabilities to features")
        print(f"Updated {len([t for t in tasks if t.capability_id])} task references")
        print(f"Updated {len([i for i in insights if i.capability_id])} insight references")
        print(f"Updated {len([p for p in problems if p.capability_id])} problem references")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await session.close()


if __name__ == "__main__":
    asyncio.run(migrate_capabilities_to_features())

