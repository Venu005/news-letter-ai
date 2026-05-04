export function newsletterDetailQueryKey(newsletterId: string) {
  return ["newsletter", "detail", newsletterId] as const;
}
