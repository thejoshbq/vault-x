# NodePort Phone Access - Deployment Guide

## Overview

This solution bypasses the Traefik ingress TLS/IP issues by exposing vault-x directly via NodePort on port 30443.

**Access URL**: `http://100.99.208.102:30443`

**Benefits**:
- ✅ No certificate warnings (HTTP instead of HTTPS)
- ✅ No Traefik routing issues
- ✅ Traffic still encrypted by NordVPN meshnet
- ✅ Simpler configuration
- ✅ Direct access to the application

---

## Deployment Steps

### Option A: Automated Deployment (Recommended)

```bash
# 1. Copy the deployment script to k3s master
scp deploy-nodeport.sh root@192.168.50.211:/tmp/

# 2. SSH to k3s master
ssh root@192.168.50.211

# 3. Run the deployment script
cd /tmp
chmod +x deploy-nodeport.sh
./deploy-nodeport.sh
```

The script will:
1. Create the NodePort service on port 30443
2. Update ALLOWED_ORIGINS in ConfigMap
3. Restart the vault-x pod
4. Verify the deployment
5. Test the NodePort access

---

### Option B: Manual Deployment

```bash
# SSH to k3s master
ssh root@192.168.50.211

# 1. Create NodePort service
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

# 2. Update ConfigMap
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

# 3. Restart pod to pick up new config
kubectl rollout restart deployment/vault-x -n vault-x

# 4. Wait for restart to complete
kubectl rollout status deployment/vault-x -n vault-x

# 5. Verify services
kubectl get svc -n vault-x

# 6. Test NodePort
curl http://localhost:30443/health
```

---

## Verification

### On k3s Master

```bash
# Check services
kubectl get svc -n vault-x

# Expected output:
# NAME                TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
# vault-x             ClusterIP   10.43.xxx.xxx   <none>        80/TCP           Xd
# vault-x-nodeport    NodePort    10.43.xxx.xxx   <none>        3000:30443/TCP   Xs

# Check pod
kubectl get pods -n vault-x

# Test health endpoint
curl http://localhost:30443/health

# Expected response:
# {"status":"operational","version":"2.0.26"}

# Check ConfigMap
kubectl get configmap budget-config -n vault-x -o yaml | grep ALLOWED_ORIGINS

# Expected:
# ALLOWED_ORIGINS: "https://boquiren-himalayas.nord,http://100.99.208.102:30443,http://localhost:3000"
```

### From Phone

1. **Open browser on phone**
2. **Navigate to**: `http://100.99.208.102:30443`
3. **Expected**: vault-x interface loads immediately (no certificate warning!)
4. **Test login** and data operations

---

## Testing Checklist

After deployment:

- [ ] NodePort service created and visible: `kubectl get svc -n vault-x vault-x-nodeport`
- [ ] ConfigMap updated with NodePort URL
- [ ] Pod restarted successfully
- [ ] Health endpoint responds on NodePort: `curl http://localhost:30443/health`
- [ ] Phone can access: `http://100.99.208.102:30443`
- [ ] Web interface loads without errors
- [ ] No CORS errors in browser console
- [ ] Login works
- [ ] Can create/view budget entries
- [ ] No certificate warnings (HTTP access)

---

## Troubleshooting

### Service not accessible from phone

**Check NodePort service**:
```bash
kubectl get svc -n vault-x vault-x-nodeport -o wide
kubectl describe svc vault-x-nodeport -n vault-x
```

**Verify pod selector matches**:
```bash
kubectl get pods -n vault-x --show-labels
```

**Test from k3s master**:
```bash
curl http://localhost:30443/health
curl http://192.168.50.211:30443/health
```

### CORS errors

**Check ALLOWED_ORIGINS**:
```bash
kubectl get configmap budget-config -n vault-x -o yaml | grep ALLOWED_ORIGINS
```

Should contain: `http://100.99.208.102:30443`

**Verify pod picked up new config**:
```bash
# Check pod age (should be recent after restart)
kubectl get pods -n vault-x

# Check pod environment
kubectl exec -n vault-x deployment/vault-x -- env | grep ALLOWED_ORIGINS
```

### Pod not starting

**Check pod status**:
```bash
kubectl describe pod -n vault-x <pod-name>
kubectl logs -n vault-x <pod-name>
```

**Check events**:
```bash
kubectl get events -n vault-x --sort-by='.lastTimestamp' | tail -20
```

### Port 30443 already in use

If port 30443 is already taken, use a different port:

```bash
# Delete existing service
kubectl delete svc vault-x-nodeport -n vault-x

# Create with different port (e.g., 30444)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: vault-x-nodeport
  namespace: vault-x
spec:
  type: NodePort
  selector:
    app: vault-x
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30444
    protocol: TCP
EOF

# Update ConfigMap accordingly
kubectl edit configmap budget-config -n vault-x
# Change: http://100.99.208.102:30444

# Restart pod
kubectl rollout restart deployment/vault-x -n vault-x
```

Then access via: `http://100.99.208.102:30444`

---

## Security Notes

### Why HTTP is Safe Here

1. **NordVPN Meshnet encrypts all traffic** between devices
2. **Direct peer-to-peer connection** - traffic doesn't go through internet
3. **Meshnet IP (100.99.208.102)** is only accessible within your meshnet
4. **No public exposure** - port 30443 is only accessible via meshnet

This is similar to accessing `http://localhost` - the traffic is secure because it never leaves the encrypted tunnel.

### Additional Security (Optional)

If you want HTTPS on NodePort:

1. **Generate cert for IP**:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /tmp/nodeport.key -out /tmp/nodeport.crt \
  -subj "/CN=100.99.208.102" \
  -addext "subjectAltName=IP:100.99.208.102"
```

2. **Configure app to use TLS** (requires app code changes)

**Note**: This adds complexity without significant security benefit given meshnet encryption.

---

## Rollback

To remove NodePort and revert to ingress-only:

```bash
# Delete NodePort service
kubectl delete svc vault-x-nodeport -n vault-x

# Revert ConfigMap
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: budget-config
  namespace: vault-x
data:
  ALLOWED_ORIGINS: "https://boquiren-himalayas.nord,http://localhost:3000"
  DATABASE_PATH: "/data/budget.db"
EOF

# Restart pod
kubectl rollout restart deployment/vault-x -n vault-x
```

---

## Performance Notes

**NodePort vs Ingress**:
- ✅ NodePort: Direct connection, lower latency
- ✅ NodePort: No TLS overhead for meshnet traffic
- ✅ NodePort: Simpler routing path
- ⚠️ NodePort: Uses non-standard port (30443)
- ℹ️ Ingress: Standard HTTPS port (443) but has TLS/routing overhead

For meshnet access, NodePort is actually **better** than ingress.

---

## Next Steps

After successful deployment:

1. **Bookmark on phone**: `http://100.99.208.102:30443`
2. **Test all features**: Login, budget creation, editing, deletion
3. **Verify data persistence**: Create entry, close browser, reopen, verify entry exists
4. **Update documentation**: Add NodePort access to DEPLOYMENT-SUMMARY.md
5. **Share with team**: Document the NodePort URL for other meshnet users

---

## Alternative: Keep Both Access Methods

You can keep both NodePort (for phone) and Ingress (for hostname) running:

- **Hostname access** (desktop/laptop): `https://boquiren-himalayas.nord`
- **NodePort access** (phone): `http://100.99.208.102:30443`

Both methods work simultaneously and access the same vault-x instance.

---

## Summary

**Before**: Phone → HTTPS → Traefik Ingress → vault-x ❌ (TLS/IP routing issues)

**After**: Phone → HTTP → NodePort → vault-x ✅ (Direct, simple, encrypted by meshnet)

**Access URL**: `http://100.99.208.102:30443`
