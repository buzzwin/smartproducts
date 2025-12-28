"""CSV import script to populate database with cost data."""
import asyncio
import csv
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.database import RepositoryFactory, init_database
from database.models.base_models import (
    Product,
    CostCategory,
    CostScenario,
    CostType,
    CostItem,
)


def parse_amount(amount_str: str) -> float:
    """Parse amount string to float, handling currency symbols and commas."""
    if not amount_str or amount_str.strip() == "":
        return 0.0
    
    # Remove currency symbols, commas, and whitespace
    cleaned = re.sub(r'[$,]', '', str(amount_str).strip())
    
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_csv_row(row: List[str]) -> Dict:
    """Parse a CSV row and extract relevant data."""
    # Skip empty rows
    if not any(cell.strip() for cell in row):
        return None
    
    # Check if this is a product header row
    # Products appear in column 0 (first column) and column 1 is empty
    if len(row) > 0 and row[0].strip() and (len(row) < 2 or not row[1].strip()):
        product_name = row[0].strip()
        # Any non-empty product name in first column with empty second column is treated as a product
        return {"type": "product", "name": product_name}
    
    # Check if this is a category row
    if len(row) > 1 and row[1].strip() in ["Servers", "Third Party Service"]:
        return {"type": "category", "name": row[1].strip()}
    
    # Check if this is a cost item row (has data in column 2 or beyond)
    if len(row) > 2 and row[2].strip():
        item_name = row[2].strip()
        if item_name and item_name not in ["", "Total", "Total With Firewall"]:
            # Extract data for different scenarios
            scenarios = {}
            
            # Current scenario (columns 2-4)
            if len(row) > 3 and row[3].strip():
                amount = parse_amount(row[3])
                comment = row[4].strip() if len(row) > 4 else ""
                if amount > 0 or comment:
                    scenarios["Current"] = {
                        "name": item_name,
                        "amount": amount,
                        "description": comment
                    }
            
            # Option 1 scenario (columns 5-7)
            if len(row) > 6 and row[6].strip():
                amount = parse_amount(row[6])
                comment = row[7].strip() if len(row) > 7 else ""
                if amount > 0 or comment:
                    scenarios["Option 1 (3 Year Reserved)"] = {
                        "name": row[5].strip() if len(row) > 5 and row[5].strip() else item_name,
                        "amount": amount,
                        "description": comment
                    }
            
            # Rackspace scenario (columns 8-10)
            if len(row) > 9 and row[9].strip():
                amount = parse_amount(row[9])
                comment = row[10].strip() if len(row) > 10 else ""
                if amount > 0 or comment:
                    scenarios["Rackspace"] = {
                        "name": row[8].strip() if len(row) > 8 and row[8].strip() else item_name,
                        "amount": amount,
                        "description": comment
                    }
            
            if scenarios:
                return {
                    "type": "cost_item",
                    "name": item_name,
                    "scenarios": scenarios
                }
    
    return None


async def import_csv(csv_path: str):
    """Import CSV data into the database."""
    print(f"Importing data from {csv_path}...")
    
    # Initialize database
    await init_database()
    
    # For SQL databases, we need to use a session context
    from database.database import get_db_session_context
    from database.config import db_config
    from sqlalchemy.ext.asyncio import AsyncSession
    
    if db_config.is_sql:
        async with get_db_session_context() as session:
            if session:
                # Get repositories with session
                product_repo = RepositoryFactory.get_product_repository(session)
                category_repo = RepositoryFactory.get_cost_category_repository(session)
                scenario_repo = RepositoryFactory.get_cost_scenario_repository(session)
                cost_type_repo = RepositoryFactory.get_cost_type_repository(session)
                cost_repo = RepositoryFactory.get_cost_repository(session)
                
                await _import_data(
                    csv_path, product_repo, category_repo, scenario_repo,
                    cost_type_repo, cost_repo
                )
                await session.commit()
    else:
        # MongoDB doesn't need sessions
        product_repo = RepositoryFactory.get_product_repository()
        category_repo = RepositoryFactory.get_cost_category_repository()
        scenario_repo = RepositoryFactory.get_cost_scenario_repository()
        cost_type_repo = RepositoryFactory.get_cost_type_repository()
        cost_repo = RepositoryFactory.get_cost_repository()
        
        await _import_data(
            csv_path, product_repo, category_repo, scenario_repo,
            cost_type_repo, cost_repo
        )


async def _import_data(
    csv_path: str,
    product_repo,
    category_repo,
    scenario_repo,
    cost_type_repo,
    cost_repo
):
    
    # Create or get cost type for "server"
    server_cost_type = await cost_type_repo.find_by({"name": "server"}, limit=1)
    if not server_cost_type:
        server_cost_type_model = CostType(name="server", description="Server costs")
        server_cost_type_obj = await cost_type_repo.create(server_cost_type_model)
        server_cost_type_id = server_cost_type_obj.id
    else:
        server_cost_type_id = server_cost_type[0].id
    
    # Create or get scenarios
    scenario_map = {}
    scenario_names = ["Current", "Option 1 (3 Year Reserved)", "Rackspace"]
    for scenario_name in scenario_names:
        existing = await scenario_repo.find_by({"name": scenario_name}, limit=1)
        if existing:
            scenario_map[scenario_name] = existing[0].id
        else:
            scenario_model = CostScenario(name=scenario_name)
            created = await scenario_repo.create(scenario_model)
            scenario_map[scenario_name] = created.id
    
    # Read and parse CSV
    current_product = None
    current_category = None
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    for row in rows:
        parsed = parse_csv_row(row)
        if not parsed:
            continue
        
        if parsed["type"] == "product":
            product_name = parsed["name"]
            # Get or create product
            existing = await product_repo.get_by_name(product_name)
            if existing:
                current_product = existing
            else:
                product_model = Product(name=product_name)
                current_product = await product_repo.create(product_model)
            current_category = None
            print(f"Processing product: {product_name}")
        
        elif parsed["type"] == "category" and current_product:
            category_name = parsed["name"]
            # Get or create category
            existing = await category_repo.find_by({
                "product_id": current_product.id,
                "name": category_name
            }, limit=1)
            if existing:
                current_category = existing[0]
            else:
                category_model = CostCategory(
                    product_id=current_product.id,
                    name=category_name
                )
                current_category = await category_repo.create(category_model)
            print(f"  Processing category: {category_name}")
        
        elif parsed["type"] == "cost_item" and current_product:
            # Create cost items for each scenario
            for scenario_name, scenario_data in parsed["scenarios"].items():
                if scenario_data["amount"] > 0:
                    cost_item = CostItem(
                        product_id=current_product.id,
                        category_id=current_category.id if current_category else None,
                        scenario_id=scenario_map[scenario_name],
                        cost_type_id=server_cost_type_id,
                        name=scenario_data["name"],
                        amount=scenario_data["amount"],
                        description=scenario_data["description"] if scenario_data["description"] else None,
                    )
                    await cost_repo.create(cost_item)
                    print(f"    Created cost item: {scenario_data['name']} - ${scenario_data['amount']:.2f} ({scenario_name})")
    
    print("\nImport completed successfully!")
    
    # Print summary
    products = await product_repo.get_all()
    print(f"\nSummary:")
    print(f"  Products: {len(products)}")
    for product in products:
        costs = await cost_repo.get_by_product(product.id)
        print(f"    {product.name}: {len(costs)} cost items")


async def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python import_csv.py <path_to_csv_file>")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    if not Path(csv_path).exists():
        print(f"Error: CSV file not found: {csv_path}")
        sys.exit(1)
    
    await import_csv(csv_path)


if __name__ == "__main__":
    asyncio.run(main())

