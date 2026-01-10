"""Simple script to run the email agent API server."""
import uvicorn
from api.main import app
from config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )

