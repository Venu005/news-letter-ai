import { QueryClient } from "@tanstack/react-query";
import { NewsletterNotFoundError } from "./fetch-newsletter-detail";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof NewsletterNotFoundError) {
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
