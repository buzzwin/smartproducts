# Email Agent Extraction Notes

This document describes what was extracted from the main SmartProducts application and how it was adapted for independent use.

## Components Extracted

### 1. Email Agent (`agents/email/email_agent.py`)
- **Original**: `backend/app/services/email_agent.py`
- **Changes**:
  - Removed direct database dependencies
  - Uses repository interface for storage
  - Makes task correlator optional
  - Makes validation optional (can be disabled or use custom validators)
  - Inherits from `BaseAgent` for consistency

### 2. Gmail Service (`agents/email/gmail_service.py`)
- **Original**: `backend/app/services/gmail_service.py`
- **Changes**:
  - Minimal changes - already fairly independent
  - Updated path references for new project structure

### 3. Task Correlator (`agents/email/task_correlator.py`)
- **Original**: `backend/app/services/task_correlator.py`
- **Changes**:
  - Made optional/pluggable
  - Removed database dependencies
  - Provides interface for custom implementations
  - Includes simple LLM-based correlator and no-op version

### 4. Email Processor (`agents/email/email_processor.py`)
- **Original**: `backend/app/services/email_processor.py`
- **Changes**:
  - Simplified to work with repository interface
  - Removed user_id/email_account_id dependencies (can be added back if needed)
  - Made storage optional

### 5. Models (`models/processed_email.py`)
- **Original**: `backend/database/models/base_models.py`
- **Changes**:
  - Converted to Pydantic models
  - Removed database-specific fields
  - Made more generic

## Key Design Decisions

1. **Repository Pattern**: All storage uses repository interface, making it easy to swap implementations
2. **Optional Components**: Task correlator and validation are optional/pluggable
3. **Base Agent Class**: All agents inherit from `BaseAgent` for consistency
4. **Configuration**: Uses centralized settings from `config/settings.py`
5. **No Hard Dependencies**: Can work without database, task correlator, or validation

## Integration Points

To integrate with your existing system:

1. **Storage**: Implement `BaseRepository` for `ProcessedEmail` using your database
2. **Task Correlator**: Implement `TaskCorrelatorInterface` to query your task database
3. **Validation**: Override `_validate_data_node` to validate against your product/module database
4. **API Routes**: Use the provided FastAPI routes or create your own

## Next Steps

1. Implement storage repository (SQLite, MongoDB, or your existing database)
2. Implement custom task correlator if needed
3. Add custom validation if needed
4. Configure environment variables
5. Deploy independently or integrate into existing system

