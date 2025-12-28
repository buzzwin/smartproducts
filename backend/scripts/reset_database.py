"""Script to reset the database by deleting all data and seeding with sample data.

This script:
1. Deletes ALL existing data (regardless of user ownership)
2. Seeds the database with fresh sample data

The seeded data does not include user-specific information.
All owner fields are left empty for authenticated users to populate.

To use this script:
    python backend/scripts/reset_database.py
"""
import asyncio
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from scripts.delete_all_data import delete_all_data
from scripts.seed_sample_data import seed_sample_data


async def reset_database():
    """Reset the database by deleting all data and seeding with sample data."""
    print("🔄 Starting database reset...")
    print("=" * 60)
    
    # Step 1: Delete all data
    print("\n📋 Step 1: Deleting all existing data...")
    await delete_all_data()
    
    # Step 2: Seed with sample data
    print("\n📋 Step 2: Seeding with sample data...")
    await seed_sample_data()
    
    print("\n" + "=" * 60)
    print("✅ Database reset completed successfully!")
    print("\nThe database has been cleared and populated with sample data.")


if __name__ == "__main__":
    asyncio.run(reset_database())

