# Redis Setup for Railway - ROSIE Middleware

**Date**: February 5, 2026
**Status**: ✅ **Code Ready** | ⏳ **Redis Service Needed**

---

## 🔍 Problem Summary

Phase 5 implementation added Redis-dependent features (BullMQ job queue, caching) but Railway deployment didn't have a Redis service, causing:
- ❌ `ECONNREFUSED 127.0.0.1:6379` errors on startup
- ❌ Manual repository rescanning failing
- ❌ Async scanning not available

## ✅ Immediate Fix Applied

Made Redis **optional** with graceful degradation:

### Without Redis (Current State)
- ✅ App starts successfully
- ✅ Scans work synchronously (original behavior)
- ✅ Cache falls back to in-memory (100 items, 5min TTL)
- ⚠️ No async scanning via BullMQ
- ⚠️ No WebSocket progress updates
- ⚠️ In-memory cache doesn't persist across restarts

### With Redis (After Setup)
- ✅ Async scanning via BullMQ
- ✅ WebSocket real-time progress updates
- ✅ Persistent Redis caching (better performance)
- ✅ Horizontal scalability (multiple backend instances)

---

## 🚀 How to Add Redis to Railway

### Step 1: Add Redis Service

**Via Railway Dashboard:**
1. Open your Railway project: https://railway.app/project/94f56819-fcae-4a50-966d-801fefdc3d15
2. Click **"New Service"** → **"Database"** → **"Add Redis"**
3. Railway will provision a Redis instance and auto-generate connection details

**Via Railway CLI:**
```bash
railway add redis
```

### Step 2: Link Redis to Backend Service

Railway automatically creates these environment variables in the Redis service:
- `REDIS_URL` - Full connection string (e.g., `redis://:password@host:port`)
- `REDIS_PRIVATE_URL` - Internal network URL (preferred for lower latency)

**Link to Backend:**
1. Go to **rosie-backend** service → **Variables** tab
2. Add Reference Variable:
   ```
   REDIS_URL = ${{Redis.REDIS_PRIVATE_URL}}
   ```
   (or use `${{Redis.REDIS_URL}}` for public URL)

**Alternative: Manual Configuration** (if needed):
```bash
REDIS_HOST=${{Redis.RAILWAY_PRIVATE_DOMAIN}}
REDIS_PORT=6379
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

### Step 3: Verify Connection

After Redis is added and linked:

1. **Check Deployment Logs:**
   ```
   ✅ Redis configured via REDIS_URL - BullMQ queue enabled for async scanning
   ✅ Connecting to Redis via REDIS_URL for caching
   ```

2. **Test Scanning:**
   - Trigger a repository scan via UI or API
   - Should see: `"message": "Scan queued successfully (async mode)"`
   - Check logs for BullMQ job processing

3. **Test Cache:**
   - Query `/api/v1/repositories/:id/artifacts/system-context` twice
   - Second request should be <10ms (cache hit)

---

## 📊 Expected Behavior After Redis Setup

### Console Logs (With Redis)
```
✅ Redis configured via REDIS_URL - BullMQ queue enabled for async scanning
✅ Connecting to Redis via REDIS_URL for caching
[BullMQ] Worker started for queue scanner
[WebSocket] Gateway initialized
```

### Console Logs (Without Redis - Current)
```
⚠️  Redis not configured (REDIS_URL or REDIS_HOST not set) - BullMQ queue disabled. Scans will run synchronously.
   To enable async scanning with BullMQ, set REDIS_URL environment variable.
⚠️  Redis not configured (REDIS_URL or REDIS_HOST not set) - using in-memory cache
   For production, set REDIS_URL environment variable
```

### API Response Changes

**Scan Trigger (Before Redis):**
```json
{
  "scanId": "uuid-123",
  "status": "in_progress",
  "message": "Scan started successfully (synchronous mode)"
}
```

**Scan Trigger (After Redis):**
```json
{
  "scanId": "uuid-123",
  "jobId": "uuid-123",
  "status": "queued",
  "message": "Scan queued successfully (async mode)"
}
```

---

## 🔧 Redis Configuration Details

### Supported Environment Variable Formats

**Format 1: REDIS_URL (Recommended for Railway)**
```bash
REDIS_URL=redis://[:password@]host:port[/db]
```

**Format 2: Individual Variables (Legacy)**
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret
```

### Code Automatically Detects Format
```typescript
// QueueModule and AppCacheModule both check:
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;

if (!redisUrl && !redisHost) {
  // Fall back to sync mode / in-memory cache
}
```

---

## 📈 Performance Impact

| Feature | Without Redis | With Redis |
|---------|---------------|------------|
| **Scan Execution** | Synchronous (blocks) | Async (queued) |
| **Scan Progress** | Database polling | WebSocket push |
| **Cache** | In-memory (100 items) | Redis (unlimited) |
| **Horizontal Scaling** | ❌ No | ✅ Yes |
| **API Response Time** | Slower (no cache) | Faster (Redis cache) |
| **Concurrent Scans** | Limited | Unlimited (queue) |

---

## 🛠️ Troubleshooting

### Issue: Redis Connection Errors After Setup

**Check Logs:**
```bash
railway logs --service rosie-backend
```

**Verify Variable Linking:**
```bash
railway variables --service rosie-backend | grep REDIS
```

**Expected Output:**
```
REDIS_URL=redis://:password@containers-us-west-xxx.railway.app:6379
```

### Issue: BullMQ Still Not Enabled

**Possible Causes:**
1. `REDIS_URL` variable not set in backend service
2. Redis service not started
3. Network connectivity between services

**Quick Test:**
```bash
# SSH into backend container
railway shell --service rosie-backend

# Test Redis connection
redis-cli -u $REDIS_URL ping
# Expected: PONG
```

### Issue: Cache Still In-Memory

**Check Logs for:**
```
⚠️  Redis not configured - using in-memory cache
```

**Solution:** Ensure `REDIS_URL` is set and backend service restarted.

---

## ✅ Verification Checklist

After adding Redis to Railway:

- [ ] Redis service created in Railway project
- [ ] `REDIS_URL` variable linked to backend service
- [ ] Backend deployment succeeded (no Redis connection errors)
- [ ] Console logs show: `✅ Redis configured via REDIS_URL`
- [ ] Console logs show: `✅ Connecting to Redis via REDIS_URL for caching`
- [ ] Scan trigger returns `"status": "queued"` (not `"in_progress"`)
- [ ] Scan progress endpoint returns BullMQ job state
- [ ] Second API call to same endpoint is <10ms (cache hit)
- [ ] Multiple concurrent scans work without blocking

---

## 🎯 Next Steps

1. **Add Redis service to Railway project** (2 minutes)
2. **Link REDIS_URL to backend service** (1 minute)
3. **Verify deployment logs** (check for ✅ Redis configured messages)
4. **Test scanning functionality** (should see "async mode" message)
5. **Monitor performance** (cache hits, job queue metrics)

---

## 📝 Additional Notes

### Redis Persistence (Railway Default)
- Railway Redis includes RDB snapshots (persistence enabled by default)
- Data persists across Redis restarts
- No additional configuration needed

### Redis Memory Limit
- Railway's default Redis plan has memory limits
- BullMQ automatically removes old completed jobs (1 hour retention)
- Cache has 5-minute TTL to prevent memory bloat

### Scaling Considerations
- If deploying multiple backend instances, Redis adapter for Socket.IO recommended
- Current implementation supports single backend + Redis setup
- For multi-instance WebSocket, see: https://socket.io/docs/v4/redis-adapter/

---

**Status**: Ready for Redis integration
**Impact**: Enables Phase 5 async scanning and caching features
**Effort**: ~5 minutes to add Redis service in Railway
**Risk**: Low (fallback to sync mode if Redis unavailable)
