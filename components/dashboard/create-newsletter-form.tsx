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
