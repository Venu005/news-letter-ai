import { describe, expect, it } from "vitest";
import { newsletterDetailQueryKey } from "./newsletter-keys";

describe("newsletterDetailQueryKey", () => {
  it("returns a tuple with newsletter id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(newsletterDetailQueryKey(id)).toEqual(["newsletter", "detail", id]);
  });

  it("returns new array reference each call", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(newsletterDetailQueryKey(id)).not.toBe(newsletterDetailQueryKey(id));
  });
});
