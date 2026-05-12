import { dehydrate } from "@tanstack/react-query";
import { headers } from "next/headers";
import { fetchIssueDetail } from "./fetch-issue-detail";
import { getAppOriginFromHeaderValues } from "./get-app-origin";
import { issueDetailQueryKey } from "./issue-keys";
import { makeQueryClient } from "./query-client";

/**
 * Prefetches `GET /api/issues/[id]` into a throwaway QueryClient and returns
 * dehydrated state for `<HydrationBoundary state={...}>`.
 */
export async function getIssueDehydratedState(issueId: string) {
  const h = await headers();
  const origin = getAppOriginFromHeaderValues(h);
  const cookie = h.get("cookie") ?? "";
  const queryClient = makeQueryClient();

  await queryClient.prefetchQuery({
    queryKey: issueDetailQueryKey(issueId),
    queryFn: ({ signal }) =>
      fetchIssueDetail(issueId, { signal, baseUrl: origin, cookie }),
  });

  return dehydrate(queryClient);
}
