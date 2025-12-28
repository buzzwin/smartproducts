# SmartProducts Platform

A platform for product management and tracking Total Cost of Ownership (TCO) with support for server costs, database costs, LLM costs, and SaaS products.

## Architecture

- **Backend**: FastAPI with database-agnostic repository pattern
- **Frontend**: Next.js with TypeScript
- **Database**: SQLite (default), MongoDB, PostgreSQL, MySQL supported

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

3. Configure API URL (optional, defaults to http://localhost:8000):
```bash
# Edit .env.local to set NEXT_PUBLIC_API_URL
```

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

## API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/{id}` - Get product by ID
- `POST /api/products` - Create a product
- `PUT /api/products/{id}` - Update a product
- `DELETE /api/products/{id}` - Delete a product

### Costs
- `GET /api/costs` - List all costs (optional filters: `product_id`, `scenario_id`)
- `GET /api/costs/{id}` - Get cost by ID
- `GET /api/costs/totals` - Get aggregated totals (optional filters: `product_id`, `scenario_id`)
- `POST /api/costs` - Create a cost item
- `PUT /api/costs/{id}` - Update a cost item
- `DELETE /api/costs/{id}` - Delete a cost item

### Scenarios
- `GET /api/scenarios` - List all scenarios
- `GET /api/scenarios/{id}` - Get scenario by ID
- `POST /api/scenarios` - Create a scenario

## Features

- Product-based cost organization
- Scenario comparison (e.g., Current vs Option 1 vs Rackspace)
- Category breakdown (Servers, Third Party Services, etc.)
- Extensible design for future cost types (database, LLM, SaaS)
- Database-agnostic architecture for easy database switching

## Future Enhancements

- Authentication and authorization
- Cost item CRUD operations in UI
- Advanced filtering and search
- Data visualization (charts, graphs)
- Export functionality (CSV, PDF reports)
- Support for additional cost types (database, LLM, SaaS)

