# Sighlo

Local-first, topic-only personal news stream. Topics and cached articles are stored in `localStorage`; live articles come from Google News RSS through Vite's local development proxy.

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

GitHub Pages is a static host with no backend, so the browser can't fetch Google
News directly (CORS). In production the app routes the request through a CORS proxy:

- **Out of the box:** it falls back to free public proxies, so live news works on
  GitHub Pages with no extra setup. These are best-effort — they occasionally rate-limit
  or go down, and the app retries across a few of them.
- **For reliability (recommended):** run your own proxy and point the build at it with
  the `VITE_NEWS_PROXY` env var. A tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/)
  is the easiest option — one that fetches `?url=<encoded feed url>`, returns the body,
  and sends `Access-Control-Allow-Origin: *`. Then build with:

  ```bash
  VITE_NEWS_PROXY="https://your-worker.workers.dev/?url=" npm run build
  ```

  (The value is prefixed to the URL-encoded Google News feed URL.) To wire it into the
  GitHub Actions deploy, set it as a repository variable/secret and pass it to the build step.

Saved topics and cached articles work in the static app regardless.

## Current scope

- Empty first-run state with no pre-populated topics
- Add, mute, and remove local topics
- Unified reverse-chronological feed clustered from real article headlines
- Expandable story cards and external source links

The provider is isolated in `src/news.ts`. The Vite proxy is for localhost only; deployment needs an equivalent small serverless proxy to preserve the same `/api/news` interface.
