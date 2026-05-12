import { QueryClient } from "@tanstack/react-query";
import { IssueNotFoundError } from "./fetch-issue-detail";
import { NewsletterNotFoundError } from "./fetch-newsletter-detail";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (
            error instanceof NewsletterNotFoundError ||
            error instanceof IssueNotFoundError
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
