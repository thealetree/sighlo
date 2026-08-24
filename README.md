# Sighlo

Local-first, topic-only personal news stream. Topics and cached articles are stored in `localStorage`; live articles come from Google News RSS, read through free, CORS-enabled public services so the app works on any static host with no backend.

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

GitHub Pages is a static host with no backend, and Google News RSS sends no CORS
headers, so the browser can't fetch it directly. Instead of running our own proxy,
the app reads the feed through existing free, CORS-enabled public services:

1. [rss2json.com](https://rss2json.com) — returns the feed as JSON (primary).
2. [allorigins.win](https://allorigins.win) — returns the raw RSS XML (fallback).

No account, API key, or self-hosting is required, and the same path is used in local
development and in production. Saved topics and cached articles work regardless.

These are free shared services, so they can rate-limit or go briefly unavailable; the
app tries the fallback before giving up. The news provider is isolated in `src/news.ts`,
so swapping in a different service (or your own endpoint) is a one-file change.

## Current scope

- Empty first-run state with no pre-populated topics
- Add, mute, and remove local topics
- Unified reverse-chronological feed clustered from real article headlines
- Expandable story cards and external source links
