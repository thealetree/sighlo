# Sighlo

Local-first, topic-only personal news stream. Topics and cached articles are stored in `localStorage`; live articles are aggregated from **Google News and Bing News** RSS, read through free, CORS-enabled public services so the app works on any static host with no backend. Results from both aggregators are merged and de-duplicated, and items older than 30 days are dropped to keep the stream timely.

## Run locally

```bash
npm install
npm run dev
```

Open the localhost address Vite prints. Clear browser site data to reset Sighlo to its fresh state.

## Publish with GitHub Pages

Push this project to the `thealetree/sighlo` repository. The included GitHub Actions
workflow builds and publishes it automatically on each push to `main`.

In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
The site will be available at:

`https://thealetree.github.io/sighlo/`

GitHub Pages is a static host with no backend, and the news RSS feeds send no CORS
headers, so the browser can't fetch them directly. Instead of running our own proxy,
the app reads each feed through existing free, CORS-enabled public services:

1. [rss2json.com](https://rss2json.com) — returns the feed as JSON (primary).
2. [allorigins.win](https://allorigins.win) — returns the raw RSS XML (fallback).

No account, API key, or self-hosting is required, and the same path is used in local
development and in production. Saved topics and cached articles work regardless.

These are free shared services, so they can rate-limit or go briefly unavailable; the
app tries the fallback before giving up, and if one aggregator fails the other still
fills the feed. The aggregators and providers are isolated in `src/news.ts` (see the
`FEEDS` list), so adding, removing, or swapping a source is a one-file change.

## Current scope

- Empty first-run state with no pre-populated topics
- Add, mute, and remove local topics
- Unified reverse-chronological feed clustered from real article headlines, with the same
  story from different aggregators/outlets merged into one card
- Expandable cards that show short bullet summaries (built from publishers' own article
  snippets, where available) plus direct links to read the full story at each source
