# Medium-Style Article Typography

**Date:** 2026-05-28

## Summary

Update the TipTap editor's canvas mode and the public article page to use Medium.com-style typography: generous max-width (~680px), larger serif body text (~21px), comfortable line-height, and refined heading hierarchy. The project already has `Instrument_Serif` loaded — a literary serif that closely matches Medium's Charter/Georgia aesthetic.

## Changes

### `document-prose.ts`

Update `notionDocumentProse` for Medium body proportions:

- Body: `text-[21px] leading-[1.6]` (up from 15px/1.75)
- H1: `text-[34px] leading-[1.15]` with more bottom margin
- H2: `text-[26px] leading-[1.2]`
- H3: `text-[22px] leading-[1.25]`
- Paragraph spacing: increase `my-` from 2 to 6-8 for breathing room
- Link: remove underline, use color accent instead
- Blockquote: left border with italic, lighter weight
- Keep sans-serif for headings (`font-orch-heading`), serif for body (`font-instrument-serif`)

### `issue-markdown.tsx`

Update the `articleClass` to use the same Medium proportions — or better, reuse `notionDocumentProse` directly to keep editor and published output identical.

Update body font to `var(--font-instrument-serif)` instead of `var(--font-hero-body)`.

### Files

| File | Change |
|------|--------|
| `app/dashboard/.../draft/document-prose.ts` | Update prose classes for Medium typography |
| `app/p/[slug]/i/[issueSlug]/issue-markdown.tsx` | Use `notionDocumentProse` + serif font |

## Edge Cases

- Dark mode: `prose-invert` handles this — headlines stay readable, body text gets appropriate contrast
- Mobile: `max-w-[680px]` with `mx-auto` and responsive padding already handled by the canvas
- Links: Already styled via `prose-a` — just shift from underline to color-based distinction
