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
    products, costs, unified_costs, scenarios, csv_import, features, resources,
    workstreams, phases, tasks, strategies, problems, interviews, decisions, releases,
    stakeholders, status_reports, metrics, outcomes, insights, product_context,
    prioritization_models, priority_scores, roadmaps, revenue_models, pricing_tiers,
    usage_metrics, notifications, modules
)
from database.database import init_database

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


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    await init_database()


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "SmartProducts Platform API", "version": "1.0.0"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

