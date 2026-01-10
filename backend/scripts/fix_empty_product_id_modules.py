"""
Script to fix modules with empty product_id.
This script finds all modules with empty product_id and allows manual assignment.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.database import get_db_session_context, RepositoryFactory, init_database
from database.models.base_models import Module


async def fix_empty_product_id_modules():
    """
    Find and fix modules with empty product_id.
    """
    print("Starting fix: Finding modules with empty product_id...")

    async with get_db_session_context() as session:
        module_repo = RepositoryFactory.get_module_repository(session)
        
        # Get all modules
        all_modules = await module_repo.get_all()
        
        # Find modules with empty product_id
        empty_product_id_modules = [
            m for m in all_modules 
            if not m.product_id or m.product_id.strip() == ""
        ]
        
        if not empty_product_id_modules:
            print("No modules found with empty product_id.")
            return
        
        print(f"\nFound {len(empty_product_id_modules)} module(s) with empty product_id:")
        for i, module in enumerate(empty_product_id_modules, 1):
            print(f"\n{i}. Module: {module.name}")
            print(f"   ID: {module.id}")
            print(f"   Current product_id: '{module.product_id}' (empty)")
            print(f"   Owner: {module.owner_id}")
            print(f"   Status: {module.status}")
        
        # Get all products to help with assignment
        product_repo = RepositoryFactory.get_product_repository(session)
        all_products = await product_repo.get_all()
        
        if not all_products:
            print("\nNo products found in database. Cannot assign product_id.")
            return
        
        print(f"\nAvailable products:")
        for i, product in enumerate(all_products, 1):
            print(f"  {i}. {product.name} (ID: {product.id})")
        
        # For each empty module, try to find a product by owner
        print("\nAttempting to fix modules...")
        fixed_count = 0
        
        for module in empty_product_id_modules:
            # Try to find a product owned by the same user
            matching_products = [
                p for p in all_products 
                if p.owner_id == module.owner_id
            ]
            
            if matching_products:
                # Use the first matching product
                product = matching_products[0]
                print(f"\nFixing module '{module.name}':")
                print(f"  Assigning to product: {product.name} (ID: {product.id})")
                
                module.product_id = product.id
                await module_repo.update(module.id, module)
                fixed_count += 1
                print(f"  ✓ Fixed!")
            else:
                print(f"\n⚠ Could not auto-fix module '{module.name}':")
                print(f"  No products found with matching owner_id: {module.owner_id}")
                print(f"  Please manually update this module's product_id.")
        
        print(f"\n✓ Fixed {fixed_count} out of {len(empty_product_id_modules)} module(s).")
        
        if fixed_count < len(empty_product_id_modules):
            print("\nRemaining modules need manual assignment.")
            print("You can update them via the API or directly in the database.")


if __name__ == "__main__":
    # Initialize database before running fix
    asyncio.run(init_database())
    asyncio.run(fix_empty_product_id_modules())

