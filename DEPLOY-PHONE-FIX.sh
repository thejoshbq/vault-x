#!/bin/bash
# Deploy Phone Access Fix to k3s Cluster
# Run this script on k3s master node (192.168.50.211)

set -e

echo "========================================="
echo "vault-x Phone Access Fix Deployment"
echo "========================================="
echo ""

# Check if running on k3s master
if ! command -v kubectl &> /dev/null; then
    echo "❌ Error: kubectl not found. Are you on the k3s master node?"
    exit 1
fi

# Check if deployment file exists
if [ ! -f "deployment-prod.yaml" ]; then
    echo "❌ Error: deployment-prod.yaml not found in current directory"
    echo "Please copy the file from the vault-x repo first:"
    echo "  scp /home/otis-lab/Desktop/vault-x/k8s/deployment-prod.yaml root@192.168.50.211:/tmp/"
    exit 1
fi

echo "Step 1: Backing up current deployment..."
kubectl get configmap budget-config -n vault-x -o yaml > /tmp/budget-config-backup-$(date +%Y%m%d-%H%M%S).yaml
kubectl get ingress vault-x -n vault-x -o yaml > /tmp/vault-x-ingress-backup-$(date +%Y%m%d-%H%M%S).yaml
echo "✅ Backup created in /tmp/"
echo ""

echo "Step 2: Applying updated deployment..."
kubectl apply -f deployment-prod.yaml
echo "✅ Deployment applied"
echo ""

echo "Step 3: Restarting vault-x pod..."
kubectl rollout restart deployment/vault-x -n vault-x
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/vault-x -n vault-x --timeout=120s
echo "✅ Pod restarted successfully"
echo ""

echo "Step 4: Verifying deployment..."
echo ""

echo "Pod status:"
kubectl get pods -n vault-x -o wide
echo ""

echo "ConfigMap ALLOWED_ORIGINS:"
kubectl get configmap budget-config -n vault-x -o jsonpath='{.data.ALLOWED_ORIGINS}'
echo ""
echo ""

echo "Ingress hosts:"
kubectl get ingress vault-x -n vault-x -o jsonpath='{.spec.rules[*].host}'
echo ""
echo ""

echo "Step 5: Testing health endpoint..."
sleep 5  # Give pod time to fully start

# Test via hostname
echo "Testing via hostname (boquiren-himalayas.nord):"
if curl -k -s -H "Host: boquiren-himalayas.nord" https://localhost/health | grep -q "operational"; then
    echo "✅ Hostname access working"
else
    echo "⚠️  Hostname access test inconclusive"
fi
echo ""

# Test via IP
echo "Testing via IP (100.99.208.102):"
if curl -k -s -H "Host: 100.99.208.102" https://localhost/health | grep -q "operational"; then
    echo "✅ IP access working"
else
    echo "⚠️  IP access test inconclusive"
fi
echo ""

echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. On your phone, open NordVPN app"
echo "2. Go to Meshnet tab"
echo "3. Verify 'boquiren-himalayas' is in peer list"
echo "4. Open browser to: https://100.99.208.102"
echo "5. Accept certificate warning"
echo "6. vault-x should load!"
echo ""
echo "Troubleshooting:"
echo "  - Check meshnet peers: nordvpn meshnet peer list"
echo "  - View pod logs: kubectl logs -n vault-x deployment/vault-x --tail=50"
echo "  - Check ingress: kubectl describe ingress vault-x -n vault-x"
echo ""
echo "To rollback, restore from backups in /tmp/"
echo ""
