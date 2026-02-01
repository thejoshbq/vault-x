#!/bin/bash

echo "Stopping Budget System..."

if [ -f .pid ]; then
    PID=$(cat .pid)
    kill $PID 2>/dev/null
    rm .pid
    echo "✅ Budget System stopped (PID: $PID)"
else
    # Try to find and kill the process
    pkill -f budget-system
    echo "✅ Budget System stopped"
fi
