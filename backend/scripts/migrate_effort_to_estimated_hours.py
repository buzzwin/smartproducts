"""Migration script to copy effort field to estimated_hours for existing tasks."""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from database.database import get_database


async def migrate_effort_to_estimated_hours():
    """Copy effort to estimated_hours for tasks where estimated_hours is null but effort exists."""
    db = await get_database()
    session = await db.get_session().__anext__()
    
    try:
        print("🔄 Starting migration: effort -> estimated_hours")
        
        # First, check if effort column exists (it might have been removed already)
        result = await session.execute(text("""
            SELECT COUNT(*) as count 
            FROM pragma_table_info('tasks') 
            WHERE name = 'effort'
        """))
        effort_column_exists = result.scalar() > 0
        
        if not effort_column_exists:
            print("✅ effort column does not exist. Migration may have already been run or schema updated.")
            return
        
        # Update tasks: copy effort to estimated_hours where estimated_hours is null
        result = await session.execute(text("""
            UPDATE tasks 
            SET estimated_hours = effort 
            WHERE effort IS NOT NULL 
            AND (estimated_hours IS NULL OR estimated_hours = 0)
        """))
        
        updated_count = result.rowcount
        await session.commit()
        
        print(f"✅ Migration complete: Updated {updated_count} tasks")
        print("   - Copied effort value to estimated_hours where estimated_hours was null/zero")
        print("   - You can now remove the effort column from the database schema if desired")
        
    except Exception as e:
        await session.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        await session.close()


if __name__ == "__main__":
    asyncio.run(migrate_effort_to_estimated_hours())

