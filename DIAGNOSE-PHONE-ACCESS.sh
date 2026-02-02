#!/bin/bash
# Diagnostic script for phone access issues
# Run this on k3s master node

echo "========================================="
echo "vault-x Phone Access Diagnostics"
echo "========================================="
echo ""

echo "1. Checking ingress configuration..."
echo "-----------------------------------"
kubectl get ingress -n vault-x
echo ""
kubectl describe ingress vault-x -n vault-x | grep -A 20 "Rules:"
echo ""

echo "2. Checking ConfigMap ALLOWED_ORIGINS..."
echo "-----------------------------------"
kubectl get configmap budget-config -n vault-x -o yaml | grep ALLOWED_ORIGINS
echo ""

echo "3. Checking pod status..."
echo "-----------------------------------"
kubectl get pods -n vault-x -o wide
echo ""

echo "4. Checking Traefik logs for errors..."
echo "-----------------------------------"
kubectl logs -n kube-system deployment/traefik --tail=20 | grep -i error || echo "No recent errors"
echo ""

echo "5. Testing health endpoint via localhost..."
echo "-----------------------------------"
echo "Via hostname header:"
curl -k -s -H "Host: boquiren-himalayas.nord" https://localhost/health
echo ""
echo "Via IP header:"
curl -k -s -H "Host: 100.99.208.102" https://localhost/health
echo ""

echo "6. Testing without host header (catch-all)..."
echo "-----------------------------------"
curl -k -s https://localhost/health || echo "Failed without host header"
echo ""

echo "7. Checking if ingress accepts IP-based hosts..."
echo "-----------------------------------"
kubectl get ingress vault-x -n vault-x -o yaml | grep -A 5 "100.99.208.102" || echo "IP not found in ingress config"
echo ""

echo "8. Checking Traefik service..."
echo "-----------------------------------"
kubectl get svc -n kube-system traefik
echo ""

echo "========================================="
echo "Diagnostic complete"
echo "========================================="
