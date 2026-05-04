import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NewsletterNotFoundError,
  fetchNewsletterDetail,
} from "./fetch-newsletter-detail";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchNewsletterDetail", () => {
  it("returns parsed JSON on 200", async () => {
    const body = {
      newsletter: {
        id: "n1",
        niche: "tech",
        mastraThreadId: null,
        status: "REVIEWING",
        finalDraft: null,
        slug: null,
        displayName: null,
        tagline: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      topics: [
        {
          id: "t1",
          title: "A",
          summary: "S",
          sourceUrl: "https://example.com",
          isApproved: true,
          newsletterId: "n1",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
      }),
    );

    const result = await fetchNewsletterDetail("n1");
    expect(result.newsletter.id).toBe("n1");
    expect(result.topics).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/newsletters/n1",
      expect.objectContaining({ signal: undefined }),
    );
  });

  it("throws NewsletterNotFoundError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Newsletter not found." }),
      }),
    );

    await expect(fetchNewsletterDetail("missing")).rejects.toBeInstanceOf(
      NewsletterNotFoundError,
    );
  });

  it("throws Error on other non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    );

    await expect(fetchNewsletterDetail("x")).rejects.toThrow(/Could not load/);
  });
});
