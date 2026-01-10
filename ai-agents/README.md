# AI Agents Platform

A modular platform for building and hosting AI agents using LangGraph and LangChain. This project provides a foundation for creating independent, scalable AI agents that can process various types of data and perform intelligent actions.

## Features

- **Modular Architecture**: Easy to add new agents
- **LangGraph Integration**: State-based agent workflows
- **LangChain Support**: LLM integration and tooling
- **Independent Deployment**: Can be hosted separately from main application
- **Extensible**: Base classes for creating custom agents

## Current Agents

### Email Agent
- **Generic, domain-agnostic** email analysis service
- Analyzes emails using LangGraph workflows
- Extracts generic information (title, description, priority, type, etc.)
- Returns results that any application can map to its own domain model
- Gmail integration
- No knowledge of calling application's data structures

## Project Structure

```
ai-agents/
├── agents/           # Agent implementations
│   ├── base/        # Base agent classes
│   └── email/       # Email agent
├── services/         # Shared services
├── models/          # Data models
├── storage/         # Storage layer (repositories)
├── api/             # FastAPI application
└── config/          # Configuration
```

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - `GEMINI_API_KEY` or `EMAIL_AGENT_AI_API_KEY`
   - `GMAIL_CREDENTIALS_PATH` (path to Gmail OAuth credentials)
   - `API_PORT` (default: 8001)

## Running the API

```bash
# Option 1: Using the run script
python run.py

# Option 2: Using uvicorn directly
uvicorn api.main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`

## Adding a New Agent

1. Create a new directory in `agents/` (e.g., `agents/slack/`)
2. Inherit from `BaseAgent` in `agents/base/base_agent.py`
3. Implement your LangGraph workflow
4. Register routes in `api/routes/`

## API Endpoints

### Process Emails
```bash
POST /api/email-agent/process?max_emails=10&since_date=2024-01-01
```
Processes emails from Gmail and returns generic analysis results.

### Get Suggestions
```bash
GET /api/email-agent/suggestions?status=pending&entity_type=feature
```
Retrieves processed email suggestions with optional filters.

### Get Suggestion by ID
```bash
GET /api/email-agent/suggestions/{id}
```
Retrieves a specific processed email suggestion.

### Delete Suggestion
```bash
DELETE /api/email-agent/suggestions/{id}
```
Deletes a processed email suggestion.

## Response Format

All endpoints return generic, domain-agnostic results:

```json
{
  "id": "uuid",
  "email_id": "gmail_message_id",
  "subject": "New feature request",
  "from_email": "user@example.com",
  "entity_type": "feature",
  "suggested_data": {
    "title": "Add dark mode",
    "description": "Users want dark mode support",
    "priority": "high",
    "status": "todo",
    "assignees": ["dev@example.com"],
    "due_date": "2024-12-31"
  },
  "confidence_score": 0.85,
  "status": "pending"
}
```

**Note**: The agent returns generic fields only. Calling applications map these to their own domain models (products, modules, tasks, etc.).

## Environment Variables

- `GEMINI_API_KEY`: Google Gemini API key
- `EMAIL_AGENT_AI_MODEL`: Model name (default: gemini-3-flash-preview)
- `GMAIL_CREDENTIALS_PATH`: Path to Gmail OAuth credentials JSON
- `API_HOST`: API host (default: 0.0.0.0)
- `API_PORT`: API port (default: 8001)

## License

MIT

