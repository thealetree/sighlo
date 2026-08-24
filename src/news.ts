import type { Article, Topic } from "./types";

const text = (element: Element | null) => element?.textContent?.trim() ?? "";

const toId = (value: string) =>
  [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString(36);

export async function fetchTopicArticles(topic: Topic): Promise<Article[]> {
  const search = new URLSearchParams({ q: topic.label, hl: "en-US", gl: "US", ceid: "US:en" });
  const response = await fetch(`/api/news?${search}`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`News source returned ${response.status}`);

  const document = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (document.querySelector("parsererror")) throw new Error("News source returned unreadable data");

  return Array.from(document.querySelectorAll("item")).slice(0, 30).flatMap((item) => {
    const title = text(item.querySelector("title"));
    const url = text(item.querySelector("link"));
    const source = item.querySelector("source");
    const sourceName = text(source) || "Unknown source";
    const sourceUrl = source?.getAttribute("url") ?? url;
    const publishedAt = new Date(text(item.querySelector("pubDate"))).toISOString();
    if (!title || !url || Number.isNaN(new Date(publishedAt).getTime())) return [];
    return [{
      id: toId(`${topic.id}:${url}`),
      topicId: topic.id,
      title: title.replace(new RegExp(`\\s+-\\s+${sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""),
      description: `Reporting from ${sourceName}.`,
      url,
      sourceName,
      sourceDomain: new URL(sourceUrl).hostname.replace(/^www\./, ""),
      publishedAt,
    }];
  });
}
