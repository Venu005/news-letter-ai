import type { Topic } from "./topic";

export type IssueStatus = "RESEARCHING" | "DRAFTING" | "REVIEWING" | "PUBLISHED";

export type IssueListItem = {
  id: string;
  newsletterId: string;
  niche: string;
  title: string | null;
  status: IssueStatus;
  slug: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type IssueDetail = IssueListItem & {
  finalDraft: string | null;
  createdAt: string;
};

export type IssueDetailPayload = {
  issue: IssueDetail;
  topics: Topic[];
};
