"""Database initialization script."""
import asyncio
from .database import init_database


async def main():
    """Initialize the database."""
    print(f"Initializing database...")
    await init_database()
    print("Database initialized successfully!")


if __name__ == "__main__":
    asyncio.run(main())

