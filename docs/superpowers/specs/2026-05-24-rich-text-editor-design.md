# Rich Text Editor for Draft Page

**Date:** 2026-05-24

## Summary

Replace the raw markdown `<Textarea>` on the draft page with a TipTap-based rich text WYSIWYG editor. Users format content inline with a toolbar (bold, italic, headings, links, lists) instead of writing raw markdown. Writer agent output is automatically inserted as formatted content. Storage switches from markdown to HTML.

## Architecture

**Dependencies:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `marked`

**Storage:** The `finalDraft` column switches from storing markdown to storing HTML. TipTap outputs HTML natively. Writer agent output (markdown) is converted to HTML via `marked` before insertion.

**Public rendering:** The public page (`/p/[slug]/i/[issueSlug]`) currently uses `Streamdown` to render markdown. Since we now store HTML, rendering switches to `dangerouslySetInnerHTML` with sanitization.

## Components

### RichTextEditor

New component in `app/dashboard/newsletter/[id]/issue/[issueId]/draft/rich-text-editor.tsx`.

Wraps TipTap's `useEditor` hook:

- **Toolbar:** Bold, Italic, H1, H2, H3, Bullet List, Ordered List, Link, Blockquote, Undo, Redo
- **Editor area:** TipTap `EditorContent` with Tailwind prose styling matching the current card design
- **Props:** `content: string` (HTML), `onChange: (html: string) => void`, `placeholder?: string`
- **Generate integration:** When the writer agent returns markdown, convert to HTML via `marked.parse()` and insert via `editor.commands.setContent(html)`

### Draft Editor Changes

In `draft-editor.tsx`:

- Replace `<Textarea>` with `<RichTextEditor>`
- Change `draftText` state from markdown string to HTML string
- On "Generate from topics" success: convert `result.draft` (markdown) to HTML via `marked.parse()` before `setDraftText()`
- On save/publish: send HTML string (unchanged, same `finalDraft` column)
- Remove `font-mono` styling since rich text is no longer monospace

### Public Page Changes

In `app/p/[slug]/i/[issueSlug]/page.tsx`:

- Replace `Streamdown` rendering with `dangerouslySetInnerHTML` or a simple HTML container
- The `finalDraft` field now contains HTML instead of markdown
- Backwards compatibility: if `finalDraft` starts with `<` (HTML tag), render as HTML; otherwise, wrap in `<pre>` or run through `marked` as fallback

## Files Changed

| File | Change |
|------|--------|
| `app/dashboard/newsletter/[id]/issue/[issueId]/draft/rich-text-editor.tsx` | **New** — TipTap editor component |
| `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-editor.tsx` | Replace `<Textarea>` with `<RichTextEditor>`, convert markdown→HTML on generate |
| `app/p/[slug]/i/[issueSlug]/page.tsx` | Render HTML instead of markdown |
| `package.json` | Add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `marked` |

## Files Not Changed

- `app/api/issues/[id]/draft/route.ts` — writer agent still returns markdown, conversion happens on frontend
- `app/api/issues/[id]/route.ts` — PATCH still saves `finalDraft` (now HTML)
- `prisma/schema.prisma` — no schema changes
- `mastra/agents/writer.ts` — unchanged, still outputs markdown
- `components/dashboard/issue-stepper.tsx` — unchanged

## Edge Cases

- **Initial load with empty draft:** Editor shows placeholder text
- **Generate overwrites existing content:** Same behavior as current — `editor.commands.setContent()` replaces everything
- **Old markdown issues:** Public page detects if `finalDraft` is HTML (starts with `<`) or legacy markdown, renders accordingly
- **User pastes external content:** TipTap's paste handler strips external formatting by default
- **Empty editor on save:** Allowed — saves empty HTML string

## Testing Strategy

- Manual: Open draft page, verify toolbar works, generate from topics, verify rendered output, save, open on public page
- Manual: Paste content from external source, verify formatting is clean
- Manual: Load a new issue with empty draft, verify placeholder shows
