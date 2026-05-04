import { dehydrate } from "@tanstack/react-query";
import { headers } from "next/headers";
import { fetchNewsletterDetail } from "./fetch-newsletter-detail";
import { getAppOriginFromHeaderValues } from "./get-app-origin";
import { makeQueryClient } from "./query-client";
import { newsletterDetailQueryKey } from "./newsletter-keys";

/**
 * Prefetches `GET /api/newsletters/[id]` into a throwaway QueryClient and
 * returns dehydrated state for `<HydrationBoundary state={...}>`.
 */
export async function getNewsletterDehydratedState(newsletterId: string) {
  const h = await headers();
  const origin = getAppOriginFromHeaderValues(h);
  const cookie = h.get("cookie") ?? "";
  const queryClient = makeQueryClient();

  await queryClient.prefetchQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) =>
      fetchNewsletterDetail(newsletterId, {
        signal,
        baseUrl: origin,
        cookie,
      }),
  });

  return dehydrate(queryClient);
}
