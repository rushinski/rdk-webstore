# Site Lock Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce storefront site lock at the request gate so non-admin visitors are redirected to `/locked` while signed-in admins can still browse normally.

**Architecture:** Use the existing proxy site-lock checker as the enforcement point, ensure it is actually integrated into the request pipeline for storefront requests, and tighten the `/locked` page behavior so admins can escape it while non-admins remain blocked.

**Tech Stack:** Next.js App Router, TypeScript, proxy middleware utilities, Supabase auth/session helpers, Jest

---

## File Structure

- Modify: `src/proxy/site-lock.ts`
  - Tighten allow/bypass logic and admin session handling if needed.
- Modify: request pipeline entrypoint that invokes proxy checks
  - Ensure site lock runs for public storefront requests.
- Modify: `app/locked/page.tsx`
  - Redirect authenticated admins away from the locked page and preserve `next`.
- Test: `tests/unit/site-lock-proxy.test.ts`
  - Cover redirect/bypass behavior.
- Test: `tests/unit/locked-page.test.tsx` or existing page-level test location
  - Cover admin escape and locked-page rendering.

### Task 1: Verify and enforce proxy site-lock integration

**Files:**
- Modify: proxy entrypoint file that wires `checkSiteLock`
- Modify: `src/proxy/site-lock.ts`
- Test: `tests/unit/site-lock-proxy.test.ts`

- [ ] **Step 1: Write/expand failing proxy tests**

```ts
it("redirects storefront navigation to /locked when site lock is active", async () => {
  const response = await checkSiteLock(request, "req-1");
  expect(response?.status).toBe(307);
});

it("allows signed-in admins through", async () => {
  const response = await checkSiteLock(requestWithAdminCookie, "req-2");
  expect(response).toBeNull();
});
```

- [ ] **Step 2: Run test to verify current gap**

Run: `npm run test:jest:unit -- tests/unit/site-lock-proxy.test.ts`
Expected: FAIL if integration or bypass assumptions are wrong

- [ ] **Step 3: Ensure request pipeline invokes site lock**

```ts
const siteLockResponse = await checkSiteLock(request, requestId);
if (siteLockResponse) {
  return siteLockResponse;
}
```

- [ ] **Step 4: Tighten allowlist and admin bypass only where intended**

```ts
const allowPrefixes = ["/locked", "/auth", "/admin", "/api/auth", "/api/admin", "/_next", "/images"];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/site-lock-proxy.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/proxy/site-lock.ts tests/unit/site-lock-proxy.test.ts <proxy-entry-file>
git commit -m "fix: enforce site lock in storefront request pipeline"
```

### Task 2: Make `/locked` admin-aware

**Files:**
- Modify: `app/locked/page.tsx`
- Test: `tests/unit/locked-page.test.tsx`

- [ ] **Step 1: Write failing page test**

```ts
it("redirects authenticated admins away from /locked", async () => {
  await expect(LockedPage({ searchParams: Promise.resolve({ next: "/products" }) })).rejects.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/locked-page.test.tsx`
Expected: FAIL because page currently always renders

- [ ] **Step 3: Add admin session escape**

```ts
const session = await getServerSession();
if (session && isAdminRole(session.role)) {
  redirect(next || "/");
}
```

- [ ] **Step 4: Keep countdown + date rendering intact for non-admins**

```tsx
{unlockAtIso ? <UnlockTimer unlockAtIso={unlockAtIso} /> : null}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/locked-page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/locked/page.tsx tests/unit/locked-page.test.tsx
git commit -m "fix: allow admins to bypass locked page"
```

### Task 3: Final verification

**Files:**
- Modify: `src/proxy/site-lock.ts`
- Modify: request proxy entrypoint
- Modify: `app/locked/page.tsx`
- Test: `tests/unit/site-lock-proxy.test.ts`
- Test: `tests/unit/locked-page.test.tsx`

- [ ] **Step 1: Run targeted tests**

Run: `npm run test:jest:unit -- tests/unit/site-lock-proxy.test.ts tests/unit/locked-page.test.tsx`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

```text
1. Enable site lock in admin settings
2. Visit storefront while signed out
3. Confirm redirect to /locked with timer/date
4. Click admin sign in and sign in as admin
5. Confirm admin can browse storefront normally
6. Confirm non-admin visitor remains locked out
```

- [ ] **Step 4: Commit**

```bash
git add src/proxy/site-lock.ts app/locked/page.tsx tests/unit/site-lock-proxy.test.ts tests/unit/locked-page.test.tsx <proxy-entry-file>
git commit -m "fix: enforce storefront site lock with admin bypass"
```
