"""Migration script to convert existing data to canonical product model.

This script:
1. Converts CostItem to Cost (unified model)
2. Migrates RICE scores from Feature to PriorityScore
3. Links features to capabilities (if not already linked)
"""
import asyncio
import sys
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.config import db_config
from database.database import get_db_session_context, RepositoryFactory, init_database


async def migrate_cost_items_to_costs(session):
    """Convert CostItem records to Cost records."""
    print("\n=== Migrating CostItem to Cost ===")
    
    # Get repositories - use SQLCostRepository for legacy CostItem
    from database.repositories.sqlalchemy_repository import SQLCostRepository
    cost_item_repo = SQLCostRepository(session)
    cost_repo = RepositoryFactory.get_cost_repository(session)
    cost_type_repo = RepositoryFactory.get_cost_type_repository(session)
    cost_category_repo = RepositoryFactory.get_cost_category_repository(session)
    
    # Get all cost items
    cost_items = await cost_item_repo.get_all()
    
    if not cost_items:
        print("No CostItem records found. Skipping migration.")
        return
    
    print(f"Found {len(cost_items)} CostItem records to migrate...")
    
    migrated_count = 0
    skipped_count = 0
    
    for cost_item in cost_items:
        try:
            # Check if this cost item was already migrated
            existing_costs = await cost_repo.find_by({
                "product_id": cost_item.product_id,
                "name": cost_item.name,
                "amount": cost_item.amount
            })
            
            if existing_costs:
                print(f"  ⚠ Skipping {cost_item.name} - already migrated")
                skipped_count += 1
                continue
            
            # Map CostItem fields to Cost fields
            # Determine scope - default to "product" for legacy items
            scope = "product"
            scope_id = None
            
            # Determine category - try to map from category_id
            category = "overhead"  # Default
            if cost_item.category_id:
                try:
                    category_obj = await cost_category_repo.get_by_id(cost_item.category_id)
                    # Map category name to new category enum
                    category_name_lower = category_obj.name.lower() if category_obj else ""
                    if "build" in category_name_lower or "development" in category_name_lower:
                        category = "build"
                    elif "run" in category_name_lower or "operational" in category_name_lower:
                        category = "run"
                    elif "maintain" in category_name_lower or "maintenance" in category_name_lower:
                        category = "maintain"
                    elif "scale" in category_name_lower:
                        category = "scale"
                    else:
                        category = "overhead"
                except:
                    pass
            
            # Determine cost_type - try to map from cost_type_id
            cost_type = "other"  # Default
            cost_type_id = cost_item.cost_type_id
            if cost_item.cost_type_id:
                try:
                    cost_type_obj = await cost_type_repo.get_by_id(cost_item.cost_type_id)
                    cost_type_name_lower = cost_type_obj.name.lower() if cost_type_obj else ""
                    if "labor" in cost_type_name_lower or "person" in cost_type_name_lower:
                        cost_type = "labor"
                    elif "infra" in cost_type_name_lower or "infrastructure" in cost_type_name_lower or "server" in cost_type_name_lower:
                        cost_type = "infra"
                    elif "license" in cost_type_name_lower:
                        cost_type = "license"
                    elif "vendor" in cost_type_name_lower:
                        cost_type = "vendor"
                    else:
                        cost_type = "other"
                except:
                    pass
            
            # Determine recurrence - default to monthly for legacy items
            recurrence = "monthly"
            
            # Create new Cost record
            cost_data = {
                "id": str(uuid.uuid4()),
                "product_id": cost_item.product_id,
                "scope": scope,
                "scope_id": scope_id,
                "category": category,
                "cost_type": cost_type,
                "cost_type_id": cost_type_id,
                "name": cost_item.name,
                "amount": cost_item.amount,
                "currency": cost_item.currency or "USD",
                "recurrence": recurrence,
                "amortization_period": None,
                "description": cost_item.description,
                "created_at": cost_item.created_at or datetime.now(),
                "updated_at": datetime.now(),
            }
            
            await cost_repo.create(cost_data)
            migrated_count += 1
            print(f"  ✓ Migrated: {cost_item.name} ({cost_item.currency} {cost_item.amount})")
            
        except Exception as e:
            print(f"  ✗ Error migrating {cost_item.name}: {e}")
            skipped_count += 1
    
    print(f"\nCostItem migration complete: {migrated_count} migrated, {skipped_count} skipped")


async def migrate_rice_scores_to_priority_scores(session):
    """Migrate RICE scores from Feature to PriorityScore."""
    print("\n=== Migrating RICE scores to PriorityScore ===")
    
    # Get repositories
    feature_repo = RepositoryFactory.get_feature_repository(session)
    prioritization_model_repo = RepositoryFactory.get_prioritization_model_repository(session)
    priority_score_repo = RepositoryFactory.get_priority_score_repository(session)
    
    # Get all features with RICE scores
    all_features = await feature_repo.get_all()
    features_with_rice = [
        f for f in all_features 
        if f.rice_reach is not None or f.rice_impact is not None or f.rice_confidence is not None or f.rice_effort is not None
    ]
    
    if not features_with_rice:
        print("No features with RICE scores found. Skipping migration.")
        return
    
    print(f"Found {len(features_with_rice)} features with RICE scores to migrate...")
    
    # Get or create default RICE prioritization model
    rice_models = await prioritization_model_repo.find_by({
        "type": "rice",
        "applies_to": "feature"
    })
    
    if rice_models:
        rice_model = rice_models[0]
        print(f"Using existing RICE model: {rice_model.name}")
    else:
        # Create default RICE model
        rice_model_data = {
            "id": str(uuid.uuid4()),
            "product_id": features_with_rice[0].product_id,  # Use first feature's product
            "name": "Default RICE Model",
            "type": "rice",
            "applies_to": "feature",
            "is_active": True,
            "criteria": {
                "reach": "number",
                "impact": "number",
                "confidence": "number",
                "effort": "number"
            },
            "weights": {
                "reach": 0.25,
                "impact": 0.25,
                "confidence": 0.25,
                "effort": 0.25
            },
            "version": 1,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        rice_model = await prioritization_model_repo.create(rice_model_data)
        print(f"Created default RICE model: {rice_model.name}")
    
    migrated_count = 0
    skipped_count = 0
    
    for feature in features_with_rice:
        try:
            # Check if priority score already exists for this feature
            existing_scores = await priority_score_repo.find_by({
                "entity_type": "feature",
                "entity_id": feature.id
            })
            
            if existing_scores:
                print(f"  ⚠ Skipping {feature.name} - priority score already exists")
                skipped_count += 1
                continue
            
            # Only migrate if we have enough data to calculate a score
            if feature.rice_reach is None or feature.rice_impact is None or feature.rice_confidence is None or feature.rice_effort is None:
                print(f"  ⚠ Skipping {feature.name} - incomplete RICE data")
                skipped_count += 1
                continue
            
            # Calculate RICE score if not present
            rice_score = feature.rice_score
            if rice_score is None:
                # RICE formula: (Reach × Impact × Confidence) / Effort
                if feature.rice_effort > 0:
                    rice_score = (feature.rice_reach * feature.rice_impact * feature.rice_confidence) / feature.rice_effort
                else:
                    rice_score = 0.0
            
            # Create PriorityScore record
            priority_score_data = {
                "id": str(uuid.uuid4()),
                "product_id": feature.product_id,
                "entity_type": "feature",
                "entity_id": feature.id,
                "prioritization_model_id": rice_model.id,
                "inputs": {
                    "reach": feature.rice_reach,
                    "impact": feature.rice_impact,
                    "confidence": feature.rice_confidence,
                    "effort": feature.rice_effort
                },
                "score": rice_score,
                "confidence": feature.rice_confidence / 100.0 if feature.rice_confidence <= 100 else feature.rice_confidence,
                "assumptions": [],
                "calculated_at": feature.updated_at or datetime.now(),
                "version": 1,
                "created_at": feature.updated_at or datetime.now(),
                "updated_at": datetime.now(),
            }
            
            await priority_score_repo.create(priority_score_data)
            migrated_count += 1
            print(f"  ✓ Migrated RICE score for {feature.name}: {rice_score:.2f}")
            
        except Exception as e:
            print(f"  ✗ Error migrating RICE score for {feature.name}: {e}")
            skipped_count += 1
    
    print(f"\nRICE score migration complete: {migrated_count} migrated, {skipped_count} skipped")


async def link_features_to_capabilities(session):
    """DEPRECATED: This function is no longer needed as capabilities have been removed.
    Features now support hierarchy via parent_feature_id instead of capability_id."""
    print("\n=== Linking Features to Capabilities ===")
    print("⚠️  This function is deprecated. Capabilities have been removed.")
    print("Features now support hierarchy via parent_feature_id instead.")
    return
            default_capability_id = product_capabilities[0].id
            
            for feature in features:
                try:
                    # Try to find a matching capability by name similarity
                    capability_id = default_capability_id
                    feature_name_lower = feature.name.lower()
                    
                    for cap in product_capabilities:
                        cap_name_lower = cap.name.lower()
                        # Simple matching: if feature name contains capability name or vice versa
                        if cap_name_lower in feature_name_lower or feature_name_lower in cap_name_lower:
                            capability_id = cap.id
                            break
                    
                    # Update feature with capability_id
                    await feature_repo.update(feature.id, {"capability_id": capability_id})
                    linked_count += 1
                    print(f"  ✓ Linked {feature.name} to capability")
                    
                except Exception as e:
                    print(f"  ✗ Error linking {feature.name}: {e}")
        
        except Exception as e:
            print(f"  ✗ Error processing product {product_id}: {e}")
    
    print(f"\nFeature-Capability linking complete: {linked_count} linked, {created_count} default capabilities created")


async def migrate():
    """Run all migrations."""
    print("=" * 60)
    print("Canonical Product Model Migration")
    print("=" * 60)
    
    if not db_config.is_sql:
        print("\n⚠ This migration is primarily for SQL databases.")
        print("MongoDB migrations may need manual adjustments.")
        return
    
    try:
        # Initialize database
        await init_database()
        
        # Get database session
        async with get_db_session_context() as session:
            if not session:
                print("Error: Could not get database session")
                return
            
            # Run migrations
            await migrate_cost_items_to_costs(session)
            await migrate_rice_scores_to_priority_scores(session)
            await link_features_to_capabilities(session)
            
            # Commit all changes
            await session.commit()
            
            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("=" * 60)
            
    except Exception as e:
        print(f"\n✗ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(migrate())

