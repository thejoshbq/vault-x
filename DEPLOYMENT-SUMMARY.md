# vault-x Deployment Summary

**Date**: February 1, 2026
**Cluster**: 3-node k3s cluster (1 master + 2 workers)
**Status**: ✅ Successfully Deployed

---

## Deployment Details

### Cluster Information
- **Master Node**: k3s-master (192.168.50.211)
- **Worker 1**: k3s-worker-1 (192.168.50.252)
- **Worker 2**: k3s-worker-2 (192.168.50.202)
- **k3s Version**: v1.34.3+k3s1
- **OS**: Debian GNU/Linux 13 (trixie) on ARM64

### Application Details
- **Image**: vault-x:v1.0.0 (local, 8.2MB)
- **Image Pull Policy**: Never (local image on all 3 nodes)
- **Version**: 2.0.26
- **Namespace**: vault-x
- **Pod Location**: k3s-master (pinned via node affinity)

### Access Information
- **Meshnet Hostname**: boquiren-himalayas.nord
- **Meshnet IP**: 100.99.208.102
- **HTTPS URL**: https://boquiren-himalayas.nord
- **Health Endpoint**: https://boquiren-himalayas.nord/health
- **TLS Certificate**: Self-signed (365 days validity)

### Storage
- **Database PVC**: budget-data (1Gi, local-path)
- **Backup PVC**: budget-backups (5Gi, local-path)
- **Database Type**: SQLite
- **Database Path**: /data/budget.db
- **Backup Schedule**: Daily at 2 AM (CronJob: budget-backup)

### Resource Usage
- **Pod CPU**: 2m (limit: 500m)
- **Pod Memory**: 2Mi (limit: 128Mi)
- **Node CPU Usage**: Master 15%, Worker-1 7%, Worker-2 0%
- **Node Memory Usage**: Master 63%, Worker-1 11%, Worker-2 9%

---

## Previous Application (dave)

### Backup Information
- **Backup File**: /tmp/dave-postgres-backup-20260201.sql (9.8KB)
- **Database Type**: PostgreSQL
- **Database Name**: financial_planner
- **User**: fp_user
- **Status**: Scaled to 0 replicas (not deleted, can be restored)

The old "dave" application has been scaled down but not deleted. To restore it:
```bash
kubectl scale deployment api -n dave --replicas=1
kubectl scale deployment frontend -n dave --replicas=1
kubectl scale statefulset postgres -n dave --replicas=1
```

---

## Verification Checklist

### Local Cluster Access
- ✅ vault-x pod is running on k3s-master
- ✅ Health endpoint responds: `{"status":"operational","version":"2.0.26"}`
- ✅ Database is accessible: `/data/budget.db` (284K with WAL files)
- ✅ Ingress is configured with all 3 node IPs
- ✅ TLS certificate secret created: vault-x-tls
- ✅ JWT secret created: budget-secrets

### Remote Meshnet Access
- ✅ Meshnet hostname resolves: boquiren-himalayas.nord
- ✅ HTTPS connection succeeds with self-signed cert
- ✅ Web interface loads correctly
- ✅ API health endpoint accessible remotely

### Database and Persistence
- ✅ Database file exists: `/data/budget.db` (auto-created)
- ✅ PersistentVolumeClaims bound successfully
- ✅ Backup CronJob scheduled: 0 2 * * * (daily at 2 AM)

### Multi-Node Cluster
- ✅ Image loaded on all 3 nodes (vault-x:v1.0.0)
- ✅ Pod scheduled on master node via node affinity
- ✅ Worker nodes available for future scaling

---

## Kubernetes Resources

### Deployed Resources
```
Namespace:          vault-x
ConfigMap:          budget-config
Secret:             budget-secrets, vault-x-tls
PVCs:               budget-data (1Gi), budget-backups (5Gi)
Deployment:         vault-x (1 replica)
Service:            vault-x (ClusterIP, port 80)
Ingress:            vault-x (Traefik, HTTPS)
CronJob:            budget-backup (daily at 2 AM)
```

### Image Distribution
- **Master**: docker.io/library/vault-x:v1.0.0 (8.2 MiB)
- **Worker-1**: docker.io/library/vault-x:v1.0.0 (8.2 MiB)
- **Worker-2**: docker.io/library/vault-x:v1.0.0 (8.2 MiB)

---

## Configuration Files

### Production Manifest
- **Location**: `/home/otis-lab/Desktop/vault-x/k8s/deployment-prod.yaml`
- **On Cluster**: `/tmp/deployment-prod.yaml` (k3s-master)

### Secrets (NOT in Git)
- **JWT_SECRET**: `+flRZGiw+AROcPh9c30rKSwhdGyrkyL+QsaPRrw/oI4=`
- **TLS Cert**: `/tmp/vault-x-tls.crt`
- **TLS Key**: `/tmp/vault-x-tls.key`

---

## Accessing the Application

### From Local Workstation (via meshnet)
```bash
# Health check
curl -k https://boquiren-himalayas.nord/health

# Open in browser
# Note: Accept self-signed certificate warning
https://boquiren-himalayas.nord
```

### From Phone (via NordVPN Meshnet)

**Access URLs**:
- Direct IP: `https://100.99.208.102` (recommended for initial setup)
- Hostname: `https://boquiren-himalayas.nord` (requires proper meshnet peering)

**Requirements**:
- NordVPN with meshnet active on phone
- Phone and k3s server must be meshnet peers
- Accept self-signed certificate warning on first access

**First Time Setup**:
1. Open NordVPN app on phone
2. Navigate to Meshnet tab
3. Add `boquiren-himalayas` as a peer device
4. Enable routing and access permissions
5. Open phone browser to `https://100.99.208.102`
6. Accept the certificate warning (safe for meshnet)
7. vault-x interface should load

**Troubleshooting Phone Access**:
- If connection fails, verify meshnet peers on k3s master: `nordvpn meshnet peer list`
- Ensure phone shows as "Online" peer with routing enabled
- Try both IP (`100.99.208.102`) and hostname (`boquiren-himalayas.nord`)
- Check browser console for CORS errors (should be none)

### From k3s Cluster
```bash
# Via ingress with Host header
curl -k -H "Host: boquiren-himalayas.nord" https://localhost/health

# Direct to pod
kubectl exec -n vault-x deployment/vault-x -- wget -qO- http://localhost:3000/health
```

---

## Maintenance Commands

### View Logs
```bash
kubectl logs -n vault-x deployment/vault-x --tail=50
kubectl logs -n vault-x deployment/vault-x -f  # Follow
```

### Check Pod Status
```bash
kubectl get pods -n vault-x -o wide
kubectl describe pod -n vault-x <pod-name>
```

### Access Database
```bash
kubectl exec -n vault-x deployment/vault-x -- sqlite3 /data/budget.db "SELECT * FROM sqlite_master;"
```

### Check Backups
```bash
kubectl exec -n vault-x deployment/vault-x -- ls -lh /backups/
```

### Manual Backup
```bash
kubectl create job --from=cronjob/budget-backup manual-backup-$(date +%Y%m%d) -n vault-x
```

### Scale Down (Maintenance)
```bash
kubectl scale deployment vault-x -n vault-x --replicas=0
```

### Scale Up
```bash
kubectl scale deployment vault-x -n vault-x --replicas=1
```

### Delete Deployment
```bash
kubectl delete namespace vault-x
# Note: This will delete PVCs and all data!
```

---

## Rollback Plan

If issues occur, restore the old "dave" application:

```bash
# Scale up old application
kubectl scale deployment api -n dave --replicas=1
kubectl scale deployment frontend -n dave --replicas=1
kubectl scale statefulset postgres -n dave --replicas=1

# Wait for pods to be ready
kubectl get pods -n dave -w

# Scale down vault-x
kubectl scale deployment vault-x -n vault-x --replicas=0
```

---

## Future Improvements

### Migrate to Distributed Database
To enable multi-replica scaling:
1. Deploy PostgreSQL or MySQL with ReadWriteMany storage
2. Update vault-x to use PostgreSQL instead of SQLite
3. Remove node affinity constraint
4. Scale to 3 replicas across all nodes

### Add Monitoring
```bash
# Deploy Prometheus
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Deploy Grafana
# Add ServiceMonitor for vault-x metrics
```

### Setup Let's Encrypt
If publicly accessible DNS is configured:
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
# Update Ingress to use cert-manager
```

---

## Troubleshooting

### Pod Not Starting
```bash
kubectl describe pod -n vault-x <pod-name>
kubectl logs -n vault-x <pod-name>
kubectl get events -n vault-x --sort-by='.lastTimestamp'
```

### Image Not Found
```bash
# Verify image on node
ssh root@<node-ip> 'k3s ctr images ls | grep vault-x'

# Re-import if missing
ssh root@<node-ip> 'k3s ctr images import /tmp/vault-x-v1.0.0.tar'
```

### Ingress Not Working
```bash
# Check Traefik
kubectl get pods -n kube-system | grep traefik
kubectl logs -n kube-system deployment/traefik

# Verify ingress
kubectl describe ingress -n vault-x vault-x
```

### Database Corruption
```bash
# Restore from backup
kubectl exec -n vault-x deployment/vault-x -- sqlite3 /data/budget.db ".restore /backups/budget-<timestamp>.db"
```

---

## Contact Information

**Deployed By**: Claude Code (Anthropic)
**Deployment Time**: ~30 minutes
**Issues**: https://github.com/anthropics/claude-code/issues

**NordVPN Meshnet**: boquiren@proton.me
**VPN Service**: Active until July 10, 2027
