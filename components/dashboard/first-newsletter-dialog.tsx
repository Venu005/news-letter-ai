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
