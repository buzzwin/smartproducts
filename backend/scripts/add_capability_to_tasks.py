"""Script to add 'Architecture' feature to all tasks in a product.
NOTE: This script has been updated to use Features instead of Capabilities.
The 'Architecture' capability is now an 'Architecture' feature."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.database import get_db_session_context, RepositoryFactory
from database.models.base_models import Feature
import uuid
from datetime import datetime


async def add_feature_to_tasks():
    """Add 'Architecture' feature to all tasks in a product."""
    print("🚀 Adding 'Architecture' feature to tasks...")
    print("=" * 60)
    
    # Product name can be customized
    PRODUCT_NAME = "Roadmap Import"
    
    async with get_db_session_context() as session:
        # Step 1: Find product
        print(f"\n📦 Step 1: Finding {PRODUCT_NAME} product...")
        product_repo = RepositoryFactory.get_product_repository(session)
        existing_products = await product_repo.get_all()
        product = next((p for p in existing_products if p.name == PRODUCT_NAME), None)
        
        if not product:
            print(f"   ❌ {PRODUCT_NAME} product not found. Please run import_roadmap.py first.")
            return
        
        print(f"   ✓ Found product: {product.name} (ID: {product.id})")
        
        # Step 2: Create or get 'Architecture' feature
        print("\n📋 Step 2: Creating/Getting 'Architecture' feature...")
        feature_repo = RepositoryFactory.get_feature_repository(session)
        existing_features = await feature_repo.get_by_product(product.id)
        feature = next((f for f in existing_features if f.name == 'Architecture'), None)
        
        if feature:
            print(f"   ✓ Using existing feature: {feature.name} (ID: {feature.id})")
        else:
            feature = Feature(
                id=str(uuid.uuid4()),
                product_id=product.id,
                name='Architecture',
                description='Roadmap features and tasks',
                status='discovery',
                order=0,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            feature = await feature_repo.create(feature)
            print(f"   ✓ Created feature: {feature.name} (ID: {feature.id})")
        
        # Step 3: Update all tasks for this product to include the feature
        print("\n✅ Step 3: Updating tasks with 'Architecture' feature...")
        task_repo = RepositoryFactory.get_task_repository(session)
        all_tasks = await task_repo.get_by_product(product.id)
        
        updated_count = 0
        already_has_count = 0
        
        for task in all_tasks:
            # Skip if task already has this feature
            if task.feature_id == feature.id:
                already_has_count += 1
                continue
            
            # Update task with feature if it doesn't have one
            if not task.feature_id:
                task.feature_id = feature.id
                task.updated_at = datetime.now()
                try:
                    await task_repo.update(task.id, task)
                    updated_count += 1
                    
                    if updated_count % 10 == 0:
                        print(f"   📝 Updated {updated_count} tasks...")
                except Exception as e:
                    print(f"   ⚠ Failed to update task '{task.title}': {e}")
        
        print(f"\n   📊 Task update summary:")
        print(f"      • Updated: {updated_count} tasks")
        print(f"      • Already had feature: {already_has_count} tasks")
        print(f"      • Total tasks: {len(all_tasks)}")
        
        print("\n" + "=" * 60)
        print(f"✅ Complete!")
        print(f"   • Product: {product.name}")
        print(f"   • Feature: {feature.name}")
        print(f"   • Tasks updated: {updated_count}")
        print("=" * 60)


if __name__ == '__main__':
    asyncio.run(add_feature_to_tasks())
