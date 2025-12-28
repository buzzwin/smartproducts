"""Script to import a roadmap into the database."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.database import get_db_session_context, RepositoryFactory
from database.models.base_models import Product, Workstream, Phase, Task
import uuid
from datetime import datetime

# Roadmap data structure
ROADMAP_WORKSTREAMS = [
    { 'name': 'Architecture & Core Refactoring', 'order': 1, 'description': 'Core architecture improvements and code refactoring' },
    { 'name': 'API & Integration', 'order': 2, 'description': 'API standardization and integration work' },
    { 'name': 'Database Architecture & Optimization', 'order': 3, 'description': 'Database separation, performance, and scalability' },
    { 'name': 'Mobile App & Mobile API', 'order': 4, 'description': 'Mobile app stability, performance, and modernization' },
    { 'name': 'Cloud & Infrastructure', 'order': 5, 'description': 'Cloud readiness, virtualization, and containerization' },
    { 'name': 'Performance Optimization', 'order': 6, 'description': 'Application and server performance improvements' },
    { 'name': 'CI/CD & DevOps', 'order': 7, 'description': 'CI/CD improvements and release management' },
    { 'name': 'QA & Testing', 'order': 8, 'description': 'QA automation and verification' },
    { 'name': 'Logging, Monitoring & Reporting', 'order': 9, 'description': 'Activity logging, monitoring, and reporting infrastructure' },
    { 'name': 'Security Enhancements', 'order': 10, 'description': 'Security improvements and hardening' },
    { 'name': 'PDF & Document Processing', 'order': 11, 'description': 'PDF generation and document processing enhancements' },
    { 'name': 'Phased Execution Summary', 'order': 12, 'description': 'Execution phases and milestones' },
]

ROADMAP_PHASES = [
    { 'name': 'Phase 1', 'order': 1, 'description': 'Core refactoring, API standardization, DB separation, Mobile API stability, Blob storage, Initial security' },
    { 'name': 'Phase 2', 'order': 2, 'description': 'Flutter app foundation, CI/CD improvements, Logging & reporting, QA automation, Load balancing' },
    { 'name': 'Phase 3', 'order': 3, 'description': '.NET 9 migration, UI refactor, Containerization, Advanced DB optimization, IronPDF migration, Security pipeline' },
    { 'name': 'Phase 4', 'order': 4, 'description': 'Cloud readiness, Continuous monitoring, Formal verification, ML-based code scanning, Active/history data separation' },
    { 'name': 'Phase 5', 'order': 5, 'description': 'Scalability tuning, Performance drills, Security drills, Productivity enhancements, Ongoing optimization' },
]

# Complete Roadmap tasks - using the same structure as frontend
ROADMAP_TASKS = [
    # Phase 1 tasks
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Refactor legacy codebase for modularity', 'priority': 'high' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Standardize internal and external APIs', 'priority': 'high' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Separate application server and database layers', 'priority': 'high' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Implement layered architecture patterns', 'priority': 'high' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Refactor and consolidate branches', 'priority': 'medium' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Optimize branch retrieval logic on application servers', 'priority': 'medium' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Remove dead code and legacy bottlenecks', 'priority': 'medium' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 1', 'title': 'Improve dependency management and upgrades', 'priority': 'medium' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 1', 'title': 'Design standard API contracts', 'priority': 'high' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 1', 'title': 'Implement versioned APIs', 'priority': 'high' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 1', 'title': 'Refactor Mobile App APIs for performance', 'priority': 'high' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 1', 'title': 'Implement REST best practices and error handling', 'priority': 'high' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 1', 'title': 'Introduce preview functionality and feature flags', 'priority': 'medium' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 1', 'title': 'Separate database per company/tenant', 'priority': 'high' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 1', 'title': 'Index optimization', 'priority': 'medium' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 1', 'title': 'Query performance tuning', 'priority': 'medium' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 1', 'title': 'Refactor Mobile App APIs', 'priority': 'high' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 1', 'title': 'Address crash and performance issues', 'priority': 'high' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 1', 'title': 'Remove dead/bottleneck code', 'priority': 'medium' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 1', 'title': 'Improve API response times', 'priority': 'medium' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 1', 'title': 'Implement cloud blob storage for documents', 'priority': 'high' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 1', 'title': 'Separate blob storage for mobile and secondary apps', 'priority': 'medium' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 1', 'title': 'Enable disaster recovery and backups', 'priority': 'medium' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 1', 'title': 'App server separation', 'priority': 'high' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 1', 'title': 'Refactor performance-critical code paths', 'priority': 'medium' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 1', 'title': 'Implement data caching', 'priority': 'medium' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 1', 'title': 'Optimize server configurations', 'priority': 'medium' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 1', 'title': 'Tune application server recycling and queue settings', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 1', 'title': 'Enforce parameterized queries and ORM usage', 'priority': 'high' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 1', 'title': 'Enforce SSL for all endpoints', 'priority': 'high' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 1', 'title': 'IP locking for endpoints', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 1', 'title': 'Centralized audit logging', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 1', 'title': 'WAF and network segmentation', 'priority': 'medium' },
    
    # Phase 2 tasks
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 2', 'title': 'Establish Flutter cross-platform foundation', 'priority': 'high' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 2', 'title': 'Unify mobile APIs for iOS/Android', 'priority': 'medium' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 2', 'title': 'Implement mobile crash analytics and session tracing', 'priority': 'medium' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 2', 'title': 'Enable user feedback capture', 'priority': 'low' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 2', 'title': 'Automate build pipelines', 'priority': 'high' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 2', 'title': 'Automate test execution', 'priority': 'high' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 2', 'title': 'Automate deployments', 'priority': 'high' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 2', 'title': 'Enable multiple intra-day releases', 'priority': 'medium' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 2', 'title': 'Improve rollback mechanisms', 'priority': 'medium' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 2', 'title': 'Implement feature flags', 'priority': 'medium' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 2', 'title': 'Design centralized activity logging framework', 'priority': 'high' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 2', 'title': 'Implement audit logging', 'priority': 'high' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 2', 'title': 'Enable traceability across services', 'priority': 'medium' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 2', 'title': 'Improve server logging and diagnostics', 'priority': 'medium' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 2', 'title': 'Build reporting infrastructure', 'priority': 'medium' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 2', 'title': 'Enable self-service reporting', 'priority': 'medium' },
    { 'workstream': 'QA & Testing', 'phase': 'Phase 2', 'title': 'Design QA automation strategy', 'priority': 'high' },
    { 'workstream': 'QA & Testing', 'phase': 'Phase 2', 'title': 'Implement automated unit tests', 'priority': 'high' },
    { 'workstream': 'QA & Testing', 'phase': 'Phase 2', 'title': 'Implement integration tests', 'priority': 'high' },
    { 'workstream': 'QA & Testing', 'phase': 'Phase 2', 'title': 'Implement regression testing', 'priority': 'medium' },
    { 'workstream': 'QA & Testing', 'phase': 'Phase 2', 'title': 'Reduce manual testing effort', 'priority': 'medium' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 2', 'title': 'Implement load balancing', 'priority': 'high' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 2', 'title': 'Advanced server configurations', 'priority': 'medium' },
    
    # Phase 3 tasks
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 3', 'title': 'Migrate code incrementally to modern .NET standards', 'priority': 'high' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 3', 'title': 'UI refactor', 'priority': 'high' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 3', 'title': 'Identify RoB integration points', 'priority': 'medium' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 3', 'title': 'Design integration architecture', 'priority': 'medium' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 3', 'title': 'Implement and test RoB integrations', 'priority': 'medium' },
    { 'workstream': 'API & Integration', 'phase': 'Phase 3', 'title': 'Monitor integration performance and failures', 'priority': 'low' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 3', 'title': 'Data model simplification', 'priority': 'high' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 3', 'title': 'Introduce caching strategies', 'priority': 'high' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 3', 'title': 'Read replicas for performance', 'priority': 'medium' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 3', 'title': 'Reporting database optimizations', 'priority': 'medium' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 3', 'title': 'Containerize application servers (Docker)', 'priority': 'high' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 3', 'title': 'Implement Kubernetes or equivalent orchestration', 'priority': 'high' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 3', 'title': 'Enable horizontal scaling', 'priority': 'medium' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 3', 'title': 'Introduce auto-scaling policies', 'priority': 'medium' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 3', 'title': 'Implement infrastructure virtualization', 'priority': 'medium' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 3', 'title': 'Enable blue-green and canary deployments', 'priority': 'medium' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 3', 'title': 'Canary deployments', 'priority': 'medium' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 3', 'title': 'Blue-green deployments', 'priority': 'medium' },
    { 'workstream': 'CI/CD & DevOps', 'phase': 'Phase 3', 'title': 'Preview environments', 'priority': 'medium' },
    { 'workstream': 'PDF & Document Processing', 'phase': 'Phase 3', 'title': 'Review current PDF generation pipeline', 'priority': 'high' },
    { 'workstream': 'PDF & Document Processing', 'phase': 'Phase 3', 'title': 'Migrate to IronPDF', 'priority': 'high' },
    { 'workstream': 'PDF & Document Processing', 'phase': 'Phase 3', 'title': 'Optimize PDF performance and quality', 'priority': 'medium' },
    { 'workstream': 'PDF & Document Processing', 'phase': 'Phase 3', 'title': 'Enhance layered PDF capabilities', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 3', 'title': 'Integrate static code analysis into CI/CD', 'priority': 'high' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 3', 'title': 'Security hardening reviews', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 3', 'title': 'Field-level encryption for PII', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 3', 'title': 'Mobile certificate pinning', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 3', 'title': 'Periodic penetration testing', 'priority': 'low' },
    { 'workstream': 'Mobile App & Mobile API', 'phase': 'Phase 3', 'title': 'Convert Objective-C code to Swift', 'priority': 'medium' },
    
    # Phase 4 tasks
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 4', 'title': 'Conduct application cloud readiness assessment', 'priority': 'high' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 4', 'title': 'Conduct database cloud readiness assessment', 'priority': 'high' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 4', 'title': 'Identify cloud-compatible components', 'priority': 'medium' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 4', 'title': 'Refactor non-cloud-ready components', 'priority': 'medium' },
    { 'workstream': 'Cloud & Infrastructure', 'phase': 'Phase 4', 'title': 'Evaluate cloud provider services', 'priority': 'medium' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 4', 'title': 'Implement continuous monitoring', 'priority': 'high' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 4', 'title': 'Performance metrics collection', 'priority': 'high' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 4', 'title': 'Alerting and dashboards', 'priority': 'high' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 4', 'title': 'Incident response drills', 'priority': 'medium' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 4', 'title': 'Automate insights generation', 'priority': 'medium' },
    { 'workstream': 'Logging, Monitoring & Reporting', 'phase': 'Phase 4', 'title': 'Optimize reporting queries', 'priority': 'medium' },
    { 'workstream': 'QA & Testing', 'phase': 'Phase 4', 'title': 'Formal verification planning', 'priority': 'medium' },
    { 'workstream': 'QA & Testing', 'phase': 'Phase 4', 'title': 'ML-based code scan and anomaly detection (future)', 'priority': 'low' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 4', 'title': 'Separate active vs historical tables', 'priority': 'high' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 4', 'title': 'Implement database archival strategy', 'priority': 'medium' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 4', 'title': 'Create historical data repository', 'priority': 'medium' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 4', 'title': 'Plan and implement database sharding (future)', 'priority': 'low' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 4', 'title': 'Assess NoSQL usage for specific workloads', 'priority': 'low' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 4', 'title': 'Enable database cloud readiness', 'priority': 'medium' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 4', 'title': 'High availability and disaster recovery setup', 'priority': 'medium' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 4', 'title': 'Incident response drills', 'priority': 'medium' },
    
    # Phase 5 tasks
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 5', 'title': 'Scalability tuning', 'priority': 'high' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 5', 'title': 'Performance drills', 'priority': 'high' },
    { 'workstream': 'Security Enhancements', 'phase': 'Phase 5', 'title': 'Security drills', 'priority': 'high' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 5', 'title': 'Productivity enhancements', 'priority': 'medium' },
    { 'workstream': 'Architecture & Core Refactoring', 'phase': 'Phase 5', 'title': 'Ongoing optimization', 'priority': 'low' },
    { 'workstream': 'Database Architecture & Optimization', 'phase': 'Phase 5', 'title': 'Ongoing optimization', 'priority': 'low' },
    { 'workstream': 'Performance Optimization', 'phase': 'Phase 5', 'title': 'Ongoing optimization', 'priority': 'low' },
]


async def import_roadmap():
    """Import a roadmap into the database."""
    print("🚀 Starting Roadmap Import...")
    print("=" * 60)
    
    # Product name can be customized
    PRODUCT_NAME = "Roadmap Import"
    
    async with get_db_session_context() as session:
        # Step 1: Create or get product
        print(f"\n📦 Step 1: Creating/Getting {PRODUCT_NAME} product...")
        product_repo = RepositoryFactory.get_product_repository(session)
        existing_products = await product_repo.get_all()
        existing = next((p for p in existing_products if p.name == PRODUCT_NAME), None)
        
        if existing:
            product = existing
            print(f"   ✓ Using existing product: {product.name} (ID: {product.id})")
        else:
            product = Product(
                id=str(uuid.uuid4()),
                name=PRODUCT_NAME,
                description='Roadmap - Total Cost of Ownership and Execution Plan',
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            product = await product_repo.create(product)
            print(f"   ✓ Created product: {product.name} (ID: {product.id})")
        
        # Step 2: Create workstreams
        print(f"\n📋 Step 2: Creating {len(ROADMAP_WORKSTREAMS)} workstreams...")
        workstream_repo = RepositoryFactory.get_workstream_repository(session)
        workstream_map = {}
        workstream_count = 0
        
        for ws_data in ROADMAP_WORKSTREAMS:
            existing_ws = await workstream_repo.get_by_product(product.id)
            found = next((w for w in existing_ws if w.name == ws_data['name']), None)
            
            if found:
                workstream_map[ws_data['name']] = found
                print(f"   ✓ Using existing workstream: {ws_data['name']}")
            else:
                workstream = Workstream(
                    id=str(uuid.uuid4()),
                    product_id=product.id,
                    name=ws_data['name'],
                    description=ws_data['description'],
                    order=ws_data['order'],
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )
                created = await workstream_repo.create(workstream)
                workstream_map[ws_data['name']] = created
                workstream_count += 1
                print(f"   ✓ Created workstream: {ws_data['name']}")
        
        print(f"   📊 Total workstreams: {len(workstream_map)} ({workstream_count} new)")
        
        # Step 3: Create phases
        print(f"\n📅 Step 3: Creating {len(DREAMS_PHASES)} phases...")
        phase_repo = RepositoryFactory.get_phase_repository(session)
        phase_map = {}
        phase_count = 0
        
        for phase_data in DREAMS_PHASES:
            existing_phases = await phase_repo.get_all()
            found = next((p for p in existing_phases if p.name == phase_data['name']), None)
            
            if found:
                phase_map[phase_data['name']] = found
                print(f"   ✓ Using existing phase: {phase_data['name']}")
            else:
                phase = Phase(
                    id=str(uuid.uuid4()),
                    name=phase_data['name'],
                    description=phase_data['description'],
                    order=phase_data['order'],
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )
                created = await phase_repo.create(phase)
                phase_map[phase_data['name']] = created
                phase_count += 1
                print(f"   ✓ Created phase: {phase_data['name']}")
        
        print(f"   📊 Total phases: {len(phase_map)} ({phase_count} new)")
        
        # Step 3.5: Create 'Architecture' feature
        print(f"\n🏗️  Step 3.5: Creating 'Architecture' feature...")
        feature_repo = RepositoryFactory.get_feature_repository(session)
        existing_features = await feature_repo.get_by_product(product.id)
        architecture_feature = next((f for f in existing_features if f.name == 'Architecture'), None)
        
        if architecture_feature:
            print(f"   ✓ Using existing feature: Architecture (ID: {architecture_feature.id})")
        else:
            from database.models.base_models import Feature
            architecture_feature = Feature(
                id=str(uuid.uuid4()),
                product_id=product.id,
                name='Architecture',
                description='Roadmap features and tasks',
                status='discovery',
                order=0,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            architecture_capability = await capability_repo.create(architecture_capability)
            print(f"   ✓ Created capability: Architecture (ID: {architecture_capability.id})")
        
        # Step 4: Create tasks
        print(f"\n✅ Step 4: Creating {len(DREAMS_TASKS)} tasks...")
        task_repo = RepositoryFactory.get_task_repository(session)
        task_count = 0
        skipped_count = 0
        
        for task_data in DREAMS_TASKS:
            workstream = workstream_map.get(task_data['workstream'])
            phase = phase_map.get(task_data['phase'])
            
            if not workstream or not phase:
                print(f"   ⚠ Skipping task '{task_data['title']}' - workstream or phase not found")
                skipped_count += 1
                continue
            
            # Check if task already exists
            existing_tasks = await task_repo.get_by_product(product.id)
            exists = next((t for t in existing_tasks if t.title == task_data['title'] and t.workstream_id == workstream.id), None)
            
            if exists:
                skipped_count += 1
                continue
            
            task = Task(
                id=str(uuid.uuid4()),
                product_id=product.id,
                workstream_id=workstream.id,
                phase_id=phase.id,
                feature_id=architecture_feature.id,  # Assign Architecture feature
                title=task_data['title'],
                description=task_data.get('description'),
                status='todo',
                priority=task_data['priority'],
                assignee_ids=[],
                depends_on_task_ids=[],
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            await task_repo.create(task)
            task_count += 1
            
            if task_count % 10 == 0:
                print(f"   📝 Created {task_count} tasks...")
        
        print(f"\n   📊 Total tasks: {task_count} created, {skipped_count} skipped (already exist)")
        
        print("\n" + "=" * 60)
        print(f"✅ Import Complete!")
        print(f"   • Product: {product.name}")
        print(f"   • Workstreams: {len(workstream_map)}")
        print(f"   • Phases: {len(phase_map)}")
        print(f"   • Tasks: {task_count} new tasks created")
        print("=" * 60)


if __name__ == '__main__':
    asyncio.run(import_roadmap())

