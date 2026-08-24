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

GitHub Pages is a static host. The current live-news refresh uses Vite's local
development proxy, so it needs a separate public proxy or serverless endpoint to
work after deployment. Saved topics and cached articles still work in the static app.

## Current scope

- Empty first-run state with no pre-populated topics
- Add, mute, and remove local topics
- Unified reverse-chronological feed clustered from real article headlines
- Expandable story cards and external source links

The provider is isolated in `src/news.ts`. The Vite proxy is for localhost only; deployment needs an equivalent small serverless proxy to preserve the same `/api/news` interface.
