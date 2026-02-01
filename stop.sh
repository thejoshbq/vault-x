#!/bin/bash

echo "Stopping Budget System..."

if [ -f .pid ]; then
    PID=$(cat .pid)
    kill $PID 2>/dev/null
    rm .pid
    echo "✅ Budget System stopped (PID: $PID)"
else
    # Try to find and kill the process
    pkill -f vault-x
    echo "✅ Budget System stopped"
fi
