# Newsletter Multi-Route UI — Design Spec

## 1. Purpose

Deliver **milestone A**: an end-to-end **Next.js App Router** UI that walks a user from **niche → topic review/edit → draft generation/edit**, wired to existing Mastra-backed APIs plus minimal REST endpoints so **refresh and deep links work**. Publishing to an external provider is explicitly **out of scope** for this milestone.

This spec complements `2026-04-30-ai-newsletter-system-design.md` (system overview) by detailing routes, APIs, and UX for the multi-route approach (option **2**).

## 2. Goals & Success Criteria

- User can enter a niche on **`/`**, receive persisted topics, and land on **`/newsletter/[id]/topics`** without losing identity after navigation or refresh.
- User can edit topic fields and toggle **approval**; changes persist server-side before drafting.
- User can generate a draft on **`/newsletter/[id]/draft`**, see markdown output, edit text, and **save** `finalDraft` to the database.
- No authentication in this milestone (single-user / trusted environment assumption documented below).

## 3. Scope

### In scope

- Three routes: `/`, `/newsletter/[id]/topics`, `/newsletter/[id]/draft`.
- New APIs: `GET` and `PATCH` for newsletter aggregate; batch `PATCH` for topics under a newsletter.
- Client loading/error states; disabled actions during slow requests.
- Styling consistent with existing Tailwind usage (readable, minimal).

### Out of scope

- `POST /api/publish` (Resend, Mailchimp, etc.).
- User accounts, sessions, RBAC.
- Rich WYSIWYG (first version: textarea + optional simple preview).
- Client-generated `threadId` (server continues to own `mastraThreadId` from `generate-topics` unless changed in a later spec).

## 4. Routes & Navigation

| Route | Responsibility | Entry / exit |
|--------|----------------|--------------|
| `/` | Capture **niche**; call `POST /api/generate-topics`; on success **redirect** to `/newsletter/{id}/topics`. | Default entry. |
| `/newsletter/[id]/topics` | `GET` newsletter + topics; inline edit; toggle `isApproved`; **Save** or auto-save via PATCH; button **Continue to draft** → navigate to `/newsletter/[id]/draft`. | Requires valid `id`. |
| `/newsletter/[id]/draft` | Optional `GET` to show existing `finalDraft` if already generated; **Generate draft** → `POST /api/generate-draft`; textarea (or split view) for edits; **Save draft** → `PATCH` newsletter `finalDraft`. | Requires valid `id`. |

Invalid or unknown `id`: show a short error and link back to `/`.

## 5. API Design

### 5.1 Existing (unchanged contracts for this milestone)

- `POST /api/generate-topics` — body `{ niche: string }`; response `{ newsletterId, threadId, topics[] }`.
- `POST /api/generate-draft` — body `{ newsletterId: string }`; response `{ draft: string }` (and server updates `Newsletter.finalDraft`, `status` per current implementation).

### 5.2 New: `GET /api/newsletters/[id]`

- **Purpose:** Load `Newsletter` and related `Topic[]` for refresh-safe pages.
- **Response 200:**  
  `{ newsletter: { id, niche, mastraThreadId, status, finalDraft, createdAt, updatedAt }, topics: Topic[] }`  
  where each topic includes `id, title, summary, sourceUrl, isApproved, newsletterId`.
- **404:** Newsletter not found.

### 5.3 New: `PATCH /api/newsletters/[id]/topics`

- **Purpose:** Persist topic edits and approval flags in one request.
- **Body:** `{ topics: Array<{ id: string; title?: string; summary?: string; sourceUrl?: string; isApproved?: boolean }> }`.
- **Validation:** Every `id` must belong to `newsletterId` in the URL; reject foreign or missing ids with **400**.
- **Response 200:** `{ topics: Topic[] }` (full updated list for the newsletter, ordered consistently e.g. by `title`).

### 5.4 New: `PATCH /api/newsletters/[id]`

- **Purpose:** Persist user-edited draft text (and optional future fields).
- **Body:** `{ finalDraft?: string }` (at least one field required when more fields exist later).
- **Response 200:** `{ newsletter: Newsletter }` (subset or full model as implementation chooses, but must include `finalDraft` when returned).

## 6. UI Behavior

### 6.1 Home (`/`)

- Form: niche string, submit **Generate topics**.
- Show inline error from non-OK responses; loading state on button.

### 6.2 Topics (`/newsletter/[id]/topics`)

- On mount: `GET /api/newsletters/[id]`.
- Editable fields per row: title, summary, sourceUrl; checkbox **Approved**.
- **Save changes:** `PATCH .../topics` with current edited rows (debounce optional for v1; explicit Save button acceptable).
- **Continue to draft:** enabled only if **at least one** topic has `isApproved === true` after last successful save (or optimistic local state with clear validation message).
- Link: “Start over” → `/`.

### 6.3 Draft (`/newsletter/[id]/draft`)

- On mount: `GET /api/newsletters/[id]` to show `finalDraft` if present.
- **Generate draft:** `POST /api/generate-draft` with `{ newsletterId: id }`; on success populate editor from `draft`.
- **Save draft:** `PATCH /api/newsletters/[id]` with `{ finalDraft: editorText }`.
- Show status from DB (`REVIEWING`, etc.) as read-only badge if useful.

## 7. Errors & Edge Cases

- Network failures: toast or banner + retry-friendly messaging.
- `generate-draft` with zero approved topics: API already returns **400**; surface message on draft page.
- Concurrent edits: last write wins for PATCH endpoints (no optimistic locking in v1).

## 8. Security & Ops Notes

- **No auth:** Anyone with `newsletterId` can read/update via API in this milestone; acceptable only for local/demo. Production requires auth + authorization in a follow-up.
- Do not log full draft bodies or secrets server-side beyond existing patterns.

## 9. Implementation Notes

- Prefer **Server Components** where static shell helps; topic/draft editors require client interactivity (`"use client"` as needed).
- Reuse Prisma client from `@/lib/prisma`.
- Keep API handlers thin: validate input, Prisma queries, consistent JSON errors.

## 10. Follow-Ups (not in this spec)

- `POST /api/publish`, provider keys, email templates.
- Optional: `threadId` supplied by client to match original system design.
- Auth (e.g. session or API key) for all newsletter routes.
