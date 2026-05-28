# Draft Live Preview Panel

**Date:** 2026-05-24  
**Status:** Approved  
**Related:** `2026-05-24-rich-text-editor-design.md`, Orchestra Final Review UI

## Summary

Add a **live rendered preview** to the Final Review (draft) page so authors see how their newsletter will look to readers while editing. Desktop shows **editor left + preview right** side-by-side. The preview pane has a **Desktop / Mobile** width toggle. On small screens, an **Edit / Preview** toggle switches the main content area because side-by-side is too cramped.

## Problem

The current **Device Preview** toggle only narrows the TipTap editor canvas. It does not render the draft as readers see it on the public issue page. Authors must publish or open the public URL to verify formatting.

## Goals

1. Show a **live preview** that matches public issue rendering (`IssueMarkdown`).
2. Keep the **editor always available** on desktop (side-by-side).
3. **Desktop / Mobile** toggles control preview frame width, not the editor.
4. On viewports below `lg`, provide **Edit / Preview** toggle for the main column.
5. Display the **subject line** above the preview body (email-style header).

## Non-Goals

- Gmail/Outlook email-client simulation
- Separate HTML email template generation
- Preview in a new browser tab
- WYSIWYG editing inside the preview pane (read-only)

## Architecture

### Data flow

```
TipTap editorHtml (HTML, live)
        │
        ├─► onChange → parent state (unchanged save/publish path)
        │
        └─► debounce 150ms → DraftPreview html prop
                                    │
                                    └─► IssueMarkdown (same as /p/[slug]/i/[issueSlug])
```

Storage is unchanged: save/publish still converts HTML → markdown via `editorHtmlToDraft()`. Preview reads **editor HTML directly** (not markdown round-trip) for accuracy while typing.

### Layout

**Desktop (`lg+`):**

| Column | Width | Content |
|--------|-------|---------|
| Left | 6/12 | Final Review header, alerts, TipTap editor (full width, no device shrink) |
| Right | 6/12 | Live Preview card (Desktop/Mobile toggle) → Publishing Settings card below |

**Mobile / tablet (`< lg`):**

- Top: Final Review header + **Edit | Preview** segmented control
- **Edit mode:** TipTap editor visible, preview hidden
- **Preview mode:** `DraftPreview` visible, editor hidden
- Publishing Settings always visible below (full width)

### Components

#### `DraftPreview` (new)

Path: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-preview.tsx`

Props:

| Prop | Type | Description |
|------|------|-------------|
| `html` | `string` | TipTap HTML to render |
| `subject` | `string` | Subject line shown above body |
| `device` | `"desktop" \| "mobile"` | Frame width mode |

Behavior:

- Empty `html`: show muted placeholder (“Preview will appear as you write…”)
- Wrap content in Orchestra-styled card matching Final Review canvas
- **Desktop frame:** `max-w-[650px]` centered (matches public article + mockup)
- **Mobile frame:** `max-w-[375px]` centered, optional subtle phone border
- Subject rendered as `h2`-sized heading above `IssueMarkdown` body
- Read-only; no click handlers on links required for v1 (links may remain clickable)

#### `useDebouncedValue` (new)

Path: `lib/use-debounced-value.ts`

Generic hook: `useDebouncedValue<T>(value: T, delayMs: number): T`  
Used in `draft-editor.tsx` to debounce preview updates during fast typing.

#### `DevicePreviewToggle` (new, optional extract)

Small presentational component for Desktop/Mobile pill toggle. Can live inside `draft-preview.tsx` or `draft-editor.tsx` if under ~40 lines.

### Changes to `draft-editor.tsx`

1. Remove `previewMode` from editor wrapper (editor no longer shrinks).
2. Add `mobileView: "edit" | "preview"` state for `< lg` only.
3. Add `previewDevice: "desktop" | "mobile"` state for preview pane.
4. Debounce `editorHtml` → `debouncedHtml` for preview.
5. Restructure grid: `lg:grid-cols-2` with preview above settings in right column.
6. Move **Device Preview** toggle from Publishing Settings into **Live Preview** card header.
7. Add **Edit | Preview** toggle visible only below `lg` breakpoint.

### Reuse

- `IssueMarkdown` from `app/p/[slug]/i/[issueSlug]/issue-markdown.tsx` — handles HTML and legacy markdown.
- Orchestra intel CSS variables and typography classes already used on draft page.

## Files

| File | Change |
|------|--------|
| `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-preview.tsx` | **New** — preview panel |
| `lib/use-debounced-value.ts` | **New** — debounce hook |
| `lib/use-debounced-value.test.ts` | **New** — unit test |
| `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-editor.tsx` | Layout restructure, wire preview |
| `app/dashboard/newsletter/[id]/issue/[issueId]/draft/rich-text-editor.tsx` | No change expected |

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty draft | Editor shows empty state; preview shows placeholder |
| Generating draft | Editor shows loading; preview updates when HTML arrives |
| Fast typing | Preview debounced 150ms; no jank |
| Legacy markdown in DB | `draftToEditorHtml` converts on load; preview receives HTML |
| Very long draft | Preview scrolls inside card; sticky settings remain below on desktop |
| Subject edited | Preview header updates immediately (not debounced) |

## Testing Strategy

1. **Unit:** `useDebouncedValue` delays updates correctly (vitest + fake timers).
2. **Manual desktop:** Edit bold/headings/lists; preview updates within ~200ms.
3. **Manual desktop:** Desktop/Mobile toggle changes preview width only; editor width unchanged.
4. **Manual mobile:** Edit/Preview toggle switches main area; settings remain accessible.
5. **Manual parity:** Compare preview to published public issue page for same draft.

## Spec Self-Review

| Check | Result |
|-------|--------|
| Placeholder scan | No TBD sections; all props and paths defined |
| Internal consistency | Preview uses HTML from editor; save path unchanged (markdown in DB) |
| Scope | Single feature, one page; no unrelated refactors |
| Ambiguity | Edit/Preview is mobile-only; Desktop/Mobile is preview-only — explicit |
| Option C coverage | Side-by-side ✓, device toggle on preview ✓, mobile Edit/Preview ✓ |

**Note:** Importing `IssueMarkdown` from `app/p/...` crosses route groups. Acceptable for v1; extract to `components/issue/issue-content.tsx` only if lint rules forbid cross-import.
