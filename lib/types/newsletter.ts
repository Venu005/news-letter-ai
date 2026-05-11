import type { IssueListItem } from "./issue";

export type NewsletterListItem = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  issueCount: number;
  latestIssueAt: string | null;
  latestIssueStatus: string | null;
  updatedAt: string;
};

export type Newsletter = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterDetailPayload = {
  newsletter: Newsletter;
  issues: IssueListItem[];
};
