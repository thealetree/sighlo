import type { Article, Topic } from "./types";

const text = (element: Element | null) => element?.textContent?.trim() ?? "";

const toId = (value: string) =>
  [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString(36);

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

// In dev, Vite proxies /api/news to Google News (see vite.config.ts). GitHub Pages
// is a static host with no proxy, so in production the browser can't fetch Google
// News directly (CORS). We route the request through a CORS proxy instead.
//
// For reliability you can run your own proxy (e.g. a Cloudflare Worker) and point
// the app at it with a VITE_NEWS_PROXY build env var — its value is prefixed to the
// URL-encoded feed URL. Without it, the app falls back to free public proxies, which
// work but are best-effort and occasionally rate-limit or go down. See the README.
const customProxy = import.meta.env.VITE_NEWS_PROXY;
const PROXIES: Array<(target: string) => string> = customProxy
  ? [(target) => `${customProxy}${encodeURIComponent(target)}`]
  : [
      (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      (target) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`,
      (target) => `https://thingproxy.freeboard.io/fetch/${target}`,
    ];

async function fetchFeed(search: URLSearchParams): Promise<string> {
  if (import.meta.env.DEV) {
    const response = await fetch(`/api/news?${search}`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`News source returned ${response.status}`);
    return response.text();
  }

  const target = `${GOOGLE_NEWS_RSS}?${search}`;
  let lastError: unknown;
  // Two passes: public proxies fail intermittently, so a quick retry recovers most calls.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const proxy of PROXIES) {
      try {
        const response = await fetch(proxy(target), { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`News source returned ${response.status}`);
        const body = await response.text();
        if (body.includes("<item")) return body;
        throw new Error("News source returned no articles");
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError ?? new Error("Could not reach the news source");
}

export async function fetchTopicArticles(topic: Topic): Promise<Article[]> {
  const search = new URLSearchParams({ q: topic.label, hl: "en-US", gl: "US", ceid: "US:en" });

  const document = new DOMParser().parseFromString(await fetchFeed(search), "application/xml");
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
