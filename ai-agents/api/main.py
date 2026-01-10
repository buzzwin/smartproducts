"""FastAPI application for the generic email agent service."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import email_agent

from ..config.settings import settings

# Create FastAPI app
app = FastAPI(
    title="Generic Email Agent API",
    description="A domain-agnostic email analysis service using LangGraph",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(email_agent.router, prefix="/api", tags=["email-agent"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Generic Email Agent API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )

