import type { Article, Story, Topic } from "./types";

const ignoredWords = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "is", "of", "on", "the", "to", "with"]);

const tokens = (title: string) => new Set(title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !ignoredWords.has(word)));

const similarity = (first: string, second: string) => {
  const firstTokens = tokens(first);
  const secondTokens = tokens(second);
  const shared = [...firstTokens].filter((word) => secondTokens.has(word)).length;
  return shared / Math.max(1, Math.min(firstTokens.size, secondTokens.size));
};

export function clusterArticles(articles: Article[], topics: Topic[]): Story[] {
  const clusters: Article[][] = [];
  [...articles].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)).forEach((article) => {
    const matchingCluster = clusters.find((cluster) => similarity(cluster[0].title, article.title) >= 0.55);
    if (matchingCluster) matchingCluster.push(article);
    else clusters.push([article]);
  });

  return clusters.map((cluster) => {
    const newest = cluster.reduce((latest, article) => (+new Date(article.publishedAt) > +new Date(latest.publishedAt) ? article : latest));
    const topicIds = [...new Set(cluster.map((article) => article.topicId))];
    const labels = topicIds.map((id) => topics.find((topic) => topic.id === id)?.label).filter(Boolean);
    const sources = new Set(cluster.map((article) => article.sourceName));
    return {
      id: cluster.map((article) => article.id).sort().join("-"),
      headline: newest.title,
      summary: `${sources.size} source${sources.size === 1 ? "" : "s"} reporting on ${labels.join(" and ")}.`,
      topicIds,
      articles: cluster,
      latestPublishedAt: newest.publishedAt,
    };
  }).sort((a, b) => +new Date(b.latestPublishedAt) - +new Date(a.latestPublishedAt));
}
