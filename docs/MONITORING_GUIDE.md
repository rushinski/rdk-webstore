# MONITORING_GUIDE.md — Realdealkickz

> Purpose: Provide a complete observability framework for the Real Deal Kickz platform across Local → Staging → Production environments. This guide defines metrics, logs, traces, alerting, dashboards, and verification procedures that ensure reliability, correctness, and actionable monitoring at scale.
> 

---

# 1) Monitoring Architecture Overview

Observability spans all layers of the system:

| Layer | Tools | Purpose |
| --- | --- | --- |
| **Frontend & API** | Vercel Analytics, Structured Logs, Request IDs | Perf metrics, latency, edge diagnostics |
| **App Errors** | Sentry | Exceptions, breadcrumbs, release tracking |
| **Behavior Analytics** | PostHog | Funnels, conversions, drop-offs |
| **Database** | Supabase Logs, RLS Violation Logs | Query latency, access control correctness |
| **Background Jobs** | Structured logs, job result events | Webhook processing, cache invalidation, emails |
| **Payments** | Stripe Dashboard & Webhook Logs | Payment status, delivery health |
| **Infrastructure** | GitHub Actions Logs, CI Results | Build/test/deploy success |
| **External Uptime** | UptimeRobot or Vercel Uptime | `/healthz` and `/readyz` checks |

Monitoring applies differently across environments:

| Environment | Purpose |
| --- | --- |
| **Local Dev** | Debugging, architecture validation |
| **Staging** | Integration/load testing, RLS validation, webhook correctness |
| **Production** | Uptime, payments, errors, performance, anomaly detection |

---

# 2) Core Observability Principles

1. **Every request gets a unique `x-request-id`.**
    
    Propagated through logs, Sentry, Stripe events, and Supabase logs.
    
2. **All logs are structured JSON.**
    
    Includes: route, userId, requestId, latency, error code, stripeSessionId.
    
3. **No PII in logs.**
    
    Email, addresses, tokens, and secrets are scrubbed.
    
4. **Release Tags = Monitoring Anchors.**
    
    Every production deploy maps Sentry traces to a `vX.Y.Z` release.
    
5. **Monitoring never breaks the app.**
    
    If a monitoring service fails, the app continues to run normally.
    

---

# 3) Metrics (Production)

### 3.1 System SLO Metrics

| Category | Metric | Target |
| --- | --- | --- |
| **Availability** | API uptime | **≥ 99.9%** |
| **Checkout Reliability** | Payment completion rate | **≥ 98%** |
| **Performance** | p95 TTFB | **< 250ms** |
| **Database** | p95 query latency | **< 200ms** |
| **Errors** | 5xx rate | **< 1% of all requests** |
| **Edge Rate Limiting** | Allowed vs throttled | **≤ 3% throttled** |
| **Webhooks** | Stripe success | **≥ 99.5%** |

### 3.2 Staging-Only Metrics

Used to validate correctness before promoting to production.

| Category | Metric | Purpose |
| --- | --- | --- |
| **Load Test Throughput** | req/s sustained | Validates scaling behavior |
| **RLS Test Failures** | count | Must be 0 for deploy |
| **Cache Hit Ratio** | % static hits | Confirm ISR + tag revalidation behavior |
| **Webhook Replay Rate** | % repeated events | Detect ordering/idempotency issues |

---

# 4) Dashboards (Required)

### 4.1 Sentry Dashboard

- Top failing endpoints
- Error rate by release
- Trends for admin errors vs customer errors
- Stripe webhook processing failures

### 4.2 Vercel Analytics

- TTFB, LCP, FCP
- Regional performance
- API route latency
- Cache hit/miss insights

### 4.3 PostHog Analytics

- Checkout funnel
- Filter/search usage patterns
- Drop-off analysis per device
- Heatmaps for key flows

### 4.4 Supabase Dashboard

- Query latency (p50/p95)
- RLS policy violations
- Slow query logs
- Auth anomalies

### 4.5 Stripe Dashboard

- Payment success rate
- Webhook delivery success
- Session abandonment patterns

---

# 5) Alerts & Severity Model

### 5.1 Severity Definitions

| Severity | Description | Examples | SLA |
| --- | --- | --- | --- |
| **P0 (Critical)** | System unusable or checkout down | 100% 5xx, webhook failures | Respond < 30 min |
| **P1 (High)** | Major feature broken | Admin CRUD failing | Respond < 1 hour |
| **P2 (Moderate)** | Elevated errors, slow DB | p95 latency > 400ms | Respond < 4 hours |
| **P3 (Low)** | Minor degradation | API 404 increase | Respond < 24 hours |

### 5.2 Required Alerts (Production)

| Source | Trigger |
| --- | --- |
| **Sentry** | new error > 5/min, 5xx > 2% |
| **Vercel Uptime** | `/readyz` != 200 |
| **Stripe Webhooks** | consecutive 400/500 responses |
| **Supabase** | RLS violation detected |
| **Background Jobs** | failed job > 3 in 10 min |
| **Rate Limiter** | spike in throttled IPs |

### 5.3 Alert Channels

- **Primary:** ops@realdealkickz.com
- **Secondary (Phase 2):** Slack `#alerts`
- **Optional (Phase 3):** SMS escalation for P0

---

# 6) Logging Standards

### 6.1 Log Fields (Minimum Required)

Every log entry must include:

```
{
  "timestamp": "...",
  "level": "info|warn|error",
  "requestId": "...",
  "route": "...",
  "method": "...",
  "status": "...",
  "latency_ms": "...",
  "userId": "...",          // if available
  "stripeSessionId": "...", // if applicable
  "message": "..."
}

```

### 6.2 Log Channels

| Layer | Logs |
| --- | --- |
| API Routes | structured logs + request IDs |
| Stripe Webhooks | structured logs, webhook signature validation results |
| Background Jobs | job result, retries, durations |
| Supabase | query logs, RLS events, auth events |

### 6.3 PII Removal

- Mask emails → `"e***@gmail.com"`
- Never log shipping addresses
- Never log tokens or secrets
- Log Stripe IDs only (safe)

---

# 7) Background Jobs & Workflow Observability

Applies to:

- Order finalization via Stripe webhooks
- Inventory synchronization
- Cache revalidations
- Email notifications

### Required monitoring:

| Metric | Expectation |
| --- | --- |
| Job execution duration | logged + p95 tracked |
| Failure count | alert when >3/10min |
| Webhook replays | logged + correlated via requestId |
| Cache revalidation events | must log tag/path invalidated |

---

# 8) Cache Observability

Because the system uses ISR + tag-based invalidation:

### Monitor:

- Tag invalidation frequency
- ISR regeneration time
- Cache hit ratio (Vercel Analytics)
- Cache staleness incidents (page not updating after CRUD)

### Flags:

- Any admin CRUD action must emit a `cache_invalidation` log entry.
- Stripe order finalization must trigger `products` or `orders` tag revalidation.

---

# 9) RLS Observability (Security-Critical)

### 9.1 Required Tests (Staging)

Before each production tag:

- RLS read/write isolation tests
- Multi-tenant guard tests (if tenant_id present)
- Policy regression suite
- Service role misuse detection

### 9.2 Required Monitoring (Production)

- Supabase RLS violation logs (alert on any)
- Unexpected full-table scans
- Abnormal role usage patterns

---

# 10) Load & Stress Testing (Staging)

### Required tools: Artillery or k6

### Scenarios to test:

- Product catalog browsing
- Product page deep dive
- Checkout redirect flow
- Admin CRUD
- High-volume Stripe webhook simulation
- Rate limiter behavior

### Metrics recorded:

- p95 latency
- Failure rates
- Rate limiter throttle percentage
- Webhook throughput & ordering correctness

---

# 11) Health Checks

### `/healthz` (Liveness)

Confirms:

- App routed
- Environment variables validated
- Build loaded correctly

### `/readyz` (Readiness)

Confirms:

- DB reachable and responding under threshold
- Stripe reachable
- Background job subsystem healthy
- Migrations applied

Production uptime monitors hit `/readyz` every 60s.

---

# 12) Monitoring Procedures by Environment

### 12.1 Local Dev

- Spot-check logs
- Validate cache invalidation
- Run simulated webhooks

### 12.2 Staging

- Run load tests
- RLS regression suite
- Webhook replay simulation
- Validate alert triggers
- Compare metrics vs last release

### 12.3 Production

- Daily Sentry review
- Daily Stripe webhook checks
- Weekly PostHog funnel review
- Weekly latency review
- Monthly alert calibration
- Monthly `/incidents` audit

---

# 13) CVL (Critical Validation Loop) for Monitoring

| Risk | Mitigation |
| --- | --- |
| Alert fatigue | Consolidate, raise thresholds, dedupe |
| Missed incidents | Redundant monitors (Vercel + UptimeRobot) |
| RLS drift | CI tests + staging gating |
| Cache staleness | Tag invalidation logs + RLS test coverage |
| Monitoring outage | “Fail-open” policy; app not impacted |
| Data inconsistency | Correlate via requestId across layers |

---

# 14) Expansion Path (Phase 2 → Phase 5)

| Phase | Upgrade |
| --- | --- |
| **Phase 2** | Slack alerts, Lighthouse CI, structured log enrichment |
| **Phase 3** | Grafana/Loki dashboards, SMS alerts, job queue dashboards |
| **Phase 4** | Correlated traces (OpenTelemetry), anomaly detection |
| **Phase 5** | ML-driven prediction for drop-offs, auto-remediation tasks |