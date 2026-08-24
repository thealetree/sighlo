export type TopicStatus = "active" | "muted";

export type Topic = {
  id: string;
  label: string;
  status: TopicStatus;
  createdAt: string;
};

export type Article = {
  id: string;
  title: string;
  description: string;
  url: string;
  sourceName: string;
  sourceDomain: string;
  publishedAt: string;
  topicId: string;
};

export type Story = {
  id: string;
  headline: string;
  summary: string;
  bullets: string[];
  sourceCount: number;
  topicIds: string[];
  articles: Article[];
  latestPublishedAt: string;
};
