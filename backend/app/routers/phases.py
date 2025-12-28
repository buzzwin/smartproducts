"""Phase API routes."""
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import RepositoryFactory, get_db_session
from database.schema import (
    PhaseCreate,
    PhaseResponse,
    PhaseUpdate,
)
from database.models.base_models import Phase

router = APIRouter(prefix="/api/phases", tags=["phases"])


@router.get("", response_model=List[PhaseResponse])
async def get_phases(session: AsyncSession = Depends(get_db_session)):
    """Get all phases ordered by order field."""
    repo = RepositoryFactory.get_phase_repository(session)
    phases = await repo.get_all_ordered()
    return [PhaseResponse(**p.model_dump()) for p in phases]


@router.get("/{phase_id}", response_model=PhaseResponse)
async def get_phase(phase_id: str, session: AsyncSession = Depends(get_db_session)):
    """Get a phase by ID."""
    repo = RepositoryFactory.get_phase_repository(session)
    phase = await repo.get_by_id(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    return PhaseResponse(**phase.model_dump())


@router.post("", response_model=PhaseResponse, status_code=201)
async def create_phase(phase: PhaseCreate, session: AsyncSession = Depends(get_db_session)):
    """Create a new phase."""
    repo = RepositoryFactory.get_phase_repository(session)
    phase_model = Phase(**phase.model_dump())
    created = await repo.create(phase_model)
    return PhaseResponse(**created.model_dump())


@router.put("/{phase_id}", response_model=PhaseResponse)
async def update_phase(phase_id: str, phase_update: PhaseUpdate, session: AsyncSession = Depends(get_db_session)):
    """Update a phase."""
    repo = RepositoryFactory.get_phase_repository(session)
    
    existing = await repo.get_by_id(phase_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    # Update fields
    update_data = phase_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    updated = await repo.update(phase_id, existing)
    return PhaseResponse(**updated.model_dump())


@router.delete("/{phase_id}", status_code=204)
async def delete_phase(phase_id: str, session: AsyncSession = Depends(get_db_session)):
    """Delete a phase."""
    repo = RepositoryFactory.get_phase_repository(session)
    
    success = await repo.delete(phase_id)
    if not success:
        raise HTTPException(status_code=404, detail="Phase not found")

