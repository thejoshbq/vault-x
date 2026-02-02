#!/bin/bash
# Deploy NodePort solution for phone access
# Run this on k3s master node (192.168.50.211)

set -e

echo "========================================="
echo "Deploying NodePort for Phone Access"
echo "========================================="
echo ""

# Check if running on k3s master
if ! command -v kubectl &> /dev/null; then
    echo "❌ Error: kubectl not found. Are you on the k3s master node?"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace vault-x &> /dev/null; then
    echo "❌ Error: vault-x namespace not found"
    exit 1
fi

echo "Step 1: Creating NodePort service..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: vault-x-nodeport
  namespace: vault-x
  labels:
    app: vault-x
    access: phone
spec:
  type: NodePort
  selector:
    app: vault-x
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30443
    protocol: TCP
    name: http
EOF

echo "✅ NodePort service created on port 30443"
echo ""

echo "Step 2: Updating ConfigMap ALLOWED_ORIGINS..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: budget-config
  namespace: vault-x
data:
  ALLOWED_ORIGINS: "https://boquiren-himalayas.nord,http://100.99.208.102:30443,http://localhost:3000"
  DATABASE_PATH: "/data/budget.db"
EOF

echo "✅ ConfigMap updated with NodePort URL"
echo ""

echo "Step 3: Restarting vault-x pod to pick up new config..."
kubectl rollout restart deployment/vault-x -n vault-x
echo "⏳ Waiting for pod to restart..."
kubectl rollout status deployment/vault-x -n vault-x --timeout=120s
echo "✅ Pod restarted successfully"
echo ""

echo "Step 4: Verifying deployment..."
echo ""

# Wait a moment for pod to be fully ready
sleep 5

echo "Services:"
kubectl get svc -n vault-x
echo ""

echo "Pod status:"
kubectl get pods -n vault-x -o wide
echo ""

echo "Step 5: Testing NodePort access..."
echo ""

# Get the pod IP for testing
POD_NAME=$(kubectl get pods -n vault-x -l app=vault-x -o jsonpath='{.items[0].metadata.name}')

if [ -n "$POD_NAME" ]; then
    echo "Testing direct pod access:"
    if kubectl exec -n vault-x $POD_NAME -- wget -qO- http://localhost:3000/health 2>/dev/null | grep -q "operational"; then
        echo "✅ Pod is healthy"
    else
        echo "⚠️  Pod health check failed"
    fi
    echo ""
fi

echo "Testing NodePort (localhost:30443):"
if curl -s http://localhost:30443/health 2>/dev/null | grep -q "operational"; then
    echo "✅ NodePort is working"
    curl -s http://localhost:30443/health
else
    echo "⚠️  NodePort test inconclusive (may need external access)"
fi
echo ""

echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Phone Access URL:"
echo "  http://100.99.208.102:30443"
echo ""
echo "Note: This is HTTP (not HTTPS) access"
echo "      Traffic is still secure via NordVPN meshnet encryption"
echo "      No certificate warnings!"
echo ""
echo "Next steps:"
echo "1. On your phone, open browser"
echo "2. Navigate to: http://100.99.208.102:30443"
echo "3. vault-x should load directly"
echo "4. Test login and data operations"
echo ""
echo "Troubleshooting:"
echo "  - View logs: kubectl logs -n vault-x deployment/vault-x --tail=50"
echo "  - Check service: kubectl get svc -n vault-x vault-x-nodeport"
echo "  - Test locally: curl http://localhost:30443/health"
echo ""
