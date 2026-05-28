"use client";

import { Monitor, Smartphone } from "lucide-react";
import { IssueMarkdown } from "@/app/p/[slug]/i/[issueSlug]/issue-markdown";
import { cn } from "@/lib/utils";
import { notionDocumentProse } from "./document-prose";

type PreviewDevice = "desktop" | "mobile";

function DeviceToggle({
  device,
  onChange,
}: {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
}) {
  return (
    <div className="inline-flex rounded-md bg-neutral-100/80 p-0.5">
      <button
        type="button"
        onClick={() => onChange("desktop")}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
          device === "desktop"
            ? "bg-white text-neutral-900 shadow-sm"
            : "text-neutral-500 hover:text-neutral-800",
        )}
      >
        <Monitor className="size-3.5" />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors",
          device === "mobile"
            ? "bg-white text-neutral-900 shadow-sm"
            : "text-neutral-500 hover:text-neutral-800",
        )}
      >
        <Smartphone className="size-3.5" />
        Mobile
      </button>
    </div>
  );
}

export function DraftPreview({
  html,
  device,
  onDeviceChange,
}: {
  html: string;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
}) {
  const hasContent = html.replace(/<[^>]+>/g, "").trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          Preview
        </span>
        <DeviceToggle device={device} onChange={onDeviceChange} />
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-lg bg-neutral-100/60 p-4 sm:p-6">
        <div
          className={cn(
            "w-full shrink-0 rounded-sm bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-[max-width] duration-200",
            device === "desktop" ? "max-w-[680px]" : "max-w-[390px]",
          )}
        >
          <div className="px-8 py-10 sm:px-12 sm:py-14">
            {hasContent ? (
              <IssueMarkdown source={html} className={notionDocumentProse} />
            ) : (
              <p className="py-16 text-center text-sm text-neutral-400">
                Your rendered newsletter will appear here…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
