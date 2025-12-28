"""Scenario API routes."""
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    CostScenarioCreate,
    CostScenarioResponse,
)
from database.models.base_models import CostScenario

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("", response_model=List[CostScenarioResponse])
async def get_scenarios(session: AsyncSession = Depends(get_db_session)):
    """Get all cost scenarios."""
    repo = RepositoryFactory.get_cost_scenario_repository(session)
    scenarios = await repo.get_all()
    return [CostScenarioResponse(**s.model_dump()) for s in scenarios]


@router.get("/{scenario_id}", response_model=CostScenarioResponse)
async def get_scenario(scenario_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a scenario by ID."""
    repo = RepositoryFactory.get_cost_scenario_repository(session)
    scenario = await repo.get_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return CostScenarioResponse(**scenario.model_dump())


@router.post("", response_model=CostScenarioResponse, status_code=201)
async def create_scenario(scenario: CostScenarioCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new cost scenario."""
    repo = RepositoryFactory.get_cost_scenario_repository(session)
    
    # Check if scenario with same name exists
    scenarios = await repo.find_by({"name": scenario.name})
    if scenarios:
        raise HTTPException(status_code=400, detail="Scenario with this name already exists")
    
    scenario_model = CostScenario(**scenario.model_dump())
    created = await repo.create(scenario_model)
    return CostScenarioResponse(**created.model_dump())

