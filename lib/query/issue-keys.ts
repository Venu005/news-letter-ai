export function issueDetailQueryKey(issueId: string) {
  return ["issue", "detail", issueId] as const;
}
