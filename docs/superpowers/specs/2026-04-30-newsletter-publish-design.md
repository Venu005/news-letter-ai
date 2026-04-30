# Newsletter Publish (Resend) — Design Spec

## 1. Purpose

Add **publishing** so a user can send the current **`finalDraft`** from the app to an inbox via **[Resend](https://resend.com)** transactional email, then mark the **`Newsletter`** as **`PUBLISHED`**.

This extends `docs/superpowers/specs/2026-04-30-ai-newsletter-system-design.md` §6 (“Publishing”) with concrete API, env, and UI behavior for **v1**.

## 2. Goals & Success Criteria

- From the **draft** screen, user clicks **Publish**; server validates newsletter + draft, sends one email via Resend, updates **`Newsletter.status`** to **`PUBLISHED`**.
- Secrets (**Resend API key**, default recipient) stay **server-only**.
- Clear errors for validation vs upstream (Resend) failure without leaking secrets.

## 3. Scope

### In scope

- **`POST /api/publish`** — JSON body, server-side Resend call, Prisma status update.
- Env configuration: **`RESEND_API_KEY`**, **`RESEND_FROM`**, **`NEWSLETTER_PUBLISH_TO`** (default **`to`**).
- Optional body field **`to`** (email string) overriding default recipient when provided.
- Draft page UI: **Publish** button, loading/disabled states, success/error messaging.
- Email format **v1:** **`text/plain`** body = trimmed **`finalDraft`** (no Markdown→HTML in v1 unless trivial `<pre>` escape decided during implementation).

### Out of scope

- Mailchimp, lists, campaigns, scheduling, templates UI.
- Auth / RBAC (same assumption as existing UI spec).
- Webhooks for bounces/opens.
- **`publishedAt`** column (optional follow-up; **`updatedAt`** suffices for v1).

## 4. Preconditions & Status Rules

- Newsletter **must exist**.
- **`finalDraft`** must be non-empty after trim.
- **`status`** must be **`REVIEWING`** or **`DRAFTING`** to publish (reject **`PUBLISHED`** with **409** or **400** with clear message; reject **`RESEARCHING`** with **400**).
- Recipient: **`to`** from JSON **if** valid email **else** **`NEWSLETTER_PUBLISH_TO`** env; if neither resolves → **400**.

## 5. API Contract

### `POST /api/publish`

**Request body:**

```json
{
  "newsletterId": "uuid",
  "to": "optional@recipient.example"
}
```

**Success (200):**

```json
{
  "ok": true,
  "messageId": "optional-string-from-resend"
}
```

**Errors:**

| Status | When |
|--------|------|
| **400** | Missing `newsletterId`, invalid email `to`, empty `finalDraft`, missing recipient resolution |
| **404** | Newsletter not found |
| **409** | Already `PUBLISHED` (or optional **400** with message — pick one in implementation; prefer **409**) |
| **502** | Resend HTTP error / network failure after retries (if any) |

Error JSON shape: `{ "error": string }` — human-readable, no raw upstream payloads.

## 6. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| **`RESEND_API_KEY`** | Yes for publish | Resend API key (server only). |
| **`RESEND_FROM`** | Yes | Verified sender, e.g. `Newsletter <onboarding@resend.dev>` or domain-verified address. |
| **`NEWSLETTER_PUBLISH_TO`** | Yes unless every request sends **`to`** | Default recipient email. |

Document in **`.env.example`** without real secrets.

## 7. Resend Integration

- Use official **`resend`** npm package **or** `fetch` to `https://api.resend.com/emails` — implementation plan chooses one; prefer maintained SDK if lightweight.
- Email **`subject`**: derive from niche or first line of draft, e.g. **`Newsletter: {niche}`** (truncate subject length safely).

## 8. UI (`draft-editor.tsx`)

- **Publish** button next to Save / Generate (order: Generate draft → Save draft → Publish).
- Disabled when **`finalDraft`** empty/whitespace or request in flight.
- On click: **`POST /api/publish`** with `{ newsletterId }` only **v1** (optional **`to`** input field deferred unless added in same milestone).
- Success: show confirmation; **`GET`** newsletter again or rely on returned payload if extended — minimally refetch to show **`PUBLISHED`** badge.
- Failure: show **`error`** string from JSON.

## 9. Security & Ops

- Never expose **`RESEND_API_KEY`** to the browser.
- Log errors without logging full draft content or tokens at **info** level; restrict sensitive logs to debug if needed.

## 10. Dependencies

- Existing **`Newsletter`** model **`status`** string values include **`PUBLISHED`** per Prisma schema comments.
- Existing draft page and **`PATCH`** **`finalDraft`** behavior unchanged.

## 11. Follow-Ups

- Markdown→HTML rendering for nicer emails.
- Optional **`to`** field in UI + validation.
- **`publishedAt`** column and audit trail.
- Auth before exposing publish.
