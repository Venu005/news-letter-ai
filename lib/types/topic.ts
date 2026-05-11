export type Topic = {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  isApproved: boolean;
  issueId: string;
};

export type TopicInput = {
  id: string;
  title?: string;
  summary?: string;
  sourceUrl?: string;
  isApproved?: boolean;
};
