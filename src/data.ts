import type { Article, Story, Topic } from "./types";

const sourceNames = ["Signal Wire", "The Brief", "Field Notes", "Open Journal", "Northstar"];

const hash = (value: string) =>
  [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7);

const titleCase = (value: string) =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

export function createMockStories(topic: Topic): Story[] {
  const seed = hash(topic.label.toLowerCase());
  const subject = titleCase(topic.label.trim());
  const minutesAgo = [18, 96, 292, 730];
  const headlines = [
    `${subject} sees a fresh round of activity`,
    `What changed around ${subject} this morning`,
    `${subject} projects move from discussion to action`,
    `A closer look at the latest ${subject} developments`,
  ];

  return headlines.map((headline, index) => {
    const articleCount = 2 + ((seed + index) % 3);
    const publishedAt = new Date(Date.now() - minutesAgo[index] * 60_000).toISOString();
    const articles: Article[] = Array.from({ length: articleCount }, (_, articleIndex) => {
      const sourceName = sourceNames[(seed + index + articleIndex) % sourceNames.length];
      return {
        id: `${topic.id}-${index}-${articleIndex}`,
        title: articleIndex === 0 ? headline : `${subject}: ${["the response", "the details", "what to watch", "the next phase"][articleIndex]}`,
        description: `A mock report covering the newest developments related to ${subject}. This placeholder content is here to help evaluate Sighlo's reading experience.`,
        url: `https://example.com/sighlo-demo/${encodeURIComponent(topic.id)}/${index}/${articleIndex}`,
        sourceName,
        sourceDomain: "example.com",
        publishedAt: new Date(new Date(publishedAt).getTime() - articleIndex * 9 * 60_000).toISOString(),
        topicId: topic.id,
      };
    });

    return {
      id: `${topic.id}-${index}`,
      headline,
      summary: `A clustered mock story for ${subject}, assembled from ${articleCount} fictional reports. Replace the mock provider with a real source when the interface is ready.`,
      topicIds: [topic.id],
      articles,
      latestPublishedAt: publishedAt,
    };
  });
}

export function createFeed(topics: Topic[]): Story[] {
  return topics
    .filter((topic) => topic.status === "active")
    .flatMap(createMockStories)
    .sort(
      (first, second) =>
        new Date(second.latestPublishedAt).getTime() - new Date(first.latestPublishedAt).getTime(),
    );
}
