# SmartProducts Platform

A comprehensive platform for product management, strategy planning, discovery, execution tracking, and Total Cost of Ownership (TCO) analysis. Supports the complete product lifecycle from ideation to delivery with integrated cost tracking, resource management, and AI-assisted workflows.

## Architecture

- **Backend**: FastAPI with database-agnostic repository pattern
- **Frontend**: Next.js 14 with TypeScript, Clerk authentication, and shadcn/ui components
- **Database**: SQLite (default), MongoDB, PostgreSQL, MySQL supported
- **Authentication**: Clerk with organization support
- **AI Integration**: AI assistant for form filling and content generation

## Setup

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Configure database (optional, defaults to MongoDB):

```bash
# Create .env.local (recommended) or .env file in backend directory
# .env.local takes precedence over .env if both exist
cat > backend/.env.local << EOF
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/finops
EOF
```

5. Initialize the database:

```bash
python -m database.init_db
```

6. Import CSV data:

```bash
python scripts/import_csv.py /path/to/Server\ Costs\ -\ Sheet1.csv
```

7. Start the server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
# Create .env.local file in frontend directory
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
EOF
```

See `frontend/CLERK_SETUP.md` for detailed Clerk authentication setup instructions.

4. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Database Configuration

The platform supports multiple databases through a repository pattern:

- **MongoDB** (default): `DATABASE_TYPE=mongodb`, `DATABASE_URL=mongodb://localhost:27017/finops`
- **SQLite**: `DATABASE_TYPE=sqlite`, `DATABASE_URL=sqlite:///./finops.db`
- **PostgreSQL**: `DATABASE_TYPE=postgresql`, `DATABASE_URL=postgresql://user:password@localhost:5432/finops`
- **MySQL**: `DATABASE_TYPE=mysql`, `DATABASE_URL=mysql://user:password@localhost:3306/finops`

### MongoDB Setup

1. Install MongoDB locally or use MongoDB Atlas (cloud)
2. Start MongoDB service:

   ```bash
   # macOS (Homebrew)
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod

   # Windows
   # Start MongoDB service from Services panel
   ```

3. Configure the connection string in `.env`:

   ```bash
   DATABASE_TYPE=mongodb
   DATABASE_URL=mongodb://localhost:27017/finops
   ```

4. For MongoDB Atlas, use:
   ```bash
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/finops?retryWrites=true&w=majority
   ```

## Core Features

### Product Management

- **Products**: Full CRUD operations for products with TCO tracking
- **Modules**: Product modules with customizable workflows and step ordering
- **Features**: Hierarchical feature management with parent-child relationships
- **Product Workspace**: Integrated workspace with workflow steps (Overview, Strategy, Discovery, Execution, Stakeholders, Metrics, Cost)

### Strategy & Planning

- **Strategies**: Vision, goals, themes, assumptions, risks, OKRs
- **Roadmaps**: Multiple roadmap types (Now/Next/Later, Timeline, Quarters, Custom)
- **Prioritization**:
  - Prioritization models (RICE, ICE, Value/Effort, Kano, Custom)
  - Priority scoring with confidence levels and assumptions
  - Feature comparison and prioritization matrix
- **Decisions**: Decision logging with outcomes (Now, Next, Later, Drop)

### Discovery & Research

- **Problems**: Problem tracking with status, priority, and evidence
- **Insights**: Customer insights with sentiment analysis and voting
- **Interviews**: Interview management with linked insights
- **Stakeholders**: Stakeholder management with communication preferences

### Execution & Delivery

- **Tasks**: Task management with dependencies, status, priority, effort tracking
- **Releases**: Release planning with feature associations
- **Workstreams**: Organize work into workstreams
- **Phases**: Define project phases
- **Progress Tracking**: Visual progress indicators and task timelines

### Cost Management & Economics

- **Unified Cost Model**: Comprehensive cost tracking with:
  - Scope: Task, Module, Product, Shared
  - Category: Build, Run, Maintain, Scale, Overhead
  - Cost Type: Labor, Infrastructure, License, Vendor, Other
  - Recurrence: One-time, Monthly, Quarterly, Annual
  - Cost Classification: Run (KTLO) vs Change (Growth)
- **TCO Calculation**: Automatic TCO computation with breakdowns by:
  - Category (build, run, maintain, scale, overhead)
  - Scope (task, module, product, shared)
  - Cost type (labor, infra, license, vendor, other)
- **Resource Costs**: Link costs to resources with rate tracking
- **Revenue Models**: Multiple revenue model types (per customer, per job, tiered, subscription, usage-based, one-time, freemium, hybrid)
- **Pricing Tiers**: Pricing tier management with features, limits, and overage rules
- **Usage Metrics**: Track usage metrics (jobs, customers, API calls, storage, bandwidth, custom)
- **Scenarios**: Cost scenario comparison (e.g., Current vs Option 1 vs Rackspace)
- **Legacy Cost Items**: Support for legacy cost item model

### Resource Management

- **Resources**: Individual and organizational resources
- **Skills Tracking**: Resource skills and availability
- **Cost Rates**: Resource cost rates with period tracking

### Metrics & Outcomes

- **Metrics**: Outcome, Output, and Health metrics with targets and current values
- **Outcomes**: Track expected outcomes with achievement status
- **Status Reports**: Generate status reports with highlights, risks, and next steps

### Additional Features

- **AI Assistant**: AI-powered form filling and content generation
- **CSV Import**: Import cost data from CSV files
- **Notifications**: User notifications with priorities and read status
- **Organization Management**: Multi-organization support via Clerk
- **Theme Toggle**: Dark/light mode support
- **Product Context**: Context-aware product information

## API Endpoints

The API includes comprehensive endpoints for all features. Key endpoints include:

### Products

- `GET /api/products` - List all products
- `GET /api/products/{id}` - Get product by ID
- `GET /api/products/{id}/tco` - Get product TCO breakdown
- `POST /api/products` - Create a product
- `PUT /api/products/{id}` - Update a product
- `DELETE /api/products/{id}` - Delete a product

### Costs

- `GET /api/costs` - List all costs (optional filters: `product_id`, `scenario_id`)
- `GET /api/costs/{id}` - Get cost by ID
- `GET /api/costs/totals` - Get aggregated totals
- `POST /api/costs` - Create a cost item
- `PUT /api/costs/{id}` - Update a cost item
- `DELETE /api/costs/{id}` - Delete a cost item

### Unified Costs (New Model)

- `GET /api/unified-costs` - List unified costs
- `POST /api/unified-costs` - Create unified cost
- Full CRUD operations for the new cost model

### Other Endpoints

- **Modules**: `/api/modules`
- **Features**: `/api/features`
- **Tasks**: `/api/tasks`
- **Strategies**: `/api/strategies`
- **Problems**: `/api/problems`
- **Insights**: `/api/insights`
- **Interviews**: `/api/interviews`
- **Decisions**: `/api/decisions`
- **Releases**: `/api/releases`
- **Stakeholders**: `/api/stakeholders`
- **Metrics**: `/api/metrics`
- **Outcomes**: `/api/outcomes`
- **Roadmaps**: `/api/roadmaps`
- **Prioritization Models**: `/api/prioritization-models`
- **Priority Scores**: `/api/priority-scores`
- **Revenue Models**: `/api/revenue-models`
- **Pricing Tiers**: `/api/pricing-tiers`
- **Usage Metrics**: `/api/usage-metrics`
- **Resources**: `/api/resources`
- **Notifications**: `/api/notifications`
- **Scenarios**: `/api/scenarios`
- **CSV Import**: `/api/csv-import`

## Technology Stack

### Backend

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM with async support
- **Repository Pattern**: Database-agnostic data access layer
- **Pydantic**: Data validation and serialization

### Frontend

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Clerk**: Authentication and organization management
- **shadcn/ui**: High-quality UI components
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Data visualization library
- **Lucide React**: Icon library

## Documentation

Additional setup and configuration guides:

- `frontend/CLERK_SETUP.md` - Clerk authentication setup
- `frontend/ORGANIZATION_SETUP.md` - Organization management
- `frontend/AI_ASSISTANT_SETUP.md` - AI assistant configuration
- `frontend/SHADCN_SETUP.md` - UI component setup

## Future Enhancements

- Advanced data visualization (charts, graphs, dashboards)
- Export functionality (CSV, PDF reports)
- Advanced filtering and search across all entities
- Real-time collaboration features
- Webhook integrations
- Advanced analytics and reporting
- Mobile app support
