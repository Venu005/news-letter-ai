export type Topic = {
  id: string;
  title: string;
  brief: string;
  keyFacts: string[];
  fullText: string;
  sourceUrl: string;
  isApproved: boolean;
  issueId: string;
};

export type TopicInput = {
  id: string;
  title?: string;
  brief?: string;
  keyFacts?: string[];
  fullText?: string;
  sourceUrl?: string;
  isApproved?: boolean;
};
