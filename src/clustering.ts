import type { Article, Story, Topic } from "./types";

const ignoredWords = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "is", "of", "on", "the", "to", "with"]);

const tokens = (title: string) => new Set(title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !ignoredWords.has(word)));

const similarity = (first: string, second: string) => {
  const firstTokens = tokens(first);
  const secondTokens = tokens(second);
  const shared = [...firstTokens].filter((word) => secondTokens.has(word)).length;
  return shared / Math.max(1, Math.min(firstTokens.size, secondTokens.size));
};

// A comparable form of a headline: lowercased, punctuation flattened. Used to catch the
// exact same story surfaced by more than one aggregator.
export const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const KNOWN_TLDS = new Set(["com", "org", "net", "co", "uk", "us", "ca", "au", "gov", "edu", "io", "news", "tv", "info", "app", "me"]);

// Collapse a source label to a canonical key so the same outlet counts once even when one
// feed names it "BBC" and another gives the domain "bbc.co.uk".
export function sourceKey(name: string): string {
  const value = name.trim().toLowerCase();
  if (!value) return "";
  if (!value.includes(" ") && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) {
    const labels = value.split(".").filter((label) => label && label !== "www" && !KNOWN_TLDS.has(label));
    return labels.sort((a, b) => b.length - a.length)[0] ?? value;
  }
  return value.replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "").replace(/news$/, "") || value;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

const capLength = (text: string, max = 200) =>
  text.length > max ? `${text.slice(0, max - 1).replace(/[\s,;:]+\S*$/, "")}…` : text;

// Build up to three summary bullets from the publishers' own snippets. With several
// sources, take one line each; with a single snippet, split it into sentences. Google's
// RSS carries no real snippet, so Google-only stories yield no bullets (links only).
function buildBullets(cluster: Article[]): string[] {
  const snippets: string[] = [];
  const seenSources = new Set<string>();
  for (const article of cluster) {
    const text = clean(article.description ?? "");
    if (!text) continue;
    const key = sourceKey(article.sourceName);
    if (seenSources.has(key)) continue;
    seenSources.add(key);
    snippets.push(text);
  }
  if (!snippets.length) return [];
  if (snippets.length === 1) {
    const sentences = snippets[0].split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 20);
    return (sentences.length ? sentences : [snippets[0]]).slice(0, 3).map((sentence) => capLength(sentence));
  }
  return snippets.slice(0, 3).map((snippet) => capLength(snippet));
}

export function clusterArticles(articles: Article[], topics: Topic[]): Story[] {
  const clusters: Article[][] = [];
  [...articles].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)).forEach((article) => {
    const key = titleKey(article.title);
    const matchingCluster = clusters.find((cluster) => {
      const headKey = titleKey(cluster[0].title);
      if (key && headKey && (key === headKey || (key.length > 24 && headKey.length > 24 && (key.includes(headKey) || headKey.includes(key))))) return true;
      return similarity(cluster[0].title, article.title) >= 0.5;
    });
    if (matchingCluster) matchingCluster.push(article);
    else clusters.push([article]);
  });

  return clusters.map((cluster) => {
    const newest = cluster.reduce((latest, article) => (+new Date(article.publishedAt) > +new Date(latest.publishedAt) ? article : latest));
    const topicIds = [...new Set(cluster.map((article) => article.topicId))];
    const labels = topicIds.map((id) => topics.find((topic) => topic.id === id)?.label).filter(Boolean);
    const sourceCount = new Set(cluster.map((article) => sourceKey(article.sourceName))).size;
    return {
      id: cluster.map((article) => article.id).sort().join("-"),
      headline: newest.title,
      summary: `${sourceCount} source${sourceCount === 1 ? "" : "s"} reporting on ${labels.join(" and ")}.`,
      bullets: buildBullets(cluster),
      sourceCount,
      topicIds,
      articles: cluster,
      latestPublishedAt: newest.publishedAt,
    };
  }).sort((a, b) => +new Date(b.latestPublishedAt) - +new Date(a.latestPublishedAt));
}
