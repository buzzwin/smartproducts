"""Script to delete all data from the database.

This script deletes ALL data from the database, regardless of:
- User ownership
- Organization membership
- Data type or entity

Use with caution! This is a destructive operation.

To use this script:
    python backend/scripts/delete_all_data.py
"""
import asyncio
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.database import get_db_session_context, RepositoryFactory, init_database
from database.config import db_config


async def delete_all_data():
    """Delete all data from the database.
    
    Warning: This will delete ALL data regardless of ownership or user.
    Use with caution in production environments.
    """
    print("🗑️  Starting database cleanup...")
    print("=" * 60)
    print("⚠️  Warning: This will delete ALL data, regardless of user ownership.")
    print("=" * 60)
    
    # Initialize database first
    await init_database()
    
    if db_config.is_sql:
        # For SQL databases, delete all records from tables
        async with get_db_session_context() as session:
            try:
                # Get all repositories - delete in reverse dependency order
                repos = [
                    ('outcomes', RepositoryFactory.get_outcome_repository(session)),
                    ('metrics', RepositoryFactory.get_metric_repository(session)),
                    ('status_reports', RepositoryFactory.get_status_report_repository(session)),
                    ('stakeholders', RepositoryFactory.get_stakeholder_repository(session)),
                    ('releases', RepositoryFactory.get_release_repository(session)),
                    ('decisions', RepositoryFactory.get_decision_repository(session)),
                    ('interviews', RepositoryFactory.get_interview_repository(session)),
                    ('problems', RepositoryFactory.get_problem_repository(session)),
                    ('strategies', RepositoryFactory.get_strategy_repository(session)),
                    ('insights', RepositoryFactory.get_insight_repository(session)),
                    ('tasks', RepositoryFactory.get_task_repository(session)),
                    ('phases', RepositoryFactory.get_phase_repository(session)),
                    ('workstreams', RepositoryFactory.get_workstream_repository(session)),
                    ('features', RepositoryFactory.get_feature_repository(session)),
                    # Note: Capabilities removed - use Features instead
                    ('modules', RepositoryFactory.get_module_repository(session)),
                    ('resources', RepositoryFactory.get_resource_repository(session)),
                    ('notifications', RepositoryFactory.get_notification_repository(session)),
                    ('priority_scores', RepositoryFactory.get_priority_score_repository(session)),
                    ('prioritization_models', RepositoryFactory.get_prioritization_model_repository(session)),
                    ('roadmaps', RepositoryFactory.get_roadmap_repository(session)),
                    ('usage_metrics', RepositoryFactory.get_usage_metric_repository(session)),
                    ('pricing_tiers', RepositoryFactory.get_pricing_tier_repository(session)),
                    ('revenue_models', RepositoryFactory.get_revenue_model_repository(session)),
                    ('costs', RepositoryFactory.get_unified_cost_repository(session)),
                    ('cost_categories', RepositoryFactory.get_cost_category_repository(session)),
                    ('cost_types', RepositoryFactory.get_cost_type_repository(session)),
                    ('cost_scenarios', RepositoryFactory.get_cost_scenario_repository(session)),
                    ('products', RepositoryFactory.get_product_repository(session)),
                ]
                
                deleted_counts = {}
                
                # Delete in reverse dependency order
                for name, repo in repos:
                    try:
                        all_items = await repo.get_all()
                        count = len(all_items)
                        for item in all_items:
                            await repo.delete(item.id)
                        deleted_counts[name] = count
                        if count > 0:
                            print(f"   ✓ Deleted {count} {name}")
                    except Exception as e:
                        print(f"   ⚠️  Error deleting {name}: {e}")
                
                # Also check for legacy tables (if they exist from old migrations)
                try:
                    from sqlalchemy import text
                    
                    # Check for legacy "workspaces" table
                    result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='workspaces'"))
                    if result.fetchone():
                        result = await session.execute(text("SELECT COUNT(*) FROM workspaces"))
                        count = result.scalar()
                        if count > 0:
                            await session.execute(text("DELETE FROM workspaces"))
                            deleted_counts['workspaces (legacy)'] = count
                            print(f"   ✓ Deleted {count} workspaces (legacy table)")
                    
                    # Check for legacy "cost_items" table
                    result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='cost_items'"))
                    if result.fetchone():
                        result = await session.execute(text("SELECT COUNT(*) FROM cost_items"))
                        count = result.scalar()
                        if count > 0:
                            await session.execute(text("DELETE FROM cost_items"))
                            deleted_counts['cost_items (legacy)'] = count
                            print(f"   ✓ Deleted {count} cost_items (legacy table)")
                except Exception as e:
                    # Table doesn't exist or error - that's fine
                    pass
                
                await session.commit()
                
                print("\n" + "=" * 60)
                print("✅ Database cleanup completed!")
                print("\nSummary:")
                total_deleted = 0
                for name, count in deleted_counts.items():
                    if count > 0:
                        print(f"   - {name}: {count} deleted")
                        total_deleted += count
                print(f"\n   Total records deleted: {total_deleted}")
                        
            except Exception as e:
                await session.rollback()
                print(f"\n❌ Error during cleanup: {e}")
                raise
    else:
        # For MongoDB
        from database.database import get_mongodb_database
        database = get_mongodb_database()
        
        collections = [
            'outcomes', 'metrics', 'status_reports', 'stakeholders', 'releases',
            'decisions', 'interviews', 'problems', 'strategies', 'insights',
            'tasks', 'phases', 'workstreams', 'features', 'capabilities',
            'modules', 'workspaces',  # Include legacy workspaces collection if it exists
            'resources', 'notifications', 'priority_scores',
            'prioritization_models', 'roadmaps', 'usage_metrics', 'pricing_tiers',
            'revenue_models', 'costs', 'cost_items',  # Include legacy cost_items collection if it exists
            'cost_categories', 'cost_types', 'cost_scenarios', 'products'
        ]
        
        deleted_counts = {}
        total_deleted = 0
        for collection_name in collections:
            try:
                collection = database[collection_name]
                count = await collection.count_documents({})
                if count > 0:
                    await collection.delete_many({})
                    deleted_counts[collection_name] = count
                    print(f"   ✓ Deleted {count} {collection_name}")
                    total_deleted += count
            except Exception as e:
                print(f"   ⚠️  Error deleting {collection_name}: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Database cleanup completed!")
        print("\nSummary:")
        for name, count in deleted_counts.items():
            if count > 0:
                print(f"   - {name}: {count} deleted")
        print(f"\n   Total records deleted: {total_deleted}")


if __name__ == "__main__":
    asyncio.run(delete_all_data())

