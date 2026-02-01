# Budget System

A lightweight, containerized personal finance application designed for resource-constrained environments (Raspberry Pi k3s cluster).

## Tech Stack

- **Backend**: Go (Fiber framework) + SQLite
- **Frontend**: React + Vite + Tailwind CSS
- **Container**: Docker / k3s (Kubernetes)

## Features

- 💰 Cash Flow Visualization (Sankey Diagram)
- 📊 Budget Tracking
- 🎯 Savings Goals
- 👥 Multiple Profiles (Family Support)
- 🔒 JWT Authentication
- 📱 Responsive Design

## Quick Start (Local Development)

### Prerequisites

- Go 1.21+
- Node.js 18+
- Make (optional, for convenience commands)

### Option 1: Development Mode (Recommended for testing)

```bash
# Install dependencies
make install-deps
make install-frontend

# Terminal 1: Start backend
make dev-backend

# Terminal 2: Start frontend (in another terminal)
make dev-frontend
```

Frontend will be available at http://localhost:5173
Backend API at http://localhost:3000

### Option 2: Production Build (Local)

```bash
# Build everything
make build

# Run the compiled binary
./bin/budget-system
```

Application will be available at http://localhost:3000

### Option 3: Docker

```bash
# Build and run with Docker Compose
make docker-build
make docker-up

# View logs
make docker-logs

# Stop
make docker-down
```

Application will be available at http://localhost:3000

## Project Structure

```
budget-system/
├── cmd/server/          # Application entry point
├── internal/
│   ├── config/         # Configuration management
│   ├── database/       # SQLite setup and migrations
│   ├── handlers/       # HTTP handlers
│   ├── middleware/     # JWT auth, CORS
│   └── models/         # Data models
├── web/                # React frontend
│   ├── src/
│   │   ├── App.jsx    # Main React component
│   │   └── main.jsx   # Entry point
│   └── package.json
├── k8s/                # Kubernetes manifests
├── Dockerfile
├── docker-compose.yml
└── Makefile
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_PATH=./data/budget.db
JWT_SECRET=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=3000
```

## Database

The application uses SQLite with the following tables:
- users
- profiles
- nodes (Sankey diagram nodes)
- flows (money flows between nodes)
- budgets
- transactions
- goals
- expenses
- refresh_tokens

Database is automatically created and migrated on first run.

## Kubernetes Deployment

For deployment to your Raspberry Pi k3s cluster:

```bash
# Apply all k8s resources
kubectl apply -f k8s/

# Or use the deployment.yaml from src/
kubectl apply -f ../src/deployment.yaml
```

## Make Commands

```bash
make help              # Show all available commands
make install-deps      # Install Go dependencies
make install-frontend  # Install npm dependencies
make build            # Build production binary
make run              # Run locally
make dev-backend      # Run backend in dev mode
make dev-frontend     # Run frontend in dev mode
make docker-build     # Build Docker image
make docker-up        # Start with Docker Compose
make clean           # Clean build artifacts
make reset-db        # Delete database (WARNING: destroys data)
```

## Testing

After starting the application:

1. Navigate to http://localhost:5173 (dev) or http://localhost:3000 (prod)
2. Register a new account
3. Create profiles for family members
4. Add income sources, accounts, and expenses
5. Set up budgets and track spending
6. Create savings goals

## Resource Usage

Designed for Raspberry Pi:
- Memory: ~32-64 MB
- CPU: 50-200m (0.05-0.2 cores)
- Storage: ~1 GB (includes database and backups)

## Backup

Database backups can be automated:

```bash
# Manual backup
sqlite3 data/budget.db ".backup backups/budget-$(date +%Y%m%d).db"
```

For k8s deployment, a CronJob is included in the deployment manifest.

## Security

- Passwords hashed with bcrypt (cost 12)
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- HTTPS termination at k3s ingress (Traefik)
- Input validation on all endpoints

## License

MIT
