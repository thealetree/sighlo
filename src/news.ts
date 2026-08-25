import type { Article, Topic } from "./types";
import { sourceKey, titleKey } from "./clustering";

const toId = (value: string) =>
  [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString(36);

// A generous sanity cap that drops clearly ancient results (Bing mixes in evergreen
// content years old). The user's own "max age" setting refines this further at render.
const MAX_AGE_DAYS = 90;

// News RSS feeds have no CORS headers, so the browser can't fetch them directly from a
// static host like GitHub Pages. Rather than run our own proxy, we read each feed
// through existing free, CORS-enabled public services:
//
//   1. rss2json.com  — returns the feed as JSON (primary; reliable, sends CORS).
//   2. allorigins.win — returns the raw RSS XML (fallback if rss2json is unavailable).
//
// The same path is used in dev and production, so there's no build/deploy difference.

type RawItem = { title: string; link: string; pubDate: string; description: string };

// Fetch a single feed URL as raw items, trying the JSON service first and falling back
// to the XML one. Throws only if both services fail for this feed.
async function fetchFeedItems(feedUrl: string): Promise<RawItem[]> {
  let lastError: unknown;
  try {
    return await viaRss2json(feedUrl);
  } catch (error) {
    lastError = error;
  }
  try {
    return await viaXmlProxy(feedUrl);
  } catch (error) {
    lastError = error;
  }
  throw lastError ?? new Error("Could not reach the news source");
}

async function viaRss2json(feedUrl: string): Promise<RawItem[]> {
  // Note: the `count` parameter requires an API key; the free tier returns ~10 items.
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`News source returned ${response.status}`);
  const data = (await response.json()) as {
    status?: string;
    items?: Array<{ title?: string; link?: string; pubDate?: string; description?: string; content?: string }>;
  };
  if (data.status !== "ok" || !Array.isArray(data.items)) throw new Error("News source returned unreadable data");
  return data.items.map((item) => ({
    title: item.title ?? "",
    link: item.link ?? "",
    pubDate: item.pubDate ?? "",
    description: item.description || item.content || "",
  }));
}

async function viaXmlProxy(feedUrl: string): Promise<RawItem[]> {
  const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`News source returned ${response.status}`);
  const document = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (document.querySelector("parsererror")) throw new Error("News source returned unreadable data");
  const textOf = (element: Element | null) => element?.textContent?.trim() ?? "";
  return Array.from(document.querySelectorAll("item")).map((item) => ({
    title: textOf(item.querySelector("title")),
    link: textOf(item.querySelector("link")),
    pubDate: textOf(item.querySelector("pubDate")),
    description: textOf(item.querySelector("description")),
  }));
}

// pubDate arrives as "YYYY-MM-DD HH:MM:SS" (GMT, no marker) or RFC-822; normalize to a
// real UTC instant so relative times are correct.
function parseDate(value: string): string {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime()) && /[zZ]|[+-]\d\d:?\d\d/.test(value)) return direct.toISOString();
  const asUtc = new Date(`${value.replace(" ", "T")}Z`);
  return (Number.isNaN(asUtc.getTime()) ? direct : asUtc).toISOString();
}

// Google News titles are "Headline - Source Name". Split off the trailing source.
function splitTitle(rawTitle: string): { title: string; sourceName: string } {
  const marker = rawTitle.lastIndexOf(" - ");
  if (marker === -1) return { title: rawTitle.trim(), sourceName: "Unknown source" };
  return {
    title: rawTitle.slice(0, marker).trim(),
    sourceName: rawTitle.slice(marker + 3).trim() || "Unknown source",
  };
}

const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// Bing wraps every link as bing.com/news/apiclick.aspx?...&url=<real url>. Unwrap it so
// the article points at the real publisher and we can name the source by its domain.
function unwrapRedirect(link: string): string {
  try {
    const url = new URL(link);
    if (url.hostname.endsWith("bing.com")) {
      const real = url.searchParams.get("url");
      if (real) return real;
    }
  } catch {
    /* fall through */
  }
  return link;
}

// Turn feed HTML into a plain-text snippet, and discard it when it's just the headline
// echoed back (as Google's RSS does) rather than a real summary.
function cleanSnippet(html: string, title: string): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;|&rsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&hellip;/gi, "…")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 25) return "";
  if (titleKey(text) === titleKey(title) || titleKey(text).startsWith(titleKey(title))) return "";
  return text;
}

function buildArticle(topic: Topic, feed: string, raw: { title: string; url: string; sourceName: string; publishedAt: string; description?: string }): Article[] {
  const title = raw.title.trim();
  const publishedAt = parseDate(raw.publishedAt);
  if (!title || !raw.url || Number.isNaN(new Date(publishedAt).getTime())) return [];
  return [{
    id: toId(`${topic.id}:${raw.url}`),
    topicId: topic.id,
    title,
    description: cleanSnippet(raw.description ?? "", title),
    url: raw.url,
    sourceName: raw.sourceName,
    sourceDomain: domainOf(raw.url),
    publishedAt,
    feed,
  }];
}

// A feed is an aggregator: how to build its search URL, and how to read its items into
// articles (each aggregator formats titles/links/source differently).
type Feed = {
  name: string;
  label: string;
  buildUrl: (query: string) => string;
  toArticles: (topic: Topic, items: RawItem[]) => Article[];
};

const FEEDS: Feed[] = [
  {
    name: "google",
    label: "Google News",
    buildUrl: (query) =>
      `https://news.google.com/rss/search?${new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" })}`,
    toArticles: (topic, items) =>
      items.flatMap((item) => {
        const { title, sourceName } = splitTitle(item.title);
        return buildArticle(topic, "google", { title, url: item.link, sourceName, publishedAt: item.pubDate, description: item.description });
      }),
  },
  {
    name: "bing",
    label: "Bing News",
    buildUrl: (query) => `https://www.bing.com/news/search?${new URLSearchParams({ q: query, format: "rss" })}`,
    toArticles: (topic, items) =>
      items.flatMap((item) => {
        const url = unwrapRedirect(item.link);
        return buildArticle(topic, "bing", {
          title: item.title,
          url,
          sourceName: domainOf(url) || "Unknown source",
          publishedAt: item.pubDate,
          description: item.description,
        });
      }),
  },
];

// The aggregators users can turn on and off, for the Settings panel.
export const NEWS_SOURCES = FEEDS.map((feed) => ({ id: feed.name, label: feed.label }));

// Lazily fetch a real article page (through the CORS proxy) and pull a one-line summary
// from its metadata. Only works for real publisher URLs — Google's opaque redirect links
// can't be resolved, so callers should skip those. Returns "" when nothing usable is found.
export async function fetchArticleSummary(url: string): Promise<string> {
  try {
    if (new URL(url).hostname.endsWith("news.google.com")) return "";
  } catch {
    return "";
  }
  try {
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return "";
    const document = new DOMParser().parseFromString(await response.text(), "text/html");
    const meta = (selector: string) => document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
    const summary =
      meta('meta[property="og:description"]') ||
      meta('meta[name="description"]') ||
      meta('meta[name="twitter:description"]') ||
      (document.querySelector("article p, main p, p")?.textContent ?? "");
    const clean = summary.replace(/\s+/g, " ").trim();
    return clean.length >= 40 ? clean : "";
  } catch {
    return "";
  }
}

export async function fetchTopicArticles(topic: Topic, enabledSources?: string[]): Promise<Article[]> {
  const feeds = enabledSources ? FEEDS.filter((feed) => enabledSources.includes(feed.name)) : FEEDS;
  if (!feeds.length) return [];

  // Query every enabled aggregator in parallel; one failing shouldn't lose the others.
  const results = await Promise.allSettled(
    feeds.map(async (feed) => feed.toArticles(topic, await fetchFeedItems(feed.buildUrl(topic.label)))),
  );

  const merged = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (!merged.length) {
    const anyReached = results.some((result) => result.status === "fulfilled");
    if (!anyReached) {
      const firstError = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
      throw firstError?.reason ?? new Error("Could not reach the news source");
    }
    return [];
  }

  // Drop stale items, then de-duplicate the same story from the same outlet surfaced by
  // more than one aggregator (e.g. "BBC" via Google and "bbc.co.uk" via Bing). Keep the
  // richer copy — one that carries a real snippet and links straight to the publisher
  // rather than through an aggregator redirect. Clustering later groups the rest.
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const richness = (article: Article) =>
    (article.description ? 2 : 0) + (article.sourceDomain && article.sourceDomain !== "news.google.com" ? 1 : 0);
  const byKey = new Map<string, Article>();
  for (const article of merged) {
    if (new Date(article.publishedAt).getTime() < cutoff) continue;
    const key = `${sourceKey(article.sourceName)}::${titleKey(article.title)}`;
    const existing = byKey.get(key);
    if (!existing || richness(article) > richness(existing)) byKey.set(key, article);
  }
  return Array.from(byKey.values());
}
