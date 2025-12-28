"""Script to seed the database with comprehensive sample data for all entities.

This script creates sample data for testing and development purposes.
It does NOT create user-specific data or associate data with any Clerk users.

Key points:
- All owner fields (owner_id, owner) are left as None
- Resources are sample data only, not tied to actual user accounts
- Data can be used by any authenticated user
- User ownership should be set when users interact with the system through the UI

To use this script:
    python backend/scripts/seed_sample_data.py
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
import uuid

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database.database import get_db_session_context, RepositoryFactory, init_database
from database.models.base_models import (
    Product, CostCategory, CostScenario, CostType, Cost,
    Feature, Resource, Workstream, Phase, Task,
    Insight, Strategy, Problem, Interview, Decision, Release,
    Stakeholder, StatusReport, Metric, Outcome, Module
)


async def seed_sample_data():
    """Seed the database with comprehensive sample data.
    
    Note: This script does not create user-specific data. All owner fields
    (owner_id, owner) are left as None and should be set by authenticated users
    when they interact with the system. Resources are created as sample data
    but are not tied to actual Clerk user accounts.
    """
    print("🌱 Starting database seeding...")
    print("=" * 60)
    print("ℹ️  Note: User fields (owner_id, owner) are left empty.")
    print("   They will be set automatically when authenticated users create/modify data.")
    print("=" * 60)
    
    # Initialize database first
    await init_database()
    
    async with get_db_session_context() as session:
        # Get all repositories
        product_repo = RepositoryFactory.get_product_repository(session)
        module_repo = RepositoryFactory.get_module_repository(session)
        category_repo = RepositoryFactory.get_cost_category_repository(session)
        scenario_repo = RepositoryFactory.get_cost_scenario_repository(session)
        cost_type_repo = RepositoryFactory.get_cost_type_repository(session)
        cost_repo = RepositoryFactory.get_unified_cost_repository(session)
        feature_repo = RepositoryFactory.get_feature_repository(session)
        resource_repo = RepositoryFactory.get_resource_repository(session)
        # Note: Capabilities removed - use Features instead
        workstream_repo = RepositoryFactory.get_workstream_repository(session)
        phase_repo = RepositoryFactory.get_phase_repository(session)
        task_repo = RepositoryFactory.get_task_repository(session)
        insight_repo = RepositoryFactory.get_insight_repository(session)
        strategy_repo = RepositoryFactory.get_strategy_repository(session)
        problem_repo = RepositoryFactory.get_problem_repository(session)
        interview_repo = RepositoryFactory.get_interview_repository(session)
        decision_repo = RepositoryFactory.get_decision_repository(session)
        release_repo = RepositoryFactory.get_release_repository(session)
        stakeholder_repo = RepositoryFactory.get_stakeholder_repository(session)
        status_report_repo = RepositoryFactory.get_status_report_repository(session)
        metric_repo = RepositoryFactory.get_metric_repository(session)
        outcome_repo = RepositoryFactory.get_outcome_repository(session)
        
        # 1. Create Products
        print("\n📦 Step 1: Creating Products...")
        products = {}
        product_data = [
            {
                "name": "E-Commerce Platform",
                "description": "Modern e-commerce platform with microservices architecture"
            },
            {
                "name": "Mobile App",
                "description": "iOS and Android mobile application"
            },
            {
                "name": "Analytics Dashboard",
                "description": "Real-time analytics and reporting dashboard"
            }
        ]
        
        for p_data in product_data:
            existing = await product_repo.get_by_name(p_data["name"])
            if existing:
                product = existing
                print(f"   ✓ Using existing product: {product.name}")
            else:
                product = Product(
                    id=str(uuid.uuid4()),
                    name=p_data["name"],
                    description=p_data["description"],
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                product = await product_repo.create(product)
                print(f"   ✓ Created product: {product.name} (ID: {product.id})")
            products[product.name] = product
        
        ecommerce = products["E-Commerce Platform"]
        mobile = products["Mobile App"]
        analytics = products["Analytics Dashboard"]
        
        # 1.5. Create Modules for each product
        print("\n📦 Step 1.5: Creating Modules...")
        modules = {}
        for product in [ecommerce, mobile, analytics]:
            # Create default module for each product
            # Note: owner_id is left None - should be set by authenticated users
            module = Module(
                id=str(uuid.uuid4()),
                product_id=product.id,
                name=f"{product.name} - Core Module",
                description=f"Default module for {product.name}",
                owner_id=None,  # Will be set by authenticated users
                is_default=True,
                enabled_steps=['strategy', 'discovery', 'prioritization', 'roadmap', 'execution', 'stakeholders', 'metrics'],
                step_order=['strategy', 'discovery', 'prioritization', 'roadmap', 'execution', 'stakeholders', 'metrics'],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            module = await module_repo.create(module)
            modules[product.id] = module
            print(f"   ✓ Created module: {module.name} for {product.name}")
        
        # 2. Create Cost Scenarios and Types
        print("\n💰 Step 2: Creating Cost Scenarios and Types...")
        scenarios = {}
        scenario_data = ["Baseline", "Optimized", "Scale Up"]
        for name in scenario_data:
            existing = await scenario_repo.find_by({"name": name})
            if existing:
                scenario = existing[0] if isinstance(existing, list) else existing
            else:
                scenario = CostScenario(
                    id=str(uuid.uuid4()),
                    name=name,
                    description=f"{name} cost scenario",
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                scenario = await scenario_repo.create(scenario)
            scenarios[name] = scenario
            print(f"   ✓ Created/Found scenario: {scenario.name}")
        
        cost_types = {}
        cost_type_data = ["Server", "Database", "Storage", "CDN", "API"]
        for name in cost_type_data:
            existing = await cost_type_repo.find_by({"name": name})
            if existing:
                cost_type = existing[0] if isinstance(existing, list) else existing
            else:
                cost_type = CostType(
                    id=str(uuid.uuid4()),
                    name=name,
                    description=f"{name} cost type",
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                cost_type = await cost_type_repo.create(cost_type)
            cost_types[name] = cost_type
            print(f"   ✓ Created/Found cost type: {cost_type.name}")
        
        # 3. Create Unified Costs
        print("\n📊 Step 3: Creating Costs...")
        for product in [ecommerce, mobile, analytics]:
            module = modules[product.id]
            # Create module-level costs
            cost = Cost(
                id=str(uuid.uuid4()),
                product_id=product.id,
                module_id=module.id,
                scope="module",
                scope_id=module.id,
                category="run",
                cost_type="infra",
                name=f"{product.name} Infrastructure",
                amount=5000.0,
                currency="USD",
                recurrence="monthly",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            await cost_repo.create(cost)
            print(f"   ✓ Created cost: {cost.name} - ${cost.amount}/month")
        
        # 4. Create Resources
        print("\n👥 Step 4: Creating Resources...")
        resources = {}
        resource_data = [
            {"name": "John Doe", "type": "person", "cost_rate": 100.0, "cost_period": "hour"},
            {"name": "Jane Smith", "type": "person", "cost_rate": 120.0, "cost_period": "hour"},
            {"name": "Bob Johnson", "type": "person", "cost_rate": 80.0, "cost_period": "hour"},
            {"name": "Alice Williams", "type": "person", "cost_rate": 90.0, "cost_period": "hour"}
        ]
        
        for r_data in resource_data:
            resource = Resource(
                id=str(uuid.uuid4()),
                product_id=ecommerce.id,  # Assign to first product
                name=r_data["name"],
                type=r_data["type"],
                cost_rate=r_data["cost_rate"],
                cost_period=r_data["cost_period"],
                currency="USD",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            resource = await resource_repo.create(resource)
            resources[r_data["name"]] = resource
            print(f"   ✓ Created resource: {resource.name}")
        
        # 5. Create Workstreams and Phases
        print("\n📋 Step 5: Creating Workstreams and Phases...")
        workstreams = {}
        phases = {}
        
        workstream_data = [
            {"name": "Frontend Development", "product": ecommerce},
            {"name": "Backend API", "product": ecommerce},
            {"name": "Mobile Features", "product": mobile},
            {"name": "Data Pipeline", "product": analytics}
        ]
        
        for ws_data in workstream_data:
            workstream = Workstream(
                id=str(uuid.uuid4()),
                product_id=ws_data["product"].id,
                name=ws_data["name"],
                description=f"Workstream for {ws_data['name']}",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            workstream = await workstream_repo.create(workstream)
            workstreams[ws_data["name"]] = workstream
            print(f"   ✓ Created workstream: {workstream.name}")
            
            # Create phases for each workstream
            # Note: Phase names must be unique, so we include workstream name
            phase_names = ["Planning", "Development", "Testing", "Deployment"]
            for phase_name in phase_names:
                unique_phase_name = f"{workstream.name} - {phase_name}"
                phase = Phase(
                    id=str(uuid.uuid4()),
                    workstream_id=workstream.id,
                    name=unique_phase_name,
                    description=f"{phase_name} phase for {workstream.name}",
                    start_date=datetime.now() + timedelta(days=len(phases) * 7),
                    end_date=datetime.now() + timedelta(days=(len(phases) + 1) * 7),
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                phase = await phase_repo.create(phase)
                phases[f"{workstream.name}_{phase_name}"] = phase
                print(f"      ✓ Created phase: {phase.name}")
        
        # 6. Create Features (replacing capabilities)
        print("\n✨ Step 6: Creating Features...")
        features = {}
        feature_data = [
            {
                "name": "OAuth 2.0 Login",
                "product": ecommerce,
                "rice_reach": 1000,
                "rice_impact": 0.8,
                "rice_confidence": 0.9,
                "rice_effort": 5
            },
            {
                "name": "Stripe Integration",
                "product": ecommerce,
                "rice_reach": 500,
                "rice_impact": 0.9,
                "rice_confidence": 0.95,
                "rice_effort": 8
            },
            {
                "name": "Product Search",
                "product": ecommerce,
                "rice_reach": 2000,
                "rice_impact": 0.7,
                "rice_confidence": 0.85,
                "rice_effort": 10
            },
            {
                "name": "Push Notifications",
                "product": mobile,
                "rice_reach": 1500,
                "rice_impact": 0.75,
                "rice_confidence": 0.8,
                "rice_effort": 6
            }
        ]
        
        for f_data in feature_data:
            feature = Feature(
                id=str(uuid.uuid4()),
                product_id=f_data["product"].id,
                name=f_data["name"],
                description=f"Feature: {f_data['name']}",
                status='discovery',
                order=0,
                rice_reach=f_data.get("rice_reach"),
                rice_impact=f_data.get("rice_impact"),
                rice_confidence=f_data.get("rice_confidence"),
                rice_effort=f_data.get("rice_effort"),
                priority="high",
                status="in_progress",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            feature = await feature_repo.create(feature)
            features[f_data["name"]] = feature
            print(f"   ✓ Created feature: {feature.name} (RICE: {feature.rice_score if hasattr(feature, 'rice_score') else 'N/A'})")
        
        # 8. Create Tasks
        print("\n✅ Step 7: Creating Tasks...")
        tasks = {}
        task_data = [
            {
                "title": "Implement OAuth endpoints",
                "product": ecommerce,
                "workstream": "Backend API",
                "phase": "Development",
                "assignee": "John Doe",
                "status": "in_progress",
                "priority": "high",
                "estimated_hours": 40.0
            },
            {
                "title": "Design payment UI",
                "product": ecommerce,
                "workstream": "Frontend Development",
                "phase": "Planning",
                "assignee": "Bob Johnson",
                "status": "todo",
                "priority": "high",
                "estimated_hours": 20.0
            },
            {
                "title": "Set up push notification service",
                "product": mobile,
                "workstream": "Mobile Features",
                "phase": "Development",
                "assignee": "Jane Smith",
                "status": "in_progress",
                "priority": "medium",
                "estimated_hours": 30.0
            },
            {
                "title": "Build analytics dashboard",
                "product": analytics,
                "workstream": "Data Pipeline",
                "phase": "Development",
                "assignee": "Alice Williams",
                "status": "done",
                "priority": "medium",
                "estimated_hours": 50.0,
                "actual_hours": 45.0
            }
        ]
        
        for t_data in task_data:
            workstream = workstreams.get(t_data["workstream"])
            phase = phases.get(f"{t_data['workstream']}_{t_data['phase']}")
            resource = resources.get(t_data["assignee"])
            
            # Find a matching feature for the task based on the task title
            matching_feature = None
            for f_name, f_obj in features.items():
                if any(keyword in t_data["title"].lower() for keyword in f_name.lower().split()):
                    matching_feature = f_obj
                    break
            
            task = Task(
                id=str(uuid.uuid4()),
                product_id=t_data["product"].id,
                feature_id=matching_feature.id if matching_feature else None,
                workstream_id=workstream.id if workstream else None,
                phase_id=phase.id if phase else None,
                assignee_ids=[resource.id] if resource else [],
                title=t_data["title"],
                description=f"Task: {t_data['title']}",
                status=t_data["status"],
                priority=t_data["priority"],
                estimated_hours=t_data.get("estimated_hours"),
                actual_hours=t_data.get("actual_hours"),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            task = await task_repo.create(task)
            tasks[t_data["title"]] = task
            print(f"   ✓ Created task: {task.title} ({task.status})")
        
        # 9. Create Insights
        print("\n💡 Step 8: Creating Insights...")
        insights = {}
        insight_data = [
            {
                "observation": "Users want faster checkout",
                "product": ecommerce,
                "source": "customer",
                "votes": 25,
                "sentiment": "positive"
            },
            {
                "observation": "Mobile app crashes on iOS 17",
                "product": mobile,
                "source": "ops",
                "votes": 10,
                "sentiment": "negative"
            },
            {
                "observation": "Need better analytics filters",
                "product": analytics,
                "source": "customer",
                "votes": 15,
                "sentiment": "neutral"
            }
        ]
        
        for i_data in insight_data:
            insight = Insight(
                id=str(uuid.uuid4()),
                product_id=i_data["product"].id,
                observation=i_data["observation"],
                source=i_data["source"],
                votes=i_data.get("votes", 0),
                sentiment=i_data.get("sentiment"),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            insight = await insight_repo.create(insight)
            insights[i_data["observation"]] = insight
            print(f"   ✓ Created insight: {insight.observation} ({insight.votes} votes)")
        
        # 10. Create Strategies
        print("\n📐 Step 9: Creating Strategies...")
        strategies = {}
        strategy_data = [
            {
                "type": "vision",
                "title": "E-Commerce Platform Vision 2024",
                "product": ecommerce,
                "description": "Become the leading e-commerce platform with best-in-class user experience"
            },
            {
                "type": "strategy",
                "title": "Mobile-First Strategy",
                "product": mobile,
                "description": "Focus on mobile experience as primary channel"
            },
            {
                "type": "okr",
                "title": "Q1 2024 OKRs",
                "product": ecommerce,
                "objectives": ["Increase user engagement", "Improve conversion rate"],
                "key_results": [
                    {"description": "Achieve 20% increase in daily active users", "target": "20%"},
                    {"description": "Reduce checkout abandonment by 15%", "target": "15%"}
                ]
            }
        ]
        
        for s_data in strategy_data:
            strategy = Strategy(
                id=str(uuid.uuid4()),
                product_id=s_data["product"].id,
                type=s_data["type"],
                title=s_data["title"],
                description=s_data.get("description"),
                objectives=s_data.get("objectives"),
                key_results=s_data.get("key_results"),
                status="active",
                target_date=datetime.now() + timedelta(days=90),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            strategy = await strategy_repo.create(strategy)
            strategies[s_data["title"]] = strategy
            print(f"   ✓ Created strategy: {strategy.title} ({strategy.type})")
        
        # 11. Create Problems
        print("\n🔍 Step 11: Creating Problems...")
        problems = {}
        problem_data = [
            {
                "title": "Slow checkout process",
                "product": ecommerce,
                "insight": "Users want faster checkout",
                "status": "prioritized",
                "priority": "high",
                "severity": "high"
            },
            {
                "title": "iOS app stability issues",
                "product": mobile,
                "insight": "Mobile app crashes on iOS 17",
                "status": "validating",
                "priority": "critical",
                "severity": "critical"
            }
        ]
        
        for p_data in problem_data:
            insight = insights.get(p_data.get("insight"))
            problem = Problem(
                id=str(uuid.uuid4()),
                product_id=p_data["product"].id,
                title=p_data["title"],
                description=f"Problem: {p_data['title']}",
                insight_ids=[insight.id] if insight else [],
                status=p_data["status"],
                priority=p_data["priority"],
                severity=p_data["severity"],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            problem = await problem_repo.create(problem)
            problems[p_data["title"]] = problem
            print(f"   ✓ Created problem: {problem.title} ({problem.status})")
        
        # 12. Create Interviews
        print("\n🎤 Step 12: Creating Interviews...")
        interview_data = [
            {
                "product": ecommerce,
                "interviewee_name": "Sarah Chen",
                "interviewee_email": "sarah@example.com",
                "notes": "Discussed checkout flow improvements",
                "insight": "Users want faster checkout"
            },
            {
                "product": mobile,
                "interviewee_name": "Mike Rodriguez",
                "interviewee_email": "mike@example.com",
                "notes": "Reported iOS crash issues",
                "insight": "Mobile app crashes on iOS 17"
            }
        ]
        
        for i_data in interview_data:
            insight = insights.get(i_data.get("insight"))
            interview = Interview(
                id=str(uuid.uuid4()),
                product_id=i_data["product"].id,
                interviewee_name=i_data["interviewee_name"],
                interviewee_email=i_data.get("interviewee_email"),
                date=datetime.now() - timedelta(days=7),
                notes=i_data.get("notes"),
                insight_ids=[insight.id] if insight else [],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            interview = await interview_repo.create(interview)
            print(f"   ✓ Created interview: {interview.interviewee_name}")
        
        # 13. Create Decisions
        print("\n🎯 Step 13: Creating Decisions...")
        decision_data = [
            {
                "product": ecommerce,
                "entity_type": "feature",
                "entity_id": features["OAuth 2.0 Login"].id,
                "outcome": "now",
                "rationale": "Better control and customization",
                "decision_maker": "John Doe"
            },
            {
                "product": ecommerce,
                "entity_type": "feature",
                "entity_id": features["Stripe Integration"].id,
                "outcome": "now",
                "rationale": "Proven solution, faster time to market",
                "decision_maker": "Jane Smith"
            }
        ]
        
        for d_data in decision_data:
            decision = Decision(
                id=str(uuid.uuid4()),
                product_id=d_data["product"].id,
                entity_type=d_data["entity_type"],
                entity_id=d_data["entity_id"],
                outcome=d_data["outcome"],
                rationale=d_data.get("rationale"),
                decision_maker=d_data.get("decision_maker"),
                decision_date=datetime.now() - timedelta(days=14),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            decision = await decision_repo.create(decision)
            print(f"   ✓ Created decision: {decision.outcome} for {decision.entity_type}")
        
        # 14. Create Releases
        print("\n🚀 Step 14: Creating Releases...")
        releases = {}
        release_data = [
            {
                "name": "v1.0.0 - Initial Release",
                "product": ecommerce,
                "status": "released",
                "target_date": datetime.now() - timedelta(days=30),
                "features": ["OAuth 2.0 Login", "Stripe Integration"]
            },
            {
                "name": "v1.1.0 - Mobile Enhancements",
                "product": mobile,
                "status": "in_progress",
                "target_date": datetime.now() + timedelta(days=30),
                "features": ["Push Notifications"]
            }
        ]
        
        for r_data in release_data:
            feature_ids = [features[f].id for f in r_data["features"] if f in features]
            release = Release(
                id=str(uuid.uuid4()),
                product_id=r_data["product"].id,
                name=r_data["name"],
                description=f"Release: {r_data['name']}",
                target_date=r_data.get("target_date"),
                status=r_data["status"],
                feature_ids=feature_ids,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            release = await release_repo.create(release)
            releases[r_data["name"]] = release
            print(f"   ✓ Created release: {release.name} ({release.status})")
        
        # 15. Create Stakeholders
        print("\n👔 Step 15: Creating Stakeholders...")
        stakeholders = {}
        stakeholder_data = [
            {
                "name": "CEO",
                "email": "ceo@company.com",
                "role": "Executive",
                "product": ecommerce,
                "influence_level": "critical",
                "communication_preferences": "weekly_meeting",
                "update_frequency": "weekly"
            },
            {
                "name": "CTO",
                "email": "cto@company.com",
                "role": "Technical Leadership",
                "product": ecommerce,
                "influence_level": "high",
                "communication_preferences": "email",
                "update_frequency": "on_release"
            },
            {
                "name": "Product Owner",
                "email": "po@company.com",
                "role": "Product Management",
                "product": mobile,
                "influence_level": "high",
                "communication_preferences": "slack",
                "update_frequency": "weekly"
            }
        ]
        
        for s_data in stakeholder_data:
            stakeholder = Stakeholder(
                id=str(uuid.uuid4()),
                product_id=s_data["product"].id,
                name=s_data["name"],
                email=s_data["email"],
                role=s_data["role"],
                influence_level=s_data["influence_level"],
                communication_preferences=s_data.get("communication_preferences"),
                update_frequency=s_data.get("update_frequency"),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            stakeholder = await stakeholder_repo.create(stakeholder)
            stakeholders[s_data["name"]] = stakeholder
            print(f"   ✓ Created stakeholder: {stakeholder.name} ({stakeholder.role})")
        
        # 16. Create Status Reports
        print("\n📄 Step 16: Creating Status Reports...")
        stakeholder_list = list(stakeholders.values())
        status_report = StatusReport(
            id=str(uuid.uuid4()),
            product_id=ecommerce.id,
            report_date=datetime.now() - timedelta(days=7),
            summary="Q1 progress update: Major milestones achieved",
            highlights=["OAuth implementation completed", "Stripe integration in progress"],
            risks=["Potential delays in mobile app release"],
            next_steps=["Complete payment integration testing"],
            stakeholder_ids=[s.id for s in stakeholder_list[:2]],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        status_report = await status_report_repo.create(status_report)
        print(f"   ✓ Created status report for {ecommerce.name}")
        
        # 17. Create Metrics
        print("\n📊 Step 17: Creating Metrics...")
        metrics = {}
        metric_data = [
            {
                "name": "Daily Active Users",
                "product": ecommerce,
                "type": "leading",
                "target_value": 10000.0,
                "current_value": 8500.0,
                "unit": "count",
                "tracking_frequency": "daily"
            },
            {
                "name": "Conversion Rate",
                "product": ecommerce,
                "type": "lagging",
                "target_value": 3.5,
                "current_value": 3.2,
                "unit": "percentage",
                "tracking_frequency": "weekly"
            },
            {
                "name": "App Crashes",
                "product": mobile,
                "type": "lagging",
                "target_value": 0.1,
                "current_value": 0.5,
                "unit": "percentage",
                "tracking_frequency": "daily"
            }
        ]
        
        for m_data in metric_data:
            metric = Metric(
                id=str(uuid.uuid4()),
                product_id=m_data["product"].id,
                scope="product",
                scope_id=m_data["product"].id,
                metric_type=m_data["type"],
                name=m_data["name"],
                target_value=m_data["target_value"],
                current_value=m_data.get("current_value"),
                unit=m_data["unit"],
                tracking_frequency=m_data["tracking_frequency"],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            metric = await metric_repo.create(metric)
            metrics[m_data["name"]] = metric
            print(f"   ✓ Created metric: {metric.name} ({metric.current_value}/{metric.target_value} {metric.unit})")
        
        # 18. Create Outcomes
        print("\n🎯 Step 18: Creating Outcomes...")
        outcome_data = [
            {
                "product": ecommerce,
                "feature": "OAuth 2.0 Login",
                "metric": "Daily Active Users",
                "description": "Increased user engagement through OAuth",
                "status": "achieved"
            },
            {
                "product": mobile,
                "description": "Reduce app crashes to below 0.1%",
                "status": "pending"
            }
        ]
        
        for o_data in outcome_data:
            feature = features.get(o_data.get("feature")) if o_data.get("feature") else None
            metric = metrics.get(o_data.get("metric")) if o_data.get("metric") else None
            outcome = Outcome(
                id=str(uuid.uuid4()),
                product_id=o_data["product"].id,
                feature_id=feature.id if feature else None,
                metric_id=metric.id if metric else None,
                description=o_data["description"],
                status=o_data["status"],
                achieved_date=datetime.now() - timedelta(days=5) if o_data["status"] == "achieved" else None,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            outcome = await outcome_repo.create(outcome)
            print(f"   ✓ Created outcome: {outcome.description} ({outcome.status})")
        
        await session.commit()
        print("\n" + "=" * 60)
        print("✅ Database seeding completed successfully!")
        print("\nSummary:")
        print(f"   - Products: {len(products)}")
        print(f"   - Modules: {len(modules)}")
        print(f"   - Cost Scenarios: {len(scenarios)}")
        print(f"   - Cost Types: {len(cost_types)}")
        print(f"   - Resources: {len(resources)}")
        print(f"   - Workstreams: {len(workstreams)}")
        print(f"   - Phases: {len(phases)}")
        print(f"   - Capabilities: {len(capabilities)}")
        print(f"   - Features: {len(features)}")
        print(f"   - Tasks: {len(tasks)}")
        print(f"   - Insights: {len(insights)}")
        print(f"   - Strategies: {len(strategies)}")
        print(f"   - Problems: {len(problems)}")
        print(f"   - Interviews: {len(interview_data)}")
        print(f"   - Decisions: {len(decision_data)}")
        print(f"   - Releases: {len(releases)}")
        print(f"   - Stakeholders: {len(stakeholders)}")
        print(f"   - Status Reports: 1")
        print(f"   - Metrics: {len(metrics)}")
        print(f"   - Outcomes: {len(outcome_data)}")


if __name__ == "__main__":
    asyncio.run(seed_sample_data())

