# First newsletter onboarding dialog and newsletter “new issue” CTA

## 1. Purpose

Improve first-run UX after sign-in: when a user has **no newsletters**, automatically surface a **modal** that asks for a **newsletter name**, creates the publication with existing server logic, and navigates to **`/dashboard/newsletter/[id]`**. On that page, add a **prominent primary action** that jumps to the existing **start new issue** flow (niche/topic form).

## 2. Scope

**In scope**

- **`/dashboard`:** When `newsletters.length === 0`, render a client onboarding dialog that opens automatically on load.
- **Reuse:** Same **`createNewsletter`** mutation and post-create redirect as **`CreateNewsletterForm`** today (`router.push` to the new newsletter’s dashboard URL).
- **Dismissal:** Modal is closable (X, overlay click, Escape). Closing does not create a newsletter; the user retains the current empty state and the anchored **`#create-newsletter`** inline form.
- **`/dashboard/newsletter/[id]`:** Add a hero-level button (copy: **Start new issue**) linking to an anchor on the existing **`CreateArticleForm`** section (same scroll pattern as **`#create-newsletter`** on the dashboard).
- **Accessibility:** Label/input association, focus management consistent with the app’s **`Dialog`** primitive, loading/disabled submit while pending, inline error display on failure.

**Out of scope**

- Showing the onboarding modal when the user already has one or more newsletters.
- **“Don’t show again this session”** or other suppression flags unless requested in a follow-up.
- Changing **`CreateArticleForm`** semantics (it remains **niche → create issue → topics**); no rename of backend entities.

## 3. Architecture

### 3.1 Approach

Use a **dashboard-only client island**: the Server Component continues to load newsletters via **`prisma.newsletter.findMany`** (existing query). Pass a boolean such as **`needsFirstNewsletterOnboarding`** derived from **`newsletters.length === 0`** into a **`FirstNewsletterDialog`** (or equivalent) client component.

Avoid client-side “do I have newsletters?” fetching for this gate; server-rendered truth removes flicker and matches requirement **A**.

### 3.2 Form reuse

Extract or share the **name field + validation + submit + error state** used by **`CreateNewsletterForm`** so the dialog and the inline form do not duplicate **`createNewsletter`** behavior. Either:

- A shared inner component used by both wrappers, or
- A thin hook used by both.

Both surfaces must **disable submit while pending** and ignore duplicate submits while loading.

### 3.3 Dialog primitive

Use the standard **modal `Dialog`** from the UI kit for neutral creation flows (not **`AlertDialog`**, which is suited to confirmations).

## 4. User flows

1. **Empty account → dashboard:** Modal opens with title/description for naming the newsletter; user submits → newsletter created → redirect to **`/dashboard/newsletter/[id]`**.
2. **Empty account → dismiss modal:** User closes modal; sees existing empty-state card and **`#create-newsletter`** section unchanged; can create from inline form.
3. **Return visit with zero newsletters:** Modal may auto-open again on **`/dashboard`** load (no session suppression in this spec).
4. **Newsletter page:** User clicks **Start new issue** in the hero → scroll/focus to anchored **`CreateArticleForm`** → existing submit behavior unchanged.

## 5. Edge cases

- **Errors:** Surface **`createNewsletter`** failures in whichever UI initiated the submit (dialog vs inline), matching current **`Alert`** patterns.
- **Concurrency:** If dialog and inline form were both usable in principle, both rely on the same pending/disable rules; no requirement to hide the inline section while the dialog is open (YAGNI unless usability feedback says otherwise).
- **Routing:** Success path always leaves **`/dashboard`** for the new newsletter detail route as today.

## 6. Testing

Manual smoke tests:

- New user / cleared newsletters: dashboard shows modal; submit creates and redirects; browser back to dashboard shows appropriate state (non-empty list).
- Dismiss modal: inline creation still works.
- Newsletter detail: hero button reaches **`CreateArticleForm`** and submission still routes to topics.

Automated tests optional for this slice unless the project already covers similar UI with stable selectors.

## 7. Files likely touched at implementation time

- `app/dashboard/page.tsx` — pass onboarding flag; render client dialog.
- `components/dashboard/create-newsletter-form.tsx` — refactor for shared core with dialog (exact split decided during implementation).
- New: `components/dashboard/first-newsletter-dialog.tsx` (name indicative only).
- `app/dashboard/newsletter/[id]/page.tsx` — hero CTA + anchor id on the **New issue** section wrapper.
- Optional: `components/dashboard/newsletter-header.tsx` if the hero button lives alongside existing header layout rather than only on the page shell.

## 8. Success criteria

- Users with **zero newsletters** see an immediate, dismissible name prompt without extra network round-trips for that gate.
- Successful creation always lands on the correct **`/dashboard/newsletter/[id]`**.
- Users can always fall back to the existing **`#create-newsletter`** flow after dismiss.
- Newsletter detail exposes an obvious **Start new issue** path to the existing form without duplicating issue-creation logic.

## 9. Relation to existing behavior

This spec layers on current **`CreateNewsletterForm`** and **`CreateArticleForm`** flows documented implicitly by **`app/dashboard/page.tsx`** and **`app/dashboard/newsletter/[id]/page.tsx`**. It does not replace issue lifecycle or publishing specs elsewhere under **`docs/superpowers/specs/`**.
