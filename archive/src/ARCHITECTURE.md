# Budget System Architecture

## Overview

A lightweight, containerized personal finance application designed for resource-constrained environments (Raspberry Pi k3s cluster).

## Stack Selection

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Backend API | **Go (Fiber)** | Low memory footprint (~10-20MB), fast startup, single binary deployment |
| Database | **SQLite** | Zero-config, file-based, perfect for single-family use, easy backups |
| Cache (optional) | **Redis** | Session management, can be skipped initially |
| Frontend | **React (Vite)** | Static build, served via Go or nginx |
| Auth | **JWT + bcrypt** | Stateless, no session store needed |
| Container Runtime | **k3s** | Lightweight Kubernetes for Pi clusters |

### Why Go over Node.js/Python?
- **Memory**: Go binary ~15MB RAM vs Node.js ~50-100MB
- **Startup**: <100ms cold start
- **ARM64 native**: Compiles directly to Pi's architecture
- **Single binary**: No runtime dependencies

### Why SQLite over PostgreSQL?
- **Memory**: ~1MB vs ~100MB+ for Postgres
- **Simplicity**: No separate container needed
- **Performance**: For single-family use, SQLite handles thousands of transactions/sec
- **Backup**: Just copy a file
- **Upgrade path**: Can migrate to Postgres later if needed

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐
│     users       │     │    profiles     │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │────<│ id (PK)         │
│ email           │     │ user_id (FK)    │
│ password_hash   │     │ name            │
│ created_at      │     │ avatar_color    │
│ updated_at      │     │ is_owner        │
└─────────────────┘     │ created_at      │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     nodes       │     │    budgets      │     │     goals       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ profile_id (FK) │     │ profile_id (FK) │     │ profile_id (FK) │
│ type            │     │ name            │     │ name            │
│ label           │     │ budgeted        │     │ target          │
│ institution     │     │ period          │     │ current         │
│ amount          │     │ created_at      │     │ deadline        │
│ balance         │     └────────┬────────┘     │ priority        │
│ apy             │              │              │ created_at      │
│ metadata (JSON) │              ▼              └─────────────────┘
│ created_at      │     ┌─────────────────┐
└────────┬────────┘     │  transactions   │
         │              ├─────────────────┤
         ▼              │ id (PK)         │
┌─────────────────┐     │ budget_id (FK)  │
│     flows       │     │ amount          │
├─────────────────┤     │ note            │
│ id (PK)         │     │ date            │
│ profile_id (FK) │     │ created_at      │
│ from_node (FK)  │     └─────────────────┘
│ to_node (FK)    │
│ amount          │
│ label           │
│ created_at      │
└─────────────────┘
```

## API Endpoints

### Authentication
```
POST   /api/auth/register     Create account
POST   /api/auth/login        Get JWT token
POST   /api/auth/refresh      Refresh token
DELETE /api/auth/logout       Invalidate token
```

### Profiles
```
GET    /api/profiles          List profiles for user
POST   /api/profiles          Create profile
GET    /api/profiles/:id      Get profile details
PUT    /api/profiles/:id      Update profile
DELETE /api/profiles/:id      Delete profile
```

### Nodes (Sankey)
```
GET    /api/profiles/:id/nodes          List all nodes
POST   /api/profiles/:id/nodes          Create node
PUT    /api/profiles/:id/nodes/:nodeId  Update node
DELETE /api/profiles/:id/nodes/:nodeId  Delete node
```

### Flows (Sankey)
```
GET    /api/profiles/:id/flows          List all flows
POST   /api/profiles/:id/flows          Create flow
PUT    /api/profiles/:id/flows/:flowId  Update flow
DELETE /api/profiles/:id/flows/:flowId  Delete flow
```

### Budgets & Transactions
```
GET    /api/profiles/:id/budgets                      List budgets
POST   /api/profiles/:id/budgets                      Create budget
PUT    /api/profiles/:id/budgets/:budgetId            Update budget
DELETE /api/profiles/:id/budgets/:budgetId            Delete budget
GET    /api/profiles/:id/budgets/:budgetId/transactions   List transactions
POST   /api/profiles/:id/budgets/:budgetId/transactions   Add transaction
DELETE /api/profiles/:id/budgets/:budgetId/transactions/:txId  Delete transaction
```

### Goals
```
GET    /api/profiles/:id/goals          List goals
POST   /api/profiles/:id/goals          Create goal
PUT    /api/profiles/:id/goals/:goalId  Update goal
DELETE /api/profiles/:id/goals/:goalId  Delete goal
```

### Dashboard / Aggregations
```
GET    /api/profiles/:id/dashboard      Get computed dashboard data
GET    /api/profiles/:id/forecast       Get expense forecast
```

## Kubernetes Deployment

```yaml
# Single pod deployment for Pi
apiVersion: apps/v1
kind: Deployment
metadata:
  name: budget-system
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: budget-api
        image: budget-system:latest
        resources:
          limits:
            memory: "64Mi"
            cpu: "200m"
          requests:
            memory: "32Mi"
            cpu: "100m"
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: budget-pvc
```

## Directory Structure

```
budget-system/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── config/
│   │   └── config.go         # Environment config
│   ├── database/
│   │   ├── database.go       # SQLite connection
│   │   └── migrations.go     # Schema migrations
│   ├── handlers/
│   │   ├── auth.go
│   │   ├── profiles.go
│   │   ├── nodes.go
│   │   ├── flows.go
│   │   ├── budgets.go
│   │   └── goals.go
│   ├── middleware/
│   │   ├── auth.go           # JWT validation
│   │   └── cors.go
│   ├── models/
│   │   └── models.go         # Struct definitions
│   └── services/
│       ├── auth.go           # Auth business logic
│       └── finance.go        # Calculations
├── web/                      # React frontend (built)
├── Dockerfile
├── docker-compose.yml
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── pvc.yaml
└── go.mod
```

## Security Considerations

1. **JWT tokens**: Short-lived (15min) with refresh tokens (7 days)
2. **Password hashing**: bcrypt with cost factor 12
3. **HTTPS**: Terminate TLS at ingress (Traefik in k3s)
4. **Input validation**: All inputs sanitized
5. **Rate limiting**: 100 req/min per IP
6. **SQLite**: File permissions 600, owned by app user

## Backup Strategy

```bash
# Daily backup cron job
0 2 * * * sqlite3 /data/budget.db ".backup /backups/budget-$(date +%Y%m%d).db"

# Keep last 30 days
find /backups -name "budget-*.db" -mtime +30 -delete
```

## Future Enhancements

- [ ] Family sharing with permission levels (viewer/editor/admin)
- [ ] Bank sync via Plaid (requires subscription)
- [ ] Mobile app (React Native or Flutter)
- [ ] Export to CSV/PDF
- [ ] Recurring transaction automation
- [ ] Budget alerts/notifications
