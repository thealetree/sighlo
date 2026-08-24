import type { Article, Topic } from "./types";

const toId = (value: string) =>
  [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString(36);

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

// Google News RSS has no CORS headers, so the browser can't fetch it directly from a
// static host like GitHub Pages. Rather than run our own proxy, we use existing free,
// CORS-enabled public services that read the feed for us:
//
//   1. rss2json.com  — returns the feed as JSON (primary; reliable, sends CORS).
//   2. allorigins.win — returns the raw RSS XML (fallback if rss2json is unavailable).
//
// The same path is used in dev and production, so there's no build/deploy difference.

// Google News titles are "Headline - Source Name". Split off the trailing source.
function splitTitle(rawTitle: string): { title: string; sourceName: string } {
  const marker = rawTitle.lastIndexOf(" - ");
  if (marker === -1) return { title: rawTitle.trim(), sourceName: "Unknown source" };
  return {
    title: rawTitle.slice(0, marker).trim(),
    sourceName: rawTitle.slice(marker + 3).trim() || "Unknown source",
  };
}

// rss2json emits pubDate as "YYYY-MM-DD HH:MM:SS" in GMT with no timezone marker;
// normalize it to a real UTC instant so relative times are correct.
function parseDate(value: string): string {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime()) && /[zZ]|[+-]\d\d:?\d\d/.test(value)) return direct.toISOString();
  const asUtc = new Date(`${value.replace(" ", "T")}Z`);
  return (Number.isNaN(asUtc.getTime()) ? direct : asUtc).toISOString();
}

function toArticle(topic: Topic, raw: { title: string; url: string; sourceName?: string; publishedAt: string }): Article[] {
  const { title, sourceName } = raw.sourceName
    ? { title: raw.title.trim(), sourceName: raw.sourceName }
    : splitTitle(raw.title);
  const publishedAt = parseDate(raw.publishedAt);
  if (!title || !raw.url || Number.isNaN(new Date(publishedAt).getTime())) return [];
  let sourceDomain = "";
  try {
    sourceDomain = new URL(raw.url).hostname.replace(/^www\./, "");
  } catch {
    sourceDomain = "";
  }
  return [{
    id: toId(`${topic.id}:${raw.url}`),
    topicId: topic.id,
    title,
    description: `Reporting from ${sourceName}.`,
    url: raw.url,
    sourceName,
    sourceDomain,
    publishedAt,
  }];
}

async function viaRss2json(topic: Topic, feedUrl: string): Promise<Article[]> {
  // Note: the `count` parameter requires an API key; the free tier returns ~10 items.
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`News source returned ${response.status}`);
  const data = (await response.json()) as {
    status?: string;
    items?: Array<{ title?: string; link?: string; pubDate?: string }>;
  };
  if (data.status !== "ok" || !Array.isArray(data.items)) throw new Error("News source returned unreadable data");
  return data.items.slice(0, 30).flatMap((item) =>
    toArticle(topic, { title: item.title ?? "", url: item.link ?? "", publishedAt: item.pubDate ?? "" }),
  );
}

async function viaXmlProxy(topic: Topic, feedUrl: string): Promise<Article[]> {
  const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`News source returned ${response.status}`);
  const document = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (document.querySelector("parsererror")) throw new Error("News source returned unreadable data");
  const textOf = (element: Element | null) => element?.textContent?.trim() ?? "";
  return Array.from(document.querySelectorAll("item")).slice(0, 30).flatMap((item) => {
    const source = item.querySelector("source");
    return toArticle(topic, {
      title: textOf(item.querySelector("title")),
      url: textOf(item.querySelector("link")),
      sourceName: textOf(source) || undefined,
      publishedAt: textOf(item.querySelector("pubDate")),
    });
  });
}

export async function fetchTopicArticles(topic: Topic): Promise<Article[]> {
  const search = new URLSearchParams({ q: topic.label, hl: "en-US", gl: "US", ceid: "US:en" });
  const feedUrl = `${GOOGLE_NEWS_RSS}?${search}`;

  const providers = [viaRss2json, viaXmlProxy];
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const articles = await provider(topic, feedUrl);
      if (articles.length) return articles;
      lastError = new Error("News source returned no articles");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Could not reach the news source");
}
