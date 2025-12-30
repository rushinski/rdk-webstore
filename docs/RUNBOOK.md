# RUNBOOK.md — Realdealkickz

> Purpose: Authoritative operational guide for running, deploying, and maintaining the Real Deal Kickz system across Local → Staging → Production.
> 
> 
> Designed for reproducibility, rapid incident mitigation, and high observability.
> 

---

# **0) Environment Model**

| Environment | Purpose | Characteristics | Deployment |
| --- | --- | --- | --- |
| **Local** | Dev iteration | Test keys, optional local Supabase, fast rebuilds | Manual (`npm run dev`) |
| **Staging** | Full integration & load testing | Mirrors prod schema; real rate limits; Stripe sandbox | Deploy on `main` merge (preview) |
| **Production** | Live traffic | Locked env; strict RLS; observability enabled | **Tag-gated deploy** |

All runbook procedures below assume this 3-tier model.

---

# **1) Daily Operations Checklist**

| Task | Frequency | Owner |
| --- | --- | --- |
| Check Sentry P0/P1 alerts | Daily | DevOps |
| Examine structured logs by `x-request-id` | Daily | DevOps |
| Verify **Stripe webhook health** (no failed recent events) | Daily | Admin |
| Review Vercel + Supabase performance dashboards | Daily | Developer |
| Confirm **Staging** is healthy (`/healthz` + `/readyz`) | Daily | DevOps |
| Validate Supabase snapshots exist | Weekly | Admin |
| RLS test suite (`npm run test:rls`) | Weekly | Developer |
| Load test staging (`k6` or Artillery) | Weekly | DevOps |
| Cache-invalidation audit (ISR tags firing) | Weekly | Developer |

---

# **2) Incident Response — Unified Flow**

### **Trigger Sources**

- Sentry alert spike
- `x-request-id` log cluster indicates a failing path
- Stripe webhook failures
- Staging or production `/readyz` returns non-200
- Rate limiting middleware rejecting legitimate users
- Load-test regression detected

---

## **2.1 Response Workflow**

1. **Acknowledge**
    - Mark alert as “Investigating” in Slack/email.
2. **Assess**
    - Identify: Localized feature issue, RLS violation, caching issue, or full outage.
    - Use structured logs with the attached `x-request-id` chain to isolate.
3. **Contain**
    - Apply one or more:
        - Disable feature flag
        - Set “maintenance mode” for affected endpoint
        - Temporarily bypass ISR (force-dynamic)
        - Roll back to previous build tag
4. **Diagnose**
    - Validate environment config with `env.ts` validator.
    - Check RLS audit logs in Supabase.
    - Inspect Stripe webhook logs for signature mismatch or idempotency failure.
5. **Mitigate**
    - Deploy hotfix (tag patch version) or rotate affected secret.
    - Rebuild invalid ISR caches or run `revalidateTag()` manually.
6. **Verify**
    - Check `/healthz`, `/readyz`, and all core flows:
        - Catalog load
        - Product page
        - Checkout
        - Admin dashboard
7. **Document**
    - Add `/docs/incidents/YYYY-MM-DD.md` including RLS tests or load tests that will prevent recurrence.

### **Severity SLAs**

| Severity | Impact | SLA |
| --- | --- | --- |
| **P0** | Checkout unavailable, login broken, or severe RLS violation | Respond <15m, resolve <2h |
| **P1** | Admin or major feature outage | Respond <30m, resolve <6h |
| **P2** | Performance deterioration, partial feature failure | Same day |
| **P3** | Minor UI/analytics degradation | Within 48h |

---

# **3) Deployment Runbook (Tag-Gated)**

## **3.1 Requirements**

- All env vars validated by `src/config/env.ts` (Zod).
- CI green: lint, tests, typecheck, OpenAPI validation, migration diff check.
- Staging deploy must be healthy for 24 hours before a production release.

---

## **3.2 Release Steps**

1. **Merge** `jacob-dev` → `main`
2. **Tag the release**

```powershell
git tag -a v0.X.X -m "Release summary"
git push origin v0.X.X

```

1. **CI Flow**
    - Build → Test → OpenAPI validation
    - Apply Supabase migrations
    - Deploy to production (Vercel)
2. **Post-Deploy Validation**
    
    ```powershell
    curl https://realdealkickz.app/healthz
    curl https://realdealkickz.app/readyz
    curl https://realdealkickz.app/api/v1/products
    
    ```
    
3. Confirm Stripe webhook events reach `/api/stripe/webhook`.
4. Verify caching behavior:
    - Catalog pages revalidate
    - Product pages render from ISR
    - `no-store` APIs respond uncached

---

# **4) Hotfix Procedure**

1. Branch from `main`:
    
    ```
    git checkout -b hotfix/<issue>
    
    ```
    
2. Apply minimal fix.
3. Tag patch release:
    
    ```
    git tag -a v0.X.X+1 -m "Hotfix: <issue>"
    git push origin v0.X.X+1
    
    ```
    
4. CI deploys to production.
5. Run smoke tests + webhook test replay.
6. Merge back → `jacob-dev`.

---

# **5) Backup & Disaster Recovery**

## **5.1 Snapshot Verification**

- In Supabase console ensure:
    - Daily DB snapshots exist
    - Storage versioning enabled

Perform restore validation monthly in **Staging**.

---

## **5.2 Database Restore Steps**

1. Choose snapshot
2. Restore to isolated Supabase instance
3. Update `.env.staging` with new credentials
4. Redeploy staging build
5. Run integrity checks:
    
    ```sql
    select count(*) from orders;
    select count(*) from products;
    select count(*) from profiles;
    
    ```
    
6. Run RLS test suite against restored DB.

---

# **6) Stripe Webhook Recovery**

1. Visit Stripe Dashboard → Webhooks → Logs.
2. Confirm signature mismatch or timeout.
3. Review `STRIPE_WEBHOOK_SECRET` in Vercel/Staging.
4. Replay failed events via Stripe Dashboard.
5. Check structured logs for idempotency warnings.
6. Add failing event ID to incident record.

---

# **7) Authentication & Admin Issues**

1. Open Supabase Console → Auth → Users.
2. Reset admin password or regenerate TOTP secret.
3. Confirm admin can access `/admin`.
4. Rotate all admin sessions (logout everywhere).
5. Inspect audit logs (Phase 2 feature) for anomalies.

---

# **8) Observability & Monitoring**

### **Core Checks**

- Sentry: new error groups after latest deployment
- Vercel: latency spikes >200ms p95
- Supabase: RLS violations OR slow queries
- PostHog: checkout drop >10% week-over-week
- Logs: inspect `x-request-id` chains

---

# **9) Load Testing Procedure (Staging)**

### Run weekly load test:

**Artillery Example**

```bash
artillery run loadtests/catalog.yml
artillery run loadtests/checkout.yml

```

### Validate:

- Rate limiting returns correct 429s without blocking legitimate sessions
- ISR caches stay warm under steady load
- RLS does not leak cross-user data
- Stripe webhooks maintain success rate >99.5% under load

---

# **10) RLS Testing Procedure**

### Command:

```bash
npm run test:rls

```

### Validated Guarantees:

- Users cannot read others’ orders
- Admins bypass RLS correctly via service role
- Tenant/seller IDs (if added later) never leak
- Policies execute expected auth.uid context

---

# **11) Routine Maintenance**

| Task | Interval | Notes |
| --- | --- | --- |
| Rotate Supabase + Stripe secrets | Quarterly | Update GitHub + Vercel |
| Review migration backlog | Monthly | Ensure no schema drift |
| Rebuild ISR pages | Weekly | Ensure freshness |
| Restart staging environment | Weekly | Refresh cache & seeds |
| NPM dependency updates | Monthly | After CI validation |
| Invoke env validator on each environment | Every deploy | Required |

---

# **12) Communication Templates**

### **Incident Start**

```
[Incident] P0 — Checkout Down
Start: <timestamp>
Impact: Checkout 500 during session creation
Status: Investigating
Next Update: 15 min

```

### **Incident Resolution**

```
[Resolved] Incident #<id>
Root Cause: Stripe secret mismatch in staging→prod promotion
Fix: Rotated key + redeployed
Follow-Up: Add env validator rule; add staging→prod secret syncing step

```

---

# **13) CVL Checkpoints (Ops Layer)**

| Threat | Failure Mode | Mitigation |
| --- | --- | --- |
| Config divergence | Env drift between local/staging/prod | Centralized Zod env validator |
| Cache errors | Stale ISR pages | Tag-based revalidation + forced rebuild |
| Runtime failure | Missing Stripe/Supabase key | Build fails via env module |
| RLS regression | Data leakage | Weekly RLS test suite |
| Schema drift | Staging ≠ Prod | Versioned SQL migrations |
| Load spike | Rate limiting fails or blocks legit users | Upstash tests + load tests |
| Background work stalls | Webhook or job backlog | `/jobs/health` (Phase 2), Sentry alerts |

---

# **14) Appendix — Operational Commands**

### **Check health**

```powershell
curl https://realdealkickz.app/healthz
curl https://realdealkickz.app/readyz

```

### **Warm ISR cache (catalog)**

```powershell
Invoke-WebRequest https://realdealkickz.app/products

```

### **Replay Stripe events**

Performed through Stripe Dashboard → Webhooks → Replay event.