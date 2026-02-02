# Phone Remote Access Fix - Implementation Guide

## Status: Configuration Updated ✅

The deployment configuration has been updated to enable phone access via NordVPN meshnet IP address.

---

## What Was Changed

### 1. Updated ALLOWED_ORIGINS (k8s/deployment-prod.yaml line 14)
```yaml
# Before:
ALLOWED_ORIGINS: "https://boquiren-himalayas.nord,http://localhost:3000"

# After:
ALLOWED_ORIGINS: "https://boquiren-himalayas.nord,https://100.99.208.102,http://localhost:3000"
```

### 2. Added IP-Based Ingress Rule (k8s/deployment-prod.yaml lines 166-175)
```yaml
# Added new host entry for direct IP access:
- host: "100.99.208.102"
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: vault-x
          port:
            number: 80
```

### 3. Updated TLS Configuration (k8s/deployment-prod.yaml lines 176-180)
```yaml
tls:
- hosts:
  - boquiren-himalayas.nord
  - "100.99.208.102"  # Added IP to TLS hosts
  secretName: vault-x-tls
```

---

## Next Steps: Deploy to k3s Cluster

### SSH to k3s Master Node
```bash
ssh root@192.168.50.211
```

### Copy Updated Deployment File
From your workstation:
```bash
scp /home/otis-lab/Desktop/vault-x/k8s/deployment-prod.yaml root@192.168.50.211:/tmp/
```

### Apply Changes on k3s Master
```bash
# On k3s-master (192.168.50.211):
cd /tmp

# Apply the updated deployment
kubectl apply -f deployment-prod.yaml

# Expected output:
# namespace/vault-x unchanged
# configmap/budget-config configured  <-- CORS origins updated
# persistentvolumeclaim/budget-data unchanged
# persistentvolumeclaim/budget-backups unchanged
# deployment.apps/vault-x unchanged
# service/vault-x unchanged
# ingress.networking.k8s.io/vault-x configured  <-- IP access added
# cronjob.batch/budget-backup unchanged

# Restart the pod to pick up new ConfigMap
kubectl rollout restart deployment/vault-x -n vault-x

# Wait for the restart to complete
kubectl rollout status deployment/vault-x -n vault-x

# Expected output:
# deployment "vault-x" successfully rolled out
```

### Verify Deployment
```bash
# Check pod is running
kubectl get pods -n vault-x -o wide

# Check ingress configuration
kubectl describe ingress vault-x -n vault-x

# Test health endpoint
curl -k https://localhost/health -H "Host: 100.99.208.102"

# Expected response:
# {"status":"operational","version":"2.0.26"}
```

---

## Testing from Phone

### 1. Quick IP Access Test
On your phone browser:
```
https://100.99.208.102
```

**Expected behavior**:
1. Browser shows certificate warning (self-signed cert)
2. Accept/proceed with the certificate warning
3. vault-x web interface loads
4. Login screen appears

### 2. Hostname Access Test (After DNS Fix)
```
https://boquiren-himalayas.nord
```

**Expected behavior**: Same as above

### 3. Health Endpoint Verification
In phone browser console (if available) or via terminal app:
```bash
curl -k https://100.99.208.102/health
```

**Expected response**:
```json
{"status":"operational","version":"2.0.26"}
```

---

## Phase 2: Fix Meshnet DNS (Optional but Recommended)

### Diagnostic Commands on k3s Master

1. **Check meshnet status**:
```bash
nordvpn meshnet peer list
```

Expected output should show your phone as a peer device.

2. **Check meshnet settings**:
```bash
nordvpn settings | grep -i meshnet
hostname -f
```

3. **Test DNS resolution**:
```bash
nslookup boquiren-himalayas.nord
dig boquiren-himalayas.nord
```

### On Phone (NordVPN App)

1. Open NordVPN app → Meshnet tab
2. Verify `boquiren-himalayas` appears in peer list
3. Check if it shows as "Online"
4. If not present, add it as a peer:
   - Tap "Add peer" or similar
   - Search for `boquiren-himalayas`
   - Enable routing/access permissions

### Add Phone as Meshnet Peer (If Needed)

On k3s master:
```bash
# List current peers
nordvpn meshnet peer list

# Add phone (replace with your phone's meshnet name)
nordvpn meshnet peer allow <your-phone-meshnet-name>
nordvpn meshnet peer routing enable <your-phone-meshnet-name>

# Verify
nordvpn meshnet peer list
```

Look for:
- Status: Online
- Routing: Enabled
- Permissions: Allowed

---

## Verification Checklist

After deployment:

- [ ] SSH to k3s master successful
- [ ] Updated deployment-prod.yaml copied to k3s master
- [ ] `kubectl apply` executed successfully
- [ ] `kubectl rollout restart` completed
- [ ] Pod is running and healthy
- [ ] Phone can access `https://100.99.208.102`
- [ ] Accept self-signed certificate on phone
- [ ] Web interface loads without CORS errors
- [ ] Login works on phone
- [ ] Can create/view budget entries from phone
- [ ] (Optional) `https://boquiren-himalayas.nord` works from phone

---

## Rollback Instructions

If the changes cause issues:

### On k3s Master
```bash
# Edit ConfigMap to revert CORS origins
kubectl edit configmap budget-config -n vault-x

# Change ALLOWED_ORIGINS back to:
# "https://boquiren-himalayas.nord,http://localhost:3000"

# Edit Ingress to remove IP-based host
kubectl edit ingress vault-x -n vault-x

# Remove the entire section:
#   - host: "100.99.208.102"
#     http:
#       paths: [...]
#
# And remove "100.99.208.102" from tls.hosts

# Restart deployment
kubectl rollout restart deployment/vault-x -n vault-x
```

Or restore from original file:
```bash
# If you kept a backup
kubectl apply -f /tmp/deployment-prod.yaml.backup
kubectl rollout restart deployment/vault-x -n vault-x
```

---

## Expected Results

### Success Indicators
✅ Phone browser loads vault-x at `https://100.99.208.102`
✅ No CORS errors in browser console
✅ Health endpoint returns 200 OK with JSON
✅ Login and data operations work correctly
✅ Certificate warning is one-time (accept and continue)

### Troubleshooting

**Issue**: "Connection refused"
- Check NordVPN meshnet is active on phone
- Verify phone and k3s server are meshnet peers
- Test: `nordvpn meshnet peer list` on k3s master

**Issue**: "This site can't be reached"
- Check meshnet connection: try ping `100.99.208.102` from phone
- Verify ingress is configured: `kubectl get ingress -n vault-x`

**Issue**: "CORS error"
- Check ConfigMap was updated: `kubectl get configmap budget-config -n vault-x -o yaml`
- Verify pod restarted: `kubectl get pods -n vault-x` (check AGE)

**Issue**: Certificate error blocks access
- On iOS Safari: Tap "Show Details" → "visit this website"
- On Android Chrome: Tap "Advanced" → "Proceed to 100.99.208.102 (unsafe)"

---

## Notes

- The self-signed certificate warning is expected and safe to accept for meshnet access
- IP-based access (`https://100.99.208.102`) is the quick fix
- Hostname access (`https://boquiren-himalayas.nord`) requires proper meshnet peering
- Both methods should work after this fix is deployed
- The deployment file in this repo (`k8s/deployment-prod.yaml`) is now updated
- Remember to copy it to k3s master and apply it

---

## Documentation Updates Needed

After successful testing, update DEPLOYMENT-SUMMARY.md with:
```markdown
### Phone Access (via NordVPN Meshnet)
- **Direct IP Access**: https://100.99.208.102
- **Hostname Access**: https://boquiren-himalayas.nord
- **Requirements**:
  - NordVPN with meshnet active on phone
  - Phone and k3s server must be meshnet peers
  - Accept self-signed certificate warning
- **First Time Setup**:
  1. Open NordVPN app on phone
  2. Go to Meshnet tab
  3. Add `boquiren-himalayas` as peer
  4. Enable routing/access permissions
```
