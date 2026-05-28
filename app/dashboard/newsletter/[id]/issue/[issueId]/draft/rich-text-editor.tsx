"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
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
import { notionDocumentProse } from "./document-prose";

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
        "inline-flex size-7 items-center justify-center rounded-md text-sm transition-colors duration-150 cursor-pointer",
        active
          ? "bg-neutral-200/90 text-neutral-900"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
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
    <div className="sticky top-0 z-10 flex justify-center border-b border-neutral-100 bg-white/80 px-4 py-2.5 backdrop-blur-sm">
      <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-neutral-200/80 bg-white px-1.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-0.5">
          <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <Bold className="size-3.5" />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <Italic className="size-3.5" />
          </MenuButton>
        </div>
        <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
        <div className="flex items-center gap-0.5">
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
            <Heading1 className="size-3.5" />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
            <Heading2 className="size-3.5" />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
            <Heading3 className="size-3.5" />
          </MenuButton>
        </div>
        <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
        <div className="flex items-center gap-0.5">
          <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <List className="size-3.5" />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <ListOrdered className="size-3.5" />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
            <Quote className="size-3.5" />
          </MenuButton>
        </div>
        <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
        <MenuButton onClick={addLink} active={editor.isActive("link")} title="Link">
          <Link className="size-3.5" />
        </MenuButton>
        <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
        <div className="flex items-center gap-0.5">
          <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo2 className="size-3.5" />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo2 className="size-3.5" />
          </MenuButton>
        </div>
      </div>
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  variant = "default",
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variant?: "default" | "canvas";
}) {
  const isCanvas = variant === "canvas";

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-neutral-900 underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-500",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start writing, or press / for commands…",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          notionDocumentProse,
          "focus:outline-none",
          isCanvas
            ? "notion-editor mx-auto min-h-[70vh] max-w-[680px] px-8 py-10 sm:px-12 sm:py-14"
            : "min-h-96 px-4 py-3 text-sm",
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (isCanvas) {
    return (
      <div className="notion-editor-shell flex min-h-0 flex-1 flex-col bg-white">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
