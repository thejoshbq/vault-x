# Budget System - Testing Guide

## Current Status

✅ **Application is built and running!**

- Backend API: Running on port 3000
- Database: SQLite database created at `./data/budget.db`
- Frontend: Built and served from `./web/dist`
- All API endpoints are functional

## Quick Start

### Start the Application

```bash
./start.sh
```

Then open your browser to: **http://localhost:3000**

### Stop the Application

```bash
./stop.sh
```

## Testing the Application

### 1. Register a New User

1. Open http://localhost:3000 in your browser
2. Click on the "Register" tab
3. Enter:
   - Name: Your name
   - Email: your@email.com
   - Password: At least 8 characters
4. Click "Initialize Account"

### 2. Explore the Features

After logging in, you can:

- **Dashboard**: View financial overview with Sankey diagram
- **Cash Flow**: Interactive money flow visualization
- **Budgets**: Track spending against budget limits
- **Goals**: Set and monitor savings goals
- **Profiles**: Switch between family member profiles

### 3. API Testing (Optional)

You can also test the API directly using curl:

```bash
# Health check
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Database Access

The SQLite database is located at: `./data/budget.db`

To view/edit the database, you can:

1. Install sqlite3: `sudo apt-get install sqlite3`
2. Access the database: `sqlite3 ./data/budget.db`
3. List tables: `.tables`
4. Query data: `SELECT * FROM users;`

### Database Schema

Tables created:
- `users` - User accounts
- `profiles` - User profiles (family members)
- `nodes` - Sankey diagram nodes (income, accounts, expenses)
- `flows` - Money flows between nodes
- `budgets` - Budget categories
- `transactions` - Individual transactions
- `goals` - Savings goals
- `expenses` - Fixed costs and subscriptions
- `refresh_tokens` - JWT refresh tokens

## Development Mode

For development with hot reload:

### Backend (Terminal 1)
```bash
export DATABASE_PATH=./data/budget.db
export JWT_SECRET=dev-secret-key
export ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
go run ./cmd/server/main.go
```

### Frontend (Terminal 2)
```bash
cd web
npm run dev
```

Then access the app at: http://localhost:5173

## Deployment to k3s

When you're ready to deploy to your Raspberry Pi cluster:

### 1. Build ARM64 Image

```bash
# Build for ARM64 (Raspberry Pi)
docker buildx build --platform linux/arm64 -t budget-system:arm64 -f Dockerfile .

# Or use the original Dockerfile which already targets ARM64
docker build -t budget-system:latest .
```

### 2. Tag and Push (if using a registry)

```bash
# Tag for your registry
docker tag budget-system:latest your-registry/budget-system:latest

# Push to registry
docker push your-registry/budget-system:latest
```

### 3. Deploy to k3s

```bash
# Apply all k8s resources
kubectl apply -f ../src/deployment.yaml

# Or use the k8s directory
kubectl apply -f k8s/

# Check status
kubectl get pods -n budget-system
kubectl logs -n budget-system deployment/budget-system
```

## Backup & Restore

### Manual Backup

```bash
# Create a backup
cp ./data/budget.db ./backups/budget-$(date +%Y%m%d-%H%M%S).db

# Keep last 30 backups
ls -t ./backups/budget-*.db | tail -n +31 | xargs -r rm
```

### Automated Backups (k8s)

The k8s deployment includes a CronJob that automatically backs up the database daily at 2 AM.

## Troubleshooting

### Port 3000 already in use

```bash
# Find the process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Database locked

```bash
# Check for processes using the database
lsof ./data/budget.db

# Close all connections and restart
./stop.sh && ./start.sh
```

### Permission denied errors

```bash
# Fix data directory permissions
chmod -R 755 data backups
```

## Resource Monitoring

The application is designed to be lightweight:

- **Memory**: ~15-30 MB (Go binary)
- **CPU**: Minimal when idle, <10% during normal use
- **Disk**: <1 GB including database and backups
- **Network**: Minimal, local-only communication

## Next Steps

1. ✅ Test the application locally
2. ✅ Verify all features work as expected
3. Build and test Docker image
4. Deploy to your k3s cluster
5. Set up automated backups
6. Configure TLS/SSL for production
7. Set strong JWT_SECRET in production

## Support

For issues or questions:
- Check logs: `./bin/budget-system` output
- Review database: `sqlite3 ./data/budget.db`
- Check the ARCHITECTURE.md for system design
- Review README.md for full documentation
