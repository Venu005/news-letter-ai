import { describe, expect, it } from "vitest";
import { needsFirstNewsletterOnboarding } from "./first-newsletter-onboarding";

describe("needsFirstNewsletterOnboarding", () => {
  it("returns true when count is zero", () => {
    expect(needsFirstNewsletterOnboarding(0)).toBe(true);
  });

  it("returns false when count is positive", () => {
    expect(needsFirstNewsletterOnboarding(1)).toBe(false);
    expect(needsFirstNewsletterOnboarding(42)).toBe(false);
  });
});
