# Draft Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live rendered preview panel to the Final Review draft page with side-by-side edit+preview on desktop, Desktop/Mobile preview framing, and Edit/Preview toggle on mobile.

**Architecture:** Debounce TipTap `editorHtml` and pass it to a new `DraftPreview` component that wraps existing `IssueMarkdown` for public-parity rendering. Restructure `draft-editor.tsx` into a two-column layout; move device toggle from editor to preview; add mobile-only view mode state.

**Tech Stack:** React 19, TipTap, Tailwind CSS v4, Vitest, existing `IssueMarkdown` component

**Spec:** `docs/superpowers/specs/2026-05-24-draft-live-preview-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/use-debounced-value.ts` | Generic debounce hook for preview input |
| `lib/use-debounced-value.test.ts` | Hook unit tests |
| `draft-preview.tsx` | Read-only preview card + device frame + subject header |
| `draft-editor.tsx` | Layout orchestration, state, wires editor ↔ preview ↔ settings |

---

### Task 1: Debounce hook

**Files:**
- Create: `lib/use-debounced-value.ts`
- Create: `lib/use-debounced-value.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/use-debounced-value.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useDebouncedValue } from "./use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 150));
    expect(result.current).toBe("hello");
  });

  it("debounces updates", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 150),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("ab");
  });
});
```

- [ ] **Step 2: Install test dependency if missing**

```bash
pnpm add -D @testing-library/react
```

Skip if already present in `package.json`.

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test lib/use-debounced-value.test.ts
```

Expected: FAIL — module `./use-debounced-value` not found.

- [ ] **Step 4: Implement hook**

Create `lib/use-debounced-value.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test lib/use-debounced-value.test.ts
```

Expected: 2 tests passed.

---

### Task 2: DraftPreview component

**Files:**
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-preview.tsx`

- [ ] **Step 1: Create component**

Create `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-preview.tsx`:

```tsx
"use client";

import { Monitor, Smartphone } from "lucide-react";
import { IssueMarkdown } from "@/app/p/[slug]/i/[issueSlug]/issue-markdown";
import { cn } from "@/lib/utils";

type PreviewDevice = "desktop" | "mobile";

function DeviceToggle({
  device,
  onChange,
}: {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
}) {
  return (
    <div className="flex rounded bg-[var(--intel-surface-container-low)] p-1">
      <button
        type="button"
        onClick={() => onChange("desktop")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 font-[family-name:var(--font-orch-body)] text-orch-label-md transition-colors",
          device === "desktop"
            ? "bg-[var(--intel-surface-container-lowest)] text-[var(--intel-on-surface)] shadow-sm"
            : "text-[var(--intel-on-surface-variant)] hover:text-[var(--intel-on-surface)]",
        )}
      >
        <Monitor className="size-4" />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 font-[family-name:var(--font-orch-body)] text-orch-label-md transition-colors",
          device === "mobile"
            ? "bg-[var(--intel-surface-container-lowest)] text-[var(--intel-on-surface)] shadow-sm"
            : "text-[var(--intel-on-surface-variant)] hover:text-[var(--intel-on-surface)]",
        )}
      >
        <Smartphone className="size-4" />
        Mobile
      </button>
    </div>
  );
}

export function DraftPreview({
  html,
  subject,
  device,
  onDeviceChange,
}: {
  html: string;
  subject: string;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
}) {
  const hasContent = html.replace(/<[^>]+>/g, "").trim().length > 0;

  return (
    <div className="rounded-xl border border-[var(--intel-surface-container-high)] bg-[var(--intel-surface-container-lowest)] p-4 shadow-[0_4px_24px_rgba(9,20,38,0.02)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-[family-name:var(--font-orch-heading)] text-lg text-[var(--intel-on-surface)]">
          Live Preview
        </h3>
        <DeviceToggle device={device} onChange={onDeviceChange} />
      </div>

      <div className="overflow-auto rounded-lg border border-[var(--intel-surface-container-high)] bg-[var(--intel-surface-bright)] p-4">
        <div
          className={cn(
            "mx-auto transition-[max-width] duration-200",
            device === "desktop" ? "max-w-[650px]" : "max-w-[375px]",
          )}
        >
          {subject ? (
            <p className="mb-4 border-b border-[var(--intel-surface-container-high)] pb-3 font-[family-name:var(--font-orch-heading)] text-orch-h3 text-[var(--intel-on-surface)]">
              {subject}
            </p>
          ) : null}

          {hasContent ? (
            <IssueMarkdown source={html} />
          ) : (
            <p className="py-8 text-center font-[family-name:var(--font-orch-body)] text-orch-body-sm text-[var(--intel-on-surface-variant)]">
              Preview will appear as you write…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

---

### Task 3: Restructure draft-editor layout

**Files:**
- Modify: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-editor.tsx`

- [ ] **Step 1: Add imports and state**

At top of `draft-editor.tsx`, add:

```typescript
import { DraftPreview } from "./draft-preview";
import { useDebouncedValue } from "@/lib/use-debounced-value";
```

Inside `DraftEditorFields`, replace `previewMode` state with:

```typescript
const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
const debouncedHtml = useDebouncedValue(editorHtml, 150);
```

Remove any `previewMode === "mobile"` classes from the editor wrapper.

- [ ] **Step 2: Add mobile Edit/Preview toggle**

Below the Final Review header block (word count line), add a control visible only below `lg`:

```tsx
<div className="flex rounded bg-[var(--intel-surface-container-low)] p-1 lg:hidden">
  <button
    type="button"
    onClick={() => setMobilePane("edit")}
    className={cn(
      "flex-1 rounded py-1.5 font-[family-name:var(--font-orch-body)] text-orch-label-md transition-colors",
      mobilePane === "edit"
        ? "bg-[var(--intel-surface-container-lowest)] text-[var(--intel-on-surface)] shadow-sm"
        : "text-[var(--intel-on-surface-variant)]",
    )}
  >
    Edit
  </button>
  <button
    type="button"
    onClick={() => setMobilePane("preview")}
    className={cn(
      "flex-1 rounded py-1.5 font-[family-name:var(--font-orch-body)] text-orch-label-md transition-colors",
      mobilePane === "preview"
        ? "bg-[var(--intel-surface-container-lowest)] text-[var(--intel-on-surface)] shadow-sm"
        : "text-[var(--intel-on-surface-variant)]",
    )}
  >
    Preview
  </button>
</div>
```

- [ ] **Step 3: Change grid to two equal columns on desktop**

Replace outer grid class:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-[var(--spacing-intel-gutter)]">
```

Left column: `lg:col-span-1` (remove `lg:col-span-8`).  
Right column: `lg:col-span-1` (remove `lg:col-span-4`).

- [ ] **Step 4: Conditionally show editor on mobile**

Wrap the editor block (empty state + RichTextEditor) with:

```tsx
<div className={cn(mobilePane === "preview" && "hidden lg:block")}>
  {/* existing editor content */}
</div>
```

Remove `previewMode === "mobile" && "mx-auto max-w-sm"` from editor container.

- [ ] **Step 5: Add preview to right column**

In the `<aside>`, **above** Publishing Settings, add:

```tsx
<div className={cn("mb-6", mobilePane === "edit" && "hidden lg:block")}>
  <DraftPreview
    html={debouncedHtml}
    subject={subject}
    device={previewDevice}
    onDeviceChange={setPreviewDevice}
  />
</div>
```

- [ ] **Step 6: Remove Device Preview from Publishing Settings**

Delete the entire "Device Preview" block (label + Desktop/Mobile buttons) from the Publishing Settings section — it now lives in `DraftPreview`.

- [ ] **Step 7: Typecheck and manual smoke test**

```bash
pnpm exec tsc --noEmit
pnpm run dev
```

Manual checks:
1. Desktop: editor left, preview right; typing updates preview after brief delay.
2. Desktop/Mobile toggles preview width only.
3. Narrow viewport: Edit/Preview toggle switches main pane; settings still visible.

---

### Task 4: Verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass including `use-debounced-value.test.ts`.

- [ ] **Step 2: Run typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Live preview matches `IssueMarkdown` | Task 2 |
| Side-by-side on desktop | Task 3 (grid) |
| Desktop/Mobile on preview pane | Task 2 `DeviceToggle`, Task 3 wiring |
| Edit/Preview on mobile | Task 3 Step 2 + 4 + 5 |
| Subject above preview body | Task 2 |
| Debounced preview updates | Task 1 + Task 3 |
| Editor not shrunk by device toggle | Task 3 Step 4 |
| Publishing settings below preview | Task 3 Step 5 |
| Empty draft placeholder | Task 2 |

**Placeholder scan:** No TBD/TODO in plan steps.  
**Type consistency:** `PreviewDevice` type used in both `DraftPreview` and `draft-editor` state.  
**Gap:** None identified.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-05-24-draft-live-preview.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement all tasks in this session with checkpoints

Which approach would you like?
