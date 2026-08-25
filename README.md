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

### Custom domain (sighlo.news)

The site is configured to serve from the apex domain **sighlo.news** (Vite `base` is `/`
and `public/CNAME` pins the domain). To hook it up:

1. **Squarespace Domains → DNS** for `sighlo.news`, add:
   - Four **A** records on host `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - (optional IPv6) Four **AAAA** records on `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - One **CNAME** record on host `www` → `thealetree.github.io`
2. In the repo, **Settings → Pages → Custom domain**, enter `sighlo.news` and Save.
3. Once GitHub's DNS check passes, tick **Enforce HTTPS** (the certificate can take a while to issue).

DNS changes can take from a few minutes up to 24 hours to propagate. Because `base` is now
`/`, the old `thealetree.github.io/sighlo/` path no longer serves the app — use the domain.

### Installable web app (PWA)

Sighlo ships a web app manifest, an icon, and a service worker (`public/`), so it can be
installed to a phone or desktop and used offline (the cross-origin news requests always go
to the network). On first visit an unobtrusive prompt offers to install: a one-tap Install
on Android/desktop Chrome, or Share → “Add to Home Screen” instructions on iOS Safari.

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
- Clustered feed with the same story from different aggregators/outlets merged into one
  card; stories that carry a real summary are surfaced first, older ones drop off
- Expandable cards showing short bullet summaries (from publishers' own article snippets,
  fetched on demand where possible) plus direct links to read the full story at each source
- Opened stories are remembered and shown duller; swipe a card away to dismiss it for good
  (the freed slot fills with the next story). Read and dismissed state persist locally
- Pull down (or overscroll up on desktop) to refresh — a real re-check for new stories
- Settings panel with adjustable feed limits (number of stories, maximum age) and per-aggregator
  source toggles (Google News, Bing News); a separate Theme panel holds the themes
- Twelve themes (six light, six dark) with explicit Light/Dark selection or system matching,
  and a per-section default used when the OS switches between light and dark
