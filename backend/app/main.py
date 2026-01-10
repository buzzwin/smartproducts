"""FastAPI application entry point."""
import sys
from pathlib import Path

# Add backend directory to Python path for absolute imports
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    products, costs, unified_costs, scenarios, csv_import, features, resources, vendors,
    workstreams, phases, tasks, strategies, problems, interviews, decisions, releases,
    stakeholders, status_reports, feature_reports, metrics, outcomes, insights, product_context,
    prioritization_models, priority_scores, roadmaps, revenue_models, pricing_tiers,
    usage_metrics, notifications, modules, cloud_configs, aws_costs, azure_costs, gmail, email_agent,
    email_accounts
)
from database.database import init_database
from app.services.scheduler import get_email_scheduler

app = FastAPI(
    title="SmartProducts Platform API",
    description="API for product management and Total Cost of Ownership tracking",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router)
app.include_router(product_context.router)
app.include_router(costs.router)  # Legacy CostItem
app.include_router(unified_costs.router)  # New unified Cost model
app.include_router(scenarios.router)
app.include_router(features.router)
app.include_router(resources.router)
app.include_router(vendors.router)
app.include_router(workstreams.router)
app.include_router(phases.router)
app.include_router(tasks.router)
app.include_router(strategies.router)
app.include_router(problems.router)
app.include_router(insights.router)
app.include_router(interviews.router)
app.include_router(decisions.router)
app.include_router(releases.router)
app.include_router(stakeholders.router)
app.include_router(status_reports.router)
app.include_router(feature_reports.router)
app.include_router(metrics.router)
app.include_router(outcomes.router)
app.include_router(prioritization_models.router)
app.include_router(priority_scores.router)
app.include_router(roadmaps.router)
app.include_router(revenue_models.router)
app.include_router(pricing_tiers.router)
app.include_router(usage_metrics.router)
app.include_router(notifications.router)
app.include_router(modules.router)
app.include_router(csv_import.router)
app.include_router(cloud_configs.router)
app.include_router(aws_costs.router)
app.include_router(azure_costs.router)
app.include_router(gmail.router)
app.include_router(email_agent.router)
app.include_router(email_accounts.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup."""
    await init_database()
    # Start email scheduler
    scheduler = get_email_scheduler()
    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    scheduler = get_email_scheduler()
    scheduler.stop()


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "SmartProducts Platform API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

