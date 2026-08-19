# IntelliCPP Horizontal Scaling & Multi-Node Deployment Guide

This guide details the architectural steps to scale IntelliCPP from a single-process server to a multi-instance, distributed cloud deployment behind a Load Balancer (Nginx, AWS ALB, Cloudflare, Kubernetes Ingress).

---

## 🏗️ Architecture Overview

```
                          [ Client Browsers / IDE ]
                                     │
                                     ▼
                    [ Layer 7 Load Balancer / Ingress ]
                     (TLS Termination, Path Routing)
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
        [ API Pod / Instance 1 ]               [ API Pod / Instance 2 ]
        - Express (Stateless)                 - Express (Stateless)
        - /ready, /live, /health              - /ready, /live, /health
        - Autocomplete Trie Index             - Autocomplete Trie Index
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                     [ Redis Cluster / Redis Sentinel ]
                     ├── Rate Limiting (Token Bucket Store)
                     ├── Shared Suggestion LRU Cache
                     └── BullMQ Job Queue (Execution Tasks)
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       [ Execution Worker Pod 1 ]              [ Execution Worker Pod 2 ]
       - Sandboxed Runner (Docker/gVisor)      - Sandboxed Runner (Docker/gVisor)
       - ulimits: 256MB RAM, 5s timeout        - ulimits: 256MB RAM, 5s timeout
```

---

## 1. Statelessness & State Stores

In a multi-node deployment, in-memory state cannot be relied upon across multiple HTTP nodes. The following adapters replace local memory:

### 1.1 Rate Limiting Store
- **Current Development State**: `MemoryBucketStore` in [backend/src/security/rateLimiter.js](file:///home/indmadmax/IntelliCPP/backend/src/security/rateLimiter.js)
- **Production Migration**:
  Use `RedisBucketStore` or `rate-limit-redis`:
  ```javascript
  const { RedisBucketStore } = require('./src/security/rateLimiter');
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL);
  const runCodeLimiter = new TokenBucketLimiter({
    store: new RedisBucketStore(redis),
    capacity: config.RATE_LIMITS.RUN_CODE.BURST_CAPACITY,
    refillRatePerSec: config.RATE_LIMITS.RUN_CODE.REFILL_PER_SEC
  });
  ```

### 1.2 Suggestion & Stats Cache
- **Current Development State**: In-memory `LRUCache` in [backend/src/cache/lruCache.js](file:///home/indmadmax/IntelliCPP/backend/src/cache/lruCache.js)
- **Production Migration**:
  Store cached suggestion payloads in Redis with standard string keys and TTL (`SETEX sug:<key> 300 <json>`).

---

## 2. Distributed Code Execution Workers (BullMQ + Redis)

Decoupling API request serving from heavy compilation prevents HTTP latency degradation.

### 2.1 Enqueueing Jobs in API Server
When an execution request hits `POST /api/runCode`:
```javascript
const { Queue } = require('bullmq');
const runCodeQueue = new Queue('code-executions', { connection: redisConnection });

app.post('/api/runCode', validateRunCodeInput, runCodeLimiter.middleware(), async (req, res) => {
  const job = await runCodeQueue.add('compile-and-run', {
    code: req.body.code,
    language: req.cleanLanguage,
    clientIp: req.ip
  }, {
    attempts: 1,
    removeOnComplete: 1000,
    removeOnFail: 1000
  });

  res.status(202).json({
    jobId: job.id,
    status: 'queued',
    pollUrl: `/api/jobs/${job.id}`
  });
});
```

### 2.2 Dedicated Worker Process
Workers run in isolated containers with strict CPU/memory quotas:
```javascript
const { Worker } = require('bullmq');
const { executeJobInSandbox } = require('./sandboxRunner');

const worker = new Worker('code-executions', async (job) => {
  return await executeJobInSandbox(job.data);
}, {
  connection: redisConnection,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY, 10) || 4
});
```

---

## 3. Kubernetes Probes & Health Checks

IntelliCPP provides production-grade probes ready for Kubernetes manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intellicpp-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: intellicpp-backend:v2.0
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /live
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 4. HTTP Compression & Caching Strategy

- **Gzip/Deflate Compression**: Automatically applied via `compression()` middleware on JSON and text payloads.
- **Frontend Assets**:
  - `/static/*`: `Cache-Control: public, max-age=31536000, immutable` (hashed assets).
  - `index.html`: `Cache-Control: no-cache, no-store, must-revalidate` (guarantees instant deployments without browser cache lockouts).
