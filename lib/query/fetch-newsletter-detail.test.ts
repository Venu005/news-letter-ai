import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NewsletterNotFoundError,
  fetchNewsletterDetail,
} from "./fetch-newsletter-detail";

const ORIGINAL_FETCH = global.fetch;
afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("fetchNewsletterDetail", () => {
  it("returns newsletter + issues on 200", async () => {
    mockFetchOnce(200, {
      newsletter: {
        id: "n1",
        name: "Coral Weekly",
        slug: "coral-weekly",
        tagline: null,
        createdAt: "2026-05-11T00:00:00.000Z",
        updatedAt: "2026-05-11T00:00:00.000Z",
      },
      issues: [
        {
          id: "i1",
          newsletterId: "n1",
          niche: "climate",
          title: "Heat pumps",
          status: "PUBLISHED",
          slug: "heat-pumps",
          publishedAt: "2026-05-11T00:00:00.000Z",
          updatedAt: "2026-05-11T00:00:00.000Z",
        },
      ],
    });

    const result = await fetchNewsletterDetail("n1");
    expect(result.newsletter.name).toBe("Coral Weekly");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].status).toBe("PUBLISHED");
  });

  it("throws NewsletterNotFoundError on 404", async () => {
    mockFetchOnce(404, { error: "Newsletter not found." });
    await expect(fetchNewsletterDetail("missing")).rejects.toBeInstanceOf(
      NewsletterNotFoundError,
    );
  });

  it("throws generic Error on malformed payload", async () => {
    mockFetchOnce(200, { newsletter: { id: "n1" } }); // missing issues array
    await expect(fetchNewsletterDetail("n1")).rejects.toThrow(/Invalid/);
  });
});
