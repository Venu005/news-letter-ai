# Newsletter Publish (Resend) — Design Spec

## 1. Purpose

Add **publish** capability so a user can send the saved **`finalDraft`** as an email via **[Resend](https://resend.com)** transactional API and mark the **`Newsletter`** as **`PUBLISHED`**.

This closes the gap vs `docs/superpowers/specs/2026-04-30-ai-newsletter-system-design.md` § step 6 (`POST /api/publish`).

## 2. Goals & Success Criteria

- **`POST /api/publish`** accepts **`newsletterId`** (and optional **`to`**); validates newsletter + non-empty **`finalDraft`**; sends email server-side; updates **`status`** to **`PUBLISHED`** on success.
- **Secrets** (`RESEND_API_KEY`, etc.) exist only in server env — never exposed to the browser.
- Draft UI exposes a **Publish** control with loading/error feedback.
- MVP sends **plain text** body equal to **`finalDraft`** (no Markdown→HTML requirement in v1).

## 3. Scope

### In scope

- Resend REST integration from **`POST /api/publish`** (Node **`fetch`** to `https://api.resend.com/emails` or official **`resend`** npm package — implementation plan chooses one).
- Env: **`RESEND_API_KEY`**, **`RESEND_FROM`** (verified sender), **`NEWSLETTER_PUBLISH_TO`** (default recipient when **`to`** omitted).
- Request body: **`{ newsletterId: string, to?: string }`** where **`to`** must be a valid email when provided.
- Status transition: **`REVIEWING`** or **`DRAFTING`** → **`PUBLISHED`** after successful send (reject **`PUBLISHED`** idempotent message or **400** “already published” — choose **400** with clear message for duplicate publish).

### Out of scope

- Mailchimp, lists, templates UI, scheduling, webhooks for bounces/opens.
- Markdown rendering to HTML (follow-up).
- Auth / multi-tenant isolation (same caveat as existing APIs).

## 4. API Contract

### `POST /api/publish`

**Headers:** `Content-Type: application/json`

**Body:**

```json
{
  "newsletterId": "<uuid>",
  "to": "optional@example.com"
}
```

**Recipient resolution:**

1. If **`to`** present → validate RFC5322-ish with Zod **`z.string().email()`**.
2. Else use **`process.env.NEWSLETTER_PUBLISH_TO`** trimmed.
3. If still missing → **400** `{ "error": "Missing recipient: set NEWSLETTER_PUBLISH_TO or pass \"to\"." }`.

**Server env (required for send):**

- **`RESEND_API_KEY`** — if missing → **503** `{ "error": "Email not configured." }` (do not leak detail).

**Newsletter lookup:**

- **`findUnique`** by **`newsletterId`** → **404** if missing.

**Preconditions:**

- **`finalDraft`** after trim non-empty → else **400** `{ "error": "No draft content to publish." }`.
- **`status`** not **`PUBLISHED`** → else **400** `{ "error": "Newsletter already published." }`.
- **`status`** is **`DRAFTING`** or **`REVIEWING`** → else **400** `{ "error": "Newsletter must be in drafting or review before publish." }` (reject **`RESEARCHING`** and **`PUBLISHED`**).

**Success response:** **200** JSON e.g. `{ "ok": true, "resendId": "<id|null>" }` if API returns id.

**Upstream failure:** **502** or **503** with `{ "error": "<safe user message>" }` — log full Resend body server-side only.

**Side effect:** **`prisma.newsletter.update`** set **`status: "PUBLISHED"`** only after Resend reports success.

## 5. Resend Payload (v1)

- **from:** **`RESEND_FROM`**
- **to:** resolved recipient array of one address
- **subject:** `Newsletter: {niche}` or `Newsletter — {truncate niche}` (max ~100 chars)
- **text:** **`finalDraft`** string
- **reply_to:** optional future env; omit v1

## 6. UI (`draft-editor` or sibling)

- **Publish** button visible when **`finalDraft`** trim non-empty and **`status !== PUBLISHED`**.
- On click: **`POST /api/publish`** with **`{ newsletterId }`**. Optional text field **“Send to”** bound to **`to`** can be added in implementation plan as stretch; spec allows body override without requiring new field in v1.
- Loading: disable button + show “Publishing…”
- Success: message + **`GET`** reload or optimistically set status badge **Published**
- Error: show **`error`** string from JSON

## 7. Dependencies

- **`draft-editor`** already persists **`finalDraft`** via **`PATCH /api/newsletters/[id]`**; publish does not re-save draft unless we add explicit “save before publish” — **recommend client calls save before publish** or server re-reads DB (server always reads latest from DB before send; no client save required).

## 8. Security

- Rate limiting: rely on Resend + platform limits v1; no custom rate limit in spec.
- Do not log **`RESEND_API_KEY`** or full **`finalDraft`** in production logs if policy forbids — at minimum avoid logging keys.

## 9. Follow-Ups

- HTML email from Markdown; **`resend`** React email templates.
- Recipient list / audience model in Prisma.
- Auth on **`/api/publish`**.
