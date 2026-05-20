# First newsletter onboarding dialog + newsletter issue CTA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a dismissible **first-newsletter name dialog** on `/dashboard` when the user has zero newsletters, reuse the same **create + redirect** behavior as `CreateNewsletterForm`, and add a hero **Start new issue** button on `/dashboard/newsletter/[id]` that scrolls to the existing **`CreateArticleForm`** section.

**Architecture:** Keep newsletter listing as a **Server Component** (`app/dashboard/page.tsx`). Pass **`needsFirstNewsletterOnboarding`** (`newsletters.length === 0`) into a small **client** dialog component. Centralize name/create state in a **`useNewsletterCreateFlow`** hook and shared presentational fields so inline and modal stay DRY. Use **`components/ui/dialog.tsx`** (controlled `open` / `onOpenChange`). Mirror the dashboard **`#create-newsletter`** anchor pattern with **`#new-issue`** on the newsletter detail page.

**Tech stack:** Next.js App Router (React 19), existing **`createNewsletter`** from `@/lib/mutation/newsletter-mutations`, Vitest for the small pure gate helper, ESLint + `next build` for verification.

**Spec:** `docs/superpowers/specs/2026-05-18-first-newsletter-onboarding-design.md`

---

## File map

| File | Responsibility |
| --- | --- |
| `lib/dashboard/first-newsletter-onboarding.ts` | Pure helper `needsFirstNewsletterOnboarding(count)` for the dashboard gate (tested). |
| `lib/dashboard/first-newsletter-onboarding.test.ts` | Vitest coverage for the gate helper. |
| `hooks/use-newsletter-create-flow.ts` | Client hook: name state, loading/error, submit handler calling `createNewsletter` + `router.push` to `/dashboard/newsletter/[id]`. |
| `components/dashboard/newsletter-name-create-fields.tsx` | Presentational name field + helper slug blurb + submit row props (accepts distinct `inputId` for a11y when two forms exist on one route). |
| `components/dashboard/create-newsletter-form.tsx` | Thin wrapper: `<form>` + hook + fields (`inputId="newsletter-name-inline"`). |
| `components/dashboard/first-newsletter-dialog.tsx` | Client dialog: `defaultOpen` prop, controlled `open` state, wraps same hook + fields (`inputId="newsletter-name-onboarding"`). |
| `app/dashboard/page.tsx` | Render `<FirstNewsletterDialog defaultOpen={needsFirstNewsletterOnboarding(newsletters.length)} />` near top of layout inside existing container. |
| `app/dashboard/newsletter/[id]/page.tsx` | Add hero CTA button linking to `#new-issue`; add `id="new-issue"` + `scroll-mt-24` on the **New issue** section wrapper. |

---

### Task 1: Gate helper — failing test

**Files:**
- Create: `lib/dashboard/first-newsletter-onboarding.test.ts`

- [ ] **Step 1: Add Vitest file**

```typescript
import { describe, expect, it } from "vitest";
import { needsFirstNewsletterOnboarding } from "./first-newsletter-onboarding";

describe("needsFirstNewsletterOnboarding", () => {
  it("returns true when count is zero", () => {
    expect(needsFirstNewsletterOnboarding(0)).toBe(true);
  });

  it("returns false when count is positive", () => {
    expect(needsFirstNewsletterOnboarding(1)).toBe(false);
    expect(needsFirstNewsletterOnboarding(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm exec vitest run lib/dashboard/first-newsletter-onboarding.test.ts`

Expected: FAIL — cannot find module `./first-newsletter-onboarding` or `needsFirstNewsletterOnboarding is not a function`.

---

### Task 2: Gate helper — implementation

**Files:**
- Create: `lib/dashboard/first-newsletter-onboarding.ts`

- [ ] **Step 1: Implement helper**

```typescript
/** Server-derived newsletter count for the signed-in user (dashboard list query). */
export function needsFirstNewsletterOnboarding(newsletterCount: number): boolean {
  return newsletterCount === 0;
}
```

- [ ] **Step 2: Run tests**

Run: `pnpm exec vitest run lib/dashboard/first-newsletter-onboarding.test.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard/first-newsletter-onboarding.ts lib/dashboard/first-newsletter-onboarding.test.ts
git commit -m "test: add first-newsletter onboarding gate helper"
```

---

### Task 3: Shared hook + presentational fields

**Files:**
- Create: `hooks/use-newsletter-create-flow.ts`
- Create: `components/dashboard/newsletter-name-create-fields.tsx`

- [ ] **Step 1: Add hook** (`hooks/use-newsletter-create-flow.ts`)

```typescript
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createNewsletter } from "@/lib/mutation/newsletter-mutations";

export function useNewsletterCreateFlow() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setError(null);
    setLoading(true);
    try {
      const newsletter = await createNewsletter({ name });
      router.push(`/dashboard/newsletter/${newsletter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create newsletter.");
    } finally {
      setLoading(false);
    }
  }

  return { name, setName, loading, error, onSubmit };
}
```

- [ ] **Step 2: Add presentational fields** (`components/dashboard/newsletter-name-create-fields.tsx`)

```tsx
"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type NewsletterNameCreateFieldsProps = {
  inputId: string;
  name: string;
  onNameChange: (value: string) => void;
  loading: boolean;
  error: string | null;
};

export function NewsletterNameCreateFields({
  inputId,
  name,
  onNameChange,
  loading,
  error,
}: NewsletterNameCreateFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Newsletter name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Coral Weekly"
            required
            aria-invalid={error ? true : undefined}
            disabled={loading}
            className="h-10 flex-1"
          />
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="h-10 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creating
              </>
            ) : (
              <>
                Create newsletter
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We&apos;ll generate a slug like{" "}
          <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
            /p/coral-weekly
          </span>{" "}
          you can edit later.
        </p>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `pnpm exec tsc --noEmit`

Expected: PASS (no new errors).

- [ ] **Step 4: Commit**

```bash
git add hooks/use-newsletter-create-flow.ts components/dashboard/newsletter-name-create-fields.tsx
git commit -m "feat(dashboard): shared newsletter name create hook and fields"
```

---

### Task 4: Refactor `CreateNewsletterForm`

**Files:**
- Modify: `components/dashboard/create-newsletter-form.tsx`

- [ ] **Step 1: Replace internals with hook + fields**

The component should match this shape (preserve outer `form` classes and `aria-busy`):

```tsx
"use client";

import { NewsletterNameCreateFields } from "@/components/dashboard/newsletter-name-create-fields";
import { useNewsletterCreateFlow } from "@/hooks/use-newsletter-create-flow";

export function CreateNewsletterForm() {
  const { name, setName, loading, error, onSubmit } = useNewsletterCreateFlow();

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-xl flex-col gap-3"
      aria-busy={loading}
    >
      <NewsletterNameCreateFields
        inputId="newsletter-name-inline"
        name={name}
        onNameChange={setName}
        loading={loading}
        error={error}
      />
    </form>
  );
}
```

Note: `onSubmit` from the hook is already `async`; wrapping with `void onSubmit(e)` in `handleSubmit` satisfies `FormEventHandler` typing if needed.

- [ ] **Step 2: Manual smoke**

Run dev server, visit `/dashboard` with an account that has newsletters: inline **Start a new newsletter** section still creates and redirects.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/create-newsletter-form.tsx
git commit -m "refactor(dashboard): reuse shared flow in CreateNewsletterForm"
```

---

### Task 5: `FirstNewsletterDialog`

**Files:**
- Create: `components/dashboard/first-newsletter-dialog.tsx`

- [ ] **Step 1: Implement dialog**

Use controlled state so dismissal persists until navigation/remount:

```tsx
"use client";

import { useState } from "react";
import { NewsletterNameCreateFields } from "@/components/dashboard/newsletter-name-create-fields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNewsletterCreateFlow } from "@/hooks/use-newsletter-create-flow";

export type FirstNewsletterDialogProps = {
  /** When true, dialog opens on mount (dashboard has zero newsletters). */
  defaultOpen: boolean;
};

export function FirstNewsletterDialog({ defaultOpen }: FirstNewsletterDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { name, setName, loading, error, onSubmit } = useNewsletterCreateFlow();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Name your newsletter</DialogTitle>
          <DialogDescription>
            Pick a working title—you can rename it anytime. We&apos;ll create your studio and public page.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3"
          aria-busy={loading}
        >
          <NewsletterNameCreateFields
            inputId="newsletter-name-onboarding"
            name={name}
            onNameChange={setName}
            loading={loading}
            error={error}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Radix `Dialog` closes on overlay/Escape via `onOpenChange`; `DialogContent` already includes a close button per `components/ui/dialog.tsx`.

- [ ] **Step 2: Run TypeScript**

Run: `pnpm exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/first-newsletter-dialog.tsx
git commit -m "feat(dashboard): first-newsletter onboarding dialog"
```

---

### Task 6: Wire dashboard page

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Import and render**

Near the top of the returned JSX (inside the outer `div`, after opening), add:

```tsx
import { FirstNewsletterDialog } from "@/components/dashboard/first-newsletter-dialog";
import { needsFirstNewsletterOnboarding } from "@/lib/dashboard/first-newsletter-onboarding";
```

Compute once after the Prisma query exists:

```tsx
const onboarding = needsFirstNewsletterOnboarding(newsletters.length);
```

In JSX:

```tsx
<FirstNewsletterDialog defaultOpen={onboarding} />
```

Keep the existing empty state and `#create-newsletter` section unchanged.

- [ ] **Step 2: Manual smoke — zero newsletters**

Sign in as user with **no** newsletters: dialog opens; submit creates and navigates to `/dashboard/newsletter/[id]`; back button behavior optional.

Dismiss dialog: empty state + inline form still work; **no duplicate `id` attributes** (inline vs onboarding).

- [ ] **Step 3: Manual smoke — has newsletters**

User with ≥1 newsletter: dialog must **not** open (`defaultOpen={false}`).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): open onboarding dialog when user has no newsletters"
```

---

### Task 7: Newsletter detail — hero CTA + anchor

**Files:**
- Modify: `app/dashboard/newsletter/[id]/page.tsx`

- [ ] **Step 1: Add `Button` import** from `@/components/ui/button` and **`Plus`** (or **`Sparkles`**) from `lucide-react` if not already imported.

- [ ] **Step 2: Add hero CTA** below the subtitle paragraph (`<p className="max-w-2xl text-sm text-muted-foreground">…`) and above the `HydrationBoundary`:

```tsx
<div className="flex flex-wrap gap-2">
  <Button asChild className="cursor-pointer">
    <a href="#new-issue">
      <Plus className="size-3.5" aria-hidden="true" />
      Start new issue
    </a>
  </Button>
</div>
```

Use `Plus` only if imported; align icon choice with dashboard **New newsletter** pattern.

- [ ] **Step 3: Anchor the section**

Change the **New issue** section opener from:

```tsx
<section className="flex flex-col gap-3">
```

to:

```tsx
<section id="new-issue" className="flex scroll-mt-24 flex-col gap-3">
```

(`scroll-mt-24` matches the dashboard `#create-newsletter` section offset.)

- [ ] **Step 4: Manual smoke**

From `/dashboard/newsletter/[id]`, click **Start new issue**: page scrolls to **Start a new issue** card; submitting still routes to topics.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/newsletter/[id]/page.tsx
git commit -m "feat(newsletter): hero link to new issue section"
```

---

### Task 8: Verification

- [ ] **Step 1: Lint**

Run: `pnpm run lint`

Expected: no new errors in touched files.

- [ ] **Step 2: Unit tests**

Run: `pnpm run test`

Expected: all tests pass including `first-newsletter-onboarding.test.ts`.

- [ ] **Step 3: Production build**

Run: `pnpm run build`

Expected: SUCCESS.

---

## Plan self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| Modal only when zero newsletters | Tasks 1–2 (explicit gate), Task 6 |
| Same `createNewsletter` + redirect | Task 3 hook |
| Dismissible; inline fallback | Task 5 (`onOpenChange`), Task 6 |
| No duplicate IDs | Task 3 `inputId`, Tasks 4–5 distinct ids |
| Hero **Start new issue** → `#new-issue` | Task 7 |
| `Dialog` not `AlertDialog` | Task 5 |

**Placeholder scan:** None intentional; all file paths and code blocks are concrete.

**Type consistency:** `needsFirstNewsletterOnboarding` accepts `number`; dashboard passes `newsletters.length`. Hook returns match field props.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-18-first-newsletter-onboarding.md`.

**Execution options:**

1. **Subagent-driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration. Use **subagent-driven-development**.

2. **Inline execution** — Run tasks in this chat with **executing-plans**, batched with checkpoints.

Which approach do you want?
