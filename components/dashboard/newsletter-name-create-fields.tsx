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
