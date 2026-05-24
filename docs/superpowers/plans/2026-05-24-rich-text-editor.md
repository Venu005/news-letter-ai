# Rich Text Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw markdown `<Textarea>` on the draft page with a TipTap-based WYSIWYG rich text editor with toolbar, supporting inline formatting and automatic insertion of writer agent output.

**Architecture:** Add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, and `marked`. Create a `RichTextEditor` component wrapping TipTap. Replace the `<Textarea>` in `draft-editor.tsx`. Convert writer agent markdown to HTML via `marked` on generate. Update public page to render HTML with legacy markdown fallback.

**Tech Stack:** TipTap (ProseMirror-based), `marked` for markdown→HTML, Next.js App Router, Tailwind CSS

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add TipTap and marked**

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-link marked
```

- [ ] **Step 2: Verify install**

```bash
pnpm ls @tiptap/react @tiptap/starter-kit @tiptap/extension-link marked
```

Expected: all four packages appear in the dependency tree.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add tiptap and marked for rich text editor"
```

---

### Task 2: Create RichTextEditor Component

**Files:**
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/rich-text-editor.tsx`

- [ ] **Step 1: Create the component**

Create `app/dashboard/newsletter/[id]/issue/[issueId]/draft/rich-text-editor.tsx`:

```typescript
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function MenuButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors duration-200 cursor-pointer",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
      <div className="flex items-center gap-0.5 pr-2 mr-2 border-r border-border">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="size-3.5" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="size-3.5" />
        </MenuButton>
      </div>
      <div className="flex items-center gap-0.5 pr-2 mr-2 border-r border-border">
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="size-3.5" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="size-3.5" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="size-3.5" />
        </MenuButton>
      </div>
      <div className="flex items-center gap-0.5 pr-2 mr-2 border-r border-border">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="size-3.5" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered className="size-3.5" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="size-3.5" />
        </MenuButton>
      </div>
      <div className="flex items-center gap-0.5 pr-2 mr-2 border-r border-border">
        <MenuButton onClick={addLink} active={editor.isActive("link")} title="Link">
          <Link className="size-3.5" />
        </MenuButton>
      </div>
      <div className="flex items-center gap-0.5">
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="size-3.5" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="size-3.5" />
        </MenuButton>
      </div>
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-foreground underline underline-offset-4 cursor-pointer hover:text-foreground/70",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-neutral max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-p:leading-relaxed dark:prose-invert focus:outline-none min-h-96 px-4 py-3 text-sm",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors related to rich-text-editor.tsx.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/newsletter/
git commit -m "feat: add TipTap rich text editor component"
```

---

### Task 3: Update Draft Editor

**Files:**
- Modify: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-editor.tsx`

- [ ] **Step 1: Replace Textarea with RichTextEditor, add marked, fix word count**

In `draft-editor.tsx`:

Add import at top:
```typescript
import { marked } from "marked";
import { RichTextEditor } from "./rich-text-editor";
```

Update `countWords` to strip HTML tags:
```typescript
function countWords(text: string) {
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).length;
}
```

Update `DraftEditorFields` — change `draftText` is now HTML. On generate success, convert markdown to HTML:

```typescript
const generateMutation = useMutation({
  mutationFn: () => generateDraft({ issueId }),
  onSuccess: (result) => {
    setDraftText(marked.parse(result.draft) as string);
    setPublishOk(null);
    void invalidate();
  },
});
```

Replace the `<Textarea>` block:
```typescript
// Remove:
<label htmlFor="draft-markdown" className="sr-only">
  Markdown draft
</label>
<Textarea
  id="draft-markdown"
  rows={20}
  className="min-h-112 resize-y rounded-none border-0 bg-transparent font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
  value={draftText}
  onChange={(e) => setDraftText(e.target.value)}
  placeholder="# Your headline\n\nStart writing your issue in markdown…"
  spellCheck
/>

// Replace with:
<RichTextEditor
  content={draftText}
  onChange={setDraftText}
  placeholder="Start writing your issue…"
/>
```

Also remove the `Textarea` import since it's no longer used (remove `import { Textarea } from "@/components/ui/textarea";`).

- [ ] **Step 2: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/newsletter/
git commit -m "feat: replace markdown textarea with rich text editor on draft page"
```

---

### Task 4: Update Public Page for HTML Content

**Files:**
- Modify: `app/p/[slug]/i/[issueSlug]/issue-markdown.tsx`
- Modify: `app/p/[slug]/i/[issueSlug]/page.tsx`

- [ ] **Step 1: Update IssueMarkdown to handle HTML**

In `issue-markdown.tsx`, replace:

```typescript
"use client";

import { Streamdown } from "streamdown";

export function IssueMarkdown({ source }: { source: string }) {
  return (
    <article
      className="prose prose-neutral max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-foreground prose-a:underline-offset-4 prose-a:transition-colors hover:prose-a:text-foreground/70 prose-img:rounded-xl prose-img:border prose-img:border-border dark:prose-invert"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <Streamdown mode="static">{source}</Streamdown>
    </article>
  );
}
```

With:

```typescript
import { Streamdown } from "streamdown";

function isHtml(content: string): boolean {
  return /^\s*</.test(content);
}

export function IssueMarkdown({ source }: { source: string }) {
  if (isHtml(source)) {
    return (
      <article
        className="prose prose-neutral max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-foreground prose-a:underline-offset-4 prose-a:transition-colors hover:prose-a:text-foreground/70 prose-img:rounded-xl prose-img:border prose-img:border-border dark:prose-invert"
        style={{ fontFamily: "var(--font-hero-body)" }}
        dangerouslySetInnerHTML={{ __html: source }}
      />
    );
  }

  return (
    <article
      className="prose prose-neutral max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-foreground prose-a:underline-offset-4 prose-a:transition-colors hover:prose-a:text-foreground/70 prose-img:rounded-xl prose-img:border prose-img:border-border dark:prose-invert"
      style={{ fontFamily: "var(--font-hero-body)" }}
    >
      <Streamdown mode="static">{source}</Streamdown>
    </article>
  );
}
```

Remove `"use client"` since `dangerouslySetInnerHTML` is a server-compatible prop (no hooks needed for HTML path). The `Streamdown` path still needs client rendering — actually, `Streamdown` requires `"use client"`. Keep it as a client component.

- [ ] **Step 2: Update readingTime in page.tsx**

In `app/p/[slug]/i/[issueSlug]/page.tsx`, update the `readingTime` function:

```typescript
function readingTime(text: string) {
  const stripped = text.replace(/<[^>]+>/g, "").trim();
  const words = stripped.split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
```

- [ ] **Step 3: Verify build compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/p/
git commit -m "feat: render HTML content on public page with legacy markdown fallback"
```

---

### Task 5: Run Tests and Final Verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests pass.

- [ ] **Step 2: Run full build**

```bash
pnpm build
```

Expected: successful build.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

1. Navigate to a newsletter, create a new issue
2. After research completes, continue to draft
3. Click "Generate from topics" — verify writer output appears as formatted rich text
4. Use toolbar to format text (bold, headings, lists, etc.)
5. Save draft, refresh page — verify content persists
6. Publish, open public page — verify formatted content renders correctly

- [ ] **Step 4: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "chore: final cleanup and verification"
```
