# Site Lock Enforcement Design

## Goal

Make the site lock setting actually enforce storefront access so non-admin visitors are redirected to a locked page while the lock is active, and signed-in admins can still browse the site normally.

## Scope

This design is limited to the site-lock request path and locked-page experience.

In scope:

- proxy-level storefront gate enforcement
- signed-in admin bypass
- locked page for non-admin visitors
- unlock timer/date display on the locked page
- admin sign-in path from the locked page

Out of scope:

- checkout lock behavior changes
- product sync behavior
- admin dashboard lock changes

## Core Semantics

When site lock is active:

- signed-in admins may browse the storefront normally
- non-admin visitors should be redirected to `/locked`
- `/locked` should explain that the site is currently locked
- if `site_unlock_at` is set, the locked page should show:
  - countdown timer
  - exact unlock date/time

When site lock is not active:

- storefront behaves normally
- `/locked` should not be the default path for normal browsing

## Enforcement Layer

Site lock should be enforced in the request gate, not just inside rendered pages.

Recommended behavior:

- run site-lock checks for public storefront page requests
- exempt:
  - `/locked`
  - `/auth/*`
  - `/admin/*`
  - required auth/admin APIs
  - framework/static asset routes

If locked and the requester is not an authenticated admin:

- HTML navigation redirects to `/locked?next=<original path>`
- API requests return a lock response when appropriate

If locked and the requester is an authenticated admin:

- allow the request through

## Locked Page Behavior

The `/locked` page should:

- say the site is currently locked
- show unlock timer when `site_unlock_at` exists
- show exact unlock date/time when `site_unlock_at` exists
- provide an `Admin sign in` link
- preserve `next` so admins can return to the original path after login

If an authenticated admin reaches `/locked` directly:

- redirect them back to `next` if valid
- otherwise redirect them to `/`

If a non-admin signed-in user reaches `/locked`:

- keep them on the locked page

## Request Intent Preservation

When redirecting to `/locked`, preserve the original path in `next`.

When linking to admin sign-in from `/locked`:

- use `/auth/login?next=<original target>`

After successful admin sign-in, the admin should be able to return to the intended storefront route.

## Error Handling

If site-lock settings cannot be read:

- fail open rather than taking down the storefront
- log the lookup failure

If the unlock date is invalid:

- locked page should still render
- countdown falls back to generic text

## Testing

Required coverage:

- non-admin HTML navigation is redirected to `/locked` when site lock is active
- signed-in admin request bypasses the lock
- exempt routes still pass through
- `/locked` shows timer/date when unlock time exists
- authenticated admins visiting `/locked` are redirected back out

## Constraints

- Storefront lock must be enforced before page rendering.
- Signed-in admin bypass must remain explicit and narrow.
- The locked page should be the only public experience while the lock is active.
