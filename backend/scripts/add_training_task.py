"""Script to add Training task to a product."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.database import get_db_session_context, RepositoryFactory
from database.models.base_models import Product, Feature, Task, Workstream
import uuid
from datetime import datetime

TRAINING_PLAN_DESCRIPTION = """Engineering Architecture, API Standards & Platform Modernization Training Plan

1. Purpose & Objectives
This training program establishes a standardized, assessed, and sustainable approach to upskilling engineering teams in modern architecture, API standards, performance optimization, security, and cloud readiness.

2. Target Audience
Backend Engineers, Full-Stack Engineers, Technical Leads, Engineering Managers, and New Joiners.

3. Training Methodology
The training follows a structured lifecycle: Assess → Gap Analysis → Train → Validate → Reinforce.

4. Skill Framework
Defined competency levels across API design, performance, security, databases, CI/CD, and cloud readiness.

5. Baseline Assessment
Includes knowledge checks, practical exercises, and self-assessments to determine current skill levels.

6. Gap Analysis
Comparison of expected vs actual skill levels to prioritize targeted training interventions.

7. Training Modules
Modules include API standardization (.NET 9), security, performance tuning, database optimization, CI/CD quality gates, and cloud readiness concepts.

8. Training Materials
Architecture documentation, standardized API checklists, reference code repositories, hands-on labs, recorded sessions, assessment question banks, and operational checklists.

9. Validation & Assessment
Post-training assessment to validate skill improvement and close identified gaps.

10. Ownership & Maintenance
Assigned owners for materials, quarterly reviews, and continuous updates aligned with platform evolution.

11. Timeline
6-week program including assessment, training delivery, validation, and handover.

12. Outcomes
Standardized execution, reduced defects, improved performance, and scalable onboarding through reusable assets."""


async def add_training_task():
    """Add Training task to a product."""
    print("🚀 Adding Training Task...")
    
    # Product name can be customized
    PRODUCT_NAME = "Roadmap Import"
    
    async with get_db_session_context() as session:
        product_repo = RepositoryFactory.get_product_repository(session)
        feature_repo = RepositoryFactory.get_feature_repository(session)
        workstream_repo = RepositoryFactory.get_workstream_repository(session)
        task_repo = RepositoryFactory.get_task_repository(session)
        
        # Step 1: Find product
        print(f"\n📦 Step 1: Finding {PRODUCT_NAME} product...")
        existing_products = await product_repo.get_all()
        product = next((p for p in existing_products if p.name == PRODUCT_NAME), None)
        
        if not product:
            print(f"   ❌ {PRODUCT_NAME} product not found. Please run import_roadmap.py first.")
            return
        
        print(f"   ✅ Found product: {product.name} (ID: {product.id})")
        
        # Step 2: Find Architecture feature
        print("\n🎯 Step 2: Finding Architecture feature...")
        existing_features = await feature_repo.get_by_product(product.id)
        feature = next((f for f in existing_features if f.name == 'Architecture'), None)
        
        if not feature:
            print("   ⚠️  Architecture feature not found. Creating it...")
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
            print(f"   ✅ Created feature: {feature.name} (ID: {feature.id})")
        else:
            print(f"   ✅ Found feature: {feature.name} (ID: {feature.id})")
        
        # Step 3: Find Architecture & Core Refactoring workstream
        print("\n📊 Step 3: Finding Architecture & Core Refactoring workstream...")
        existing_workstreams = await workstream_repo.get_by_product(product.id)
        workstream = next((w for w in existing_workstreams if w.name == 'Architecture & Core Refactoring'), None)
        
        if not workstream:
            print("   ⚠️  Architecture & Core Refactoring workstream not found.")
            print("   The task will be created without a workstream link.")
            workstream_id = None
        else:
            print(f"   ✅ Found workstream: {workstream.name} (ID: {workstream.id})")
            workstream_id = workstream.id
        
        # Step 4: Check if training task already exists
        print("\n📋 Step 4: Checking for existing Training task...")
        existing_tasks = await task_repo.get_by_product(product.id)
        training_task = next(
            (t for t in existing_tasks 
             if t.feature_id == feature.id 
             and 'Training' in t.title),
            None
        )
        
        if training_task:
            print(f"   ⚠️  Training task already exists (ID: {training_task.id})")
            print("   Updating existing task...")
            training_task.title = "Engineering Architecture, API Standards & Platform Modernization Training"
            training_task.description = TRAINING_PLAN_DESCRIPTION
            training_task.status = 'todo'
            training_task.priority = 'high'
            training_task.workstream_id = workstream_id
            await task_repo.update(training_task)
            print(f"   ✅ Updated training task: {training_task.title}")
        else:
            # Step 5: Create Training task
            print("\n📝 Step 5: Creating Training task...")
            training_task = Task(
                id=str(uuid.uuid4()),
                product_id=product.id,
                feature_id=feature.id,
                workstream_id=workstream_id,
                title="Engineering Architecture, API Standards & Platform Modernization Training",
                description=TRAINING_PLAN_DESCRIPTION,
                status='todo',
                priority='high',
                assignee_ids=[],
                depends_on_task_ids=[],
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            training_task = await task_repo.create(training_task)
            print(f"   ✅ Created training task: {training_task.title} (ID: {training_task.id})")
        
        print("\n✅ Training task added successfully!")
        print(f"\n📊 Summary:")
        print(f"   Product: {product.name}")
        print(f"   Feature: {feature.name}")
        print(f"   Workstream: {workstream.name if workstream else 'None'}")
        print(f"   Task: {training_task.title}")
        print(f"   Status: {training_task.status}")
        print(f"   Priority: {training_task.priority}")


if __name__ == "__main__":
    asyncio.run(add_training_task())

