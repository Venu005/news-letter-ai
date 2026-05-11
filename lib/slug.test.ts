import { describe, expect, it } from "vitest";
import { allocateIssueSlug } from "./slug";

describe("allocateIssueSlug", () => {
  it("returns the slugified base on first attempt when free", async () => {
    const slug = await allocateIssueSlug("Heat pumps go mainstream", async () => false);
    expect(slug).toBe("heat-pumps-go-mainstream");
  });

  it("retries with a nanoid suffix on collision", async () => {
    let calls = 0;
    const slug = await allocateIssueSlug("Hello", async (candidate) => {
      calls += 1;
      return candidate === "hello";
    });
    expect(slug.startsWith("hello-")).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("falls back to 'issue' base when input has no usable characters", async () => {
    const slug = await allocateIssueSlug("!!", async () => false);
    expect(slug).toBe("issue");
  });
});
