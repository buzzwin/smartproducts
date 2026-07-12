"""FastAPI application entry point."""
import sys
from pathlib import Path

# Add backend directory to Python path for absolute imports
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import (
    products, costs, unified_costs, scenarios, csv_import, features, resources, vendors,
    workstreams, phases, tasks, strategies, problems, interviews, decisions, releases,
    stakeholders, status_reports, feature_reports, metrics, outcomes, insights, product_context,
    prioritization_models, priority_scores, roadmaps, revenue_models, pricing_tiers,
    usage_metrics, notifications, modules, cloud_configs, aws_costs, azure_costs, gmail, email_agent,
    email_accounts
)
from database.database import init_database, ping_database
from app.services.scheduler import get_email_scheduler

# Build the set of driver exceptions that indicate the database is unreachable.
# Imported defensively so the app still boots if a given driver isn't installed.
_DB_CONNECTION_ERRORS: tuple = ()
try:
    from pymongo.errors import PyMongoError  # type: ignore
    _DB_CONNECTION_ERRORS += (PyMongoError,)
except ImportError:
    pass
try:
    from sqlalchemy.exc import OperationalError, InterfaceError, DBAPIError  # type: ignore
    _DB_CONNECTION_ERRORS += (OperationalError, InterfaceError, DBAPIError)
except ImportError:
    pass

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


async def _database_unavailable_handler(request: Request, exc: Exception):
    """Return a structured 503 when the database can't be reached.

    Without this, a driver connection error bubbles up as an unhandled 500 with
    a plain-text body, which the frontend can only show as a generic
    "An error occurred". A clear JSON payload lets the UI say the database is
    unreachable.
    """
    print(f"⚠️  Database unavailable: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database connection error. The service could not reach its database.",
            "error_type": "database_unavailable",
        },
    )


# Register the DB connection handler for every driver exception type available.
for _exc_cls in _DB_CONNECTION_ERRORS:
    app.add_exception_handler(_exc_cls, _database_unavailable_handler)


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    """Ensure unexpected errors return JSON (not plain text) so the frontend can
    parse a meaningful message. HTTPException/validation errors keep their own
    built-in handlers and are unaffected."""
    print(f"❌ Unhandled error on {request.method} {request.url.path}: "
          f"{type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}"},
    )


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
    """Health check that verifies database connectivity.

    Returns 200 when the database is reachable and 503 (status "degraded")
    when it is not, so the frontend can surface a clear connectivity banner.
    """
    try:
        await asyncio.wait_for(ping_database(), timeout=5)
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        print(f"⚠️  Health check: database unreachable: {type(exc).__name__}: {exc}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "database": "disconnected",
                "detail": "Database connection error. The service could not reach its database.",
            },
        )

