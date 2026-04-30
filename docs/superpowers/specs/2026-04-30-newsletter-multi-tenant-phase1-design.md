# Newsletter Multi-Tenant Phase 1 — Design Spec

## 1. Purpose

Evolve the MVP newsletter app into a **multi-user product**: signed-in creators **own** newsletters, each newsletter has a **shareable public landing page** with **double opt-in** email subscribe. Phase 1 deliberately excludes canvas customization, ESP sync (Mailchimp), scheduling, templates UI, and bounce webhooks—those become later specs once identity, ownership, and subscriber state exist.

This spec builds on `2026-04-30-ai-newsletter-system-design.md` and the shipped multi-route UI / publish flows by adding **User**, **`Newsletter.slug`**, **`Subscriber`**, **Clerk** sessions, and **public subscribe + confirm** routes.

## 2. Goals & Success Criteria

- A **Clerk-authenticated** creator has a **`User`** row keyed by **`clerkUserId`** and can create/manage newsletters scoped to them.
- Each newsletter exposes a **stable public URL** via a **globally unique `slug`** (readable sharing).
- Anonymous visitors can **request subscription** with email; system sends **confirmation link** via **Resend**; subscription becomes **`active`** only after confirmation.
- **Ownership checks** prevent cross-user reads/writes on newsletter APIs (no trusting client-supplied IDs alone).
- MVP-era routes continue to function after migration behind auth where applicable (implementation plan details cutover).

## 3. Scope

### In scope

- **Auth:** Hosted auth with **Clerk** as the **default** integration for Next.js App Router (sessions + middleware).
- **Models:** `User`, `Newsletter` extended with ownership + `slug`, `Subscriber` with status lifecycle and confirmation tokens (stored hashed).
- **Public routes:** Landing page Template v1 (fixed layout: name/blurb + form—**not** a canvas builder).
- **Subscribe API:** Double opt-in with anti-enumeration responses.
- **Confirm flow:** Opaque token, TTL, idempotent activation.
- **Security baseline:** Validation, hashed tokens, timing-safe compare, rate limiting requirement, minimal logging hygiene.
- **Config:** Document Clerk + Resend + canonical **`APP_URL`** in `.env.example`.

### Out of scope (explicit hooks only)

- Customizable landing **canvas** / drag-drop builder.
- **Audience segments**, Mailchimp (or other ESP) sync, **scheduling** sends, **templates** product UI.
- **Bounce/delivery webhooks** and advanced deliverability tooling.
- CAPTCHA / Turnstile (Phase 2 if abuse warrants; rate limits come first).

## 4. Data Model

### 4.1 `User`

| Field | Notes |
|--------|------|
| `id` | Internal UUID primary key (implementation choice). |
| `clerkUserId` | Unique string from Clerk (`sub`). Source of truth for login identity. |
| `email` | Optional cache from Clerk for convenience; Clerk remains authoritative. |
| `createdAt` / `updatedAt` | Standard timestamps. |

**Sync strategy:** Lazy upsert on first authenticated request or Clerk webhook—implementation plan picks one; spec requires eventual consistency within first session.

### 4.2 `Newsletter` (extends current model)

Existing fields retain meaning (`niche`, `mastraThreadId`, `status`, `finalDraft`, `topics`, etc.).

| Addition | Notes |
|----------|------|
| `userId` | Required for **new** newsletters after cutover; FK to `User`. Migration must define handling for legacy rows without owner (see §10). |
| `slug` | **Globally unique**, URL-safe string (validated format). Public landing lookup key for v1. |
| Display fields v1 | Optional `displayName` / short `tagline` for landing template—minimal; avoid duplicating full CMS. |

### 4.3 `Subscriber`

| Field | Notes |
|--------|------|
| `id` | UUID. |
| `newsletterId` | FK to `Newsletter`. |
| `emailNormalized` | Lowercased canonical email for uniqueness constraints per newsletter. |
| `status` | `pending` \| `active` \| `unsubscribed` (Phase 1 requires `pending`/`active`; `unsubscribed` may land in 1.5). |
| `confirmationTokenHash` | Nullable after confirmation; stores hash only. |
| `confirmationExpiresAt` | TTL boundary for pending confirmations. |
| `confirmedAt` | Nullable until activated. |
| `createdAt` / `updatedAt` | Audit. |

**Uniqueness:** At most one logical subscription row per `(newsletterId, emailNormalized)` for active lifecycle—implementation resolves “resubmit pending” via update-token-resend vs duplicate rows (plan spells out chosen behavior).

## 5. Routes & Clerk Boundaries

### 5.1 Public (no Clerk session)

| Route | Responsibility |
|--------|------------------|
| `GET /p/[slug]` | Landing page: newsletter display fields + subscribe form. Exact prefix (`/p`) is default; implementation may alias if consistent. |
| `POST /api/public/subscribe` | Accept `{ slug, email }`; enqueue pending subscriber + send confirmation email; **anti-enumeration** response (§6). |
| `GET /subscribe/confirm` | Validate `token` query; activate subscriber; redirect to neutral success/failure UX. |

### 5.2 Creator (Clerk required)

All creator workflows that mutate or load private newsletter data run behind enforced Clerk sessions—for example **`/dashboard/**`** or **`/app/**`** (prefix chosen in implementation plan). Existing **`/newsletter/[id]/…`** flows move behind auth **or** redirect into the protected prefix with stable IDs.

**Middleware:** Protect creator prefixes; redirect unauthenticated users to Clerk sign-in with return URL. Do **not** protect `/p/*`, `/subscribe/*`, or public subscribe APIs.

**Server rule:** Every mutation verifies `newsletter.userId === currentUser.id` (resolved via Clerk → `User`).

### 5.3 Home `/`

Behavior choice belongs in implementation plan: marketing + sign-in vs auto-redirect authenticated users to dashboard—spec requires one coherent UX documented in plan.

## 6. Subscribe & Confirm Contracts

### 6.1 `POST /api/public/subscribe`

**Body:** `{ "slug": string, "email": string }`

**Validation:**

- Invalid email shape → **400** `{ "error": string }`.
- Unknown `slug` → **404**.

**Success behavior:**

- Always respond **200** or **202** with the **same generic payload** whether the email is new, already `pending`, or already `active` (anti-enumeration): e.g. *“If this address can receive mail, we’ve sent a confirmation link.”*

**Side effects:**

- Upsert pending state, rotate token + expiry on resubmit per plan (avoid unbounded spam while keeping UX understandable).

### 6.2 `GET /subscribe/confirm?token=…`

- Invalid, expired, or already-consumed token: show **neutral** failure page (no “email not found” leaks).
- Valid: transition to **`active`**, clear confirmation hash, set `confirmedAt`; **idempotent** if already active.

**Token handling:** Cryptographically random opaque token; **hash** (e.g. SHA-256) persisted; **timing-safe** comparison; TTL recommended **24–72 hours** (exact default in plan).

## 7. Creator-Facing API Adjustments

Existing APIs (`GET`/`PATCH` newsletter, topics batch, `generate-topics`, `generate-draft`, `publish`) gain **ownership enforcement**:

- Resolve Clerk user → `User.id`.
- For newsletter-scoped handlers, ensure `Newsletter.userId` matches before read/write.

New creator responsibilities:

- **Create newsletter** with **`slug`** allocation and uniqueness (**409** on collision).
- **Optional:** `PATCH` newsletter to update landing fields used on `/p/[slug]` within validation bounds.

Exact REST shapes inherit current JSON patterns unless plan refactors resource naming.

## 8. Security & Operations

### 8.1 Rate limiting

Production **must** apply rate limits on `POST /api/public/subscribe` (e.g. per IP + per `slug`/`email` composite). Concrete thresholds and backing store are implementation choices; absence of limits is not acceptable for public endpoints.

### 8.2 Logging

- Do **not** log full emails or raw tokens at **info**.
- Errors should avoid echoing upstream provider payloads to clients.

### 8.3 Email sending

- **Resend** for confirmation mail (reuse established integration patterns).
- **`FROM`** must be Resend-verified; may share **`RESEND_FROM`** with publish mail or split later via separate env vars.

### 8.4 Failure modes

If persistence succeeds but email send fails, implementation plan defines **retry** or **dead-letter visibility** so operators can detect stuck `pending` subscribers—exact mechanics deferred to plan.

### 8.5 CAPTCHA

Optional Phase 2; not required for Phase 1.

## 9. Environment Variables

Document without secrets in `.env.example`:

| Variable | Phase 1 role |
|----------|----------------|
| Clerk publishable + secret keys | Auth (names per Clerk docs). |
| `APP_URL` | Canonical origin for confirmation links (avoid env mismatch). |
| `RESEND_API_KEY`, `RESEND_FROM` | Transactional confirmation email. |

Existing Turso / Prisma / publish vars remain as today.

## 10. Migration & Legacy MVP Data

Pre-multi-tenant `Newsletter` rows lack `userId` / `slug`. Implementation plan **must** include one of:

- One-time migration assigning legacy newsletters to a designated bootstrap **User**, plus **`slug`** backfill; or
- Blocking release until administrators reconcile orphans.

New newsletters created after Phase 1 launch **require** `userId` and unique `slug`.

## 11. Testing & Acceptance Notes

- Tests for token hashing, expiry, confirm **idempotency**, and slug validation where practical.
- Manual QA checklist: Clerk gates dashboard; public flows work logged out; confirmation expiry behaves; duplicate subscribe messaging stays generic.

## 12. Follow-Up Specs (placeholders)

| Topic | Relationship to Phase 1 |
|--------|-------------------------|
| Landing canvas builder | Replaces fixed `/p/[slug]` template; keeps `Subscriber` model. |
| Mailchimp / ESP sync | Trigger on `Subscriber` activation events. |
| Scheduling & templates | Outbound campaign layer; independent of subscribe capture. |
| Bounce webhooks | ESP-mediated; updates subscriber health flags. |

---

## Spec self-review (maintenance)

- **Placeholders:** None intentional; TTL and rate-limit numbers are recommendation bands, final defaults live in implementation plan.
- **Consistency:** Public subscribe + confirm align with double opt-in; creator APIs require ownership.
- **Scope:** Single Phase 1 product slice; deferred features named, not partially specified.
- **Ambiguity reduced:** Anti-enumeration on subscribe mandated; global unique `slug` stated; Clerk default stated.
