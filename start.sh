#!/bin/bash

echo "Starting Budget System..."

# Set environment variables
export DATABASE_PATH=./data/budget.db
export JWT_SECRET=dev-secret-key-change-in-production
export ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
export PORT=3000

# Start the application
./bin/vault-x &

# Save PID
echo $! > .pid

sleep 2

# Check if it's running
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Budget System is running!"
    echo ""
    echo "   🌐 Open in your browser: http://localhost:3000"
    echo ""
    echo "   To stop: ./stop.sh"
    echo "   To view logs: tail -f logs/budget.log (if logging is enabled)"
    echo ""
else
    echo "❌ Failed to start Budget System"
    exit 1
fi
