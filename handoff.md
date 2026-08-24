# Plahp Product Handoff

## One-Line Product Definition

Plahp is a local-first, ultra-minimal personal news stream that shows only clustered stories about topics the user explicitly adds.

## Vision

Plahp is not a general news app. It does not answer "what is happening in the world?" It answers "what is happening in my world?"

The product should feel like a personal information stream: quiet, focused, chronological, and finite. Users define the topics they care about, and Plahp aggregates relevant stories from public sources without recommendations, trending sections, political scoring, social feeds, or account systems.

The ideal user experience is:

1. Open Plahp.
2. See a clean chronological feed of story cards related only to saved topics.
3. Tap a headline to expand details, summaries, and sources.
4. Add, mute, or remove topics from a minimal bottom search/topic manager.
5. Leave when there is nothing else new.

## Product Philosophy

Plahp should be built around explicit user intent.

- No algorithmic recommendations.
- No "for you" feed.
- No trending news.
- No notifications for MVP.
- No account creation.
- No email collection.
- No passwords.
- No cloud profile.
- No analytics by default.
- No content outside saved topics.
- No infinite scroll treadmill.

If the user only follows three topics, the app only shows stories for those three topics. If there are no new stories, the feed should say so clearly and elegantly.

## Name

Product name: Plahp

The name is intentionally odd and lightweight. It should not be over-explained in the UI. Treat it as a simple product name, not an acronym.

## Core UX Principles

### 1. Feed First

The feed is the main interface. The first screen should be the actual product experience, not a marketing page, onboarding flow, or dashboard.

When the app opens, the user should immediately see:

- Clustered story cards if relevant stories exist.
- A beautiful empty state if nothing is available.
- A persistent minimal search/topic control at the bottom.

### 2. Explicit Topics Only

Users should add topics through search. These topics become standing interests that drive the feed.

Examples:

- Bitcoin
- Blender
- Michael Levin
- Bioelectricity research
- AI coding agents
- Drone light shows
- Bitcoin ETF inflows

Do not force users to choose sources. The system should search and aggregate across available public sources.

### 3. Unified Chronological Feed

All active topics should populate one unified timeline.

There should be no separate topic tabs for MVP. Topic labels can appear on cards so the user understands why each story is present.

Sorting rule:

- Strict reverse chronology wins.
- Newer story clusters appear above older story clusters.
- Do not rank by perceived importance, popularity, ideology, or editorial judgment.

### 4. Clustered Story Cards

The feed should cluster multiple articles about the same underlying story into one card.

Instead of showing:

- Bitcoin rises
- Bitcoin jumps
- Bitcoin surges
- Bitcoin gains

Show one story card:

- Bitcoin reaches new yearly high
- Bitcoin
- 27 sources
- 12m ago

When related updates occur, merge them into an evolving story thread when they are clearly the same developing story. Keep genuinely distinct developments separate.

### 5. Progressive Disclosure

Cards should be headline-first.

Collapsed card:

- Headline
- Topic label
- Relative age
- Source count

Expanded card:

- Short AI-generated or extracted summary
- Source list
- Original article links
- Publication timestamps
- Optional source names

The default feed should stay text/headline focused. Summaries and source lists should appear only after the user expands a card.

### 6. Local First

For MVP, all user preferences should live locally on the device.

Store locally:

- Topics
- Muted topics
- Removed or archived topics if retained
- User dismissed topics
- Cached feed items if useful
- Last fetched timestamps
- Basic app settings

Use browser storage:

- IndexedDB for structured local data and cached stories.
- localStorage only for very small preferences or simple first-pass implementation.

The product should be honest about the tradeoff: if the user clears browser data, they lose their topics. That is acceptable for MVP and consistent with the no-account philosophy.

Possible future sync options:

- Export/import JSON.
- Passkeys.
- GitHub login.
- Optional encrypted sync.

Do not build sync for MVP unless explicitly requested later.

## UX Specification

### Main Feed

The main feed should be mobile-first and usable with one hand.

Required states:

- New user empty state with bottom search available.
- Returning user with active topics and stories.
- Returning user with active topics but no new stories.
- Loading state while fetching stories.
- Error state when sources cannot be reached.

Empty state copy direction:

- "Nothing new in your streams today."
- Keep copy short and calm.
- Avoid teaching text unless absolutely necessary.

### Story Card

Each card should include:

- Headline.
- Topic label.
- Relative time, such as "12m ago" or "3h ago".
- Source count, such as "23 sources".
- Expanded state with summary and sources.

Card behavior:

- Tap to expand.
- Tap again or use a close affordance to collapse.
- Expansion should be subtle and stable, without shifting the entire page aggressively.
- Links should open original articles in a new tab.

### Bottom Search and Topic Manager

A persistent bottom UI element should be present on the feed.

Default collapsed state:

- Minimal search field or command-line-like input.
- Low visual weight.
- Fixed near the bottom.
- Does not dominate the feed.

Expanded state:

- Search input becomes active.
- Topic list appears above or within the expanded panel.
- User can add a new topic.
- User can see current topics.
- User can mute a topic.
- User can remove a topic.

Topic controls:

- Active: contributes stories to the feed.
- Muted: retained locally but ignored by feed generation.
- Removed: deleted from active topic list.

Optional later state:

- Archived: removed from feed but remembered for easy restoration.

The expanded topic manager should feel like a compact command palette, not a settings screen.

## Design Direction

### Overall Feel

Plahp should inherit terminal values without literally looking like a terminal.

Design values:

- Fast.
- Sparse.
- Intentional.
- Text-first.
- Calm.
- High contrast.
- No decorative noise.

Visual direction:

- Black and white theme for MVP.
- Themeable later.
- Gentle card shadows.
- Minimal borders.
- Strong typography.
- Generous spacing.
- No gradients.
- No ads.
- No trending modules.
- No recommendation blocks.
- No sidebars for MVP.

### Mobile First

Design for mobile before desktop.

Primary viewport:

- iPhone-sized browser.
- Thumb-friendly bottom controls.
- Feed readable while holding the phone one-handed.
- Cards should not require dense scanning.

Desktop can be a centered narrow column with the same core UI.

### Typography

Use one clean font family for MVP. A system font stack is acceptable.

Suggested CSS direction:

```css
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
```

or a slightly softer system stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

The interface can feel terminal-inspired through spacing, restraint, and command-like interaction rather than forcing everything into monospace.

## Content and Aggregation

### Source Strategy

Do not build a full crawler for MVP. A crawler is expensive, brittle, and unnecessary at this stage.

Use existing public sources and APIs first:

- Public RSS feeds where available.
- News search APIs if free tiers are viable.
- Search APIs if free tiers are viable.
- Public web results where legally and technically appropriate.
- Open-source scraping/fetching libraries only when permitted by source terms.

The stack should remain free to run at small scale where possible.

### Relevance Filtering

Each topic should act as a standing query.

For MVP, implement relevance in layers:

1. Search/fetch candidate articles for each active topic.
2. Normalize article metadata.
3. Filter obvious mismatches by keyword and title/description matching.
4. Optionally use embeddings or a local/open model later for semantic relevance.
5. Deduplicate and cluster similar stories.

Avoid hallucinated content. Feed items must be grounded in real source URLs.

### Story Clustering

Cluster stories that appear to describe the same event.

Initial clustering can use:

- Canonical URL normalization.
- Similar headline matching.
- Shared named entities.
- Similar title embeddings if available.
- Time-window grouping.

MVP heuristic approach:

- Normalize headlines.
- Remove punctuation and common stop words.
- Compare token overlap.
- Group articles for the same topic when similarity passes a threshold.
- Prefer the clearest or most common headline as the cluster headline.
- Use newest article timestamp as the cluster timestamp.
- Keep source count from unique source domains.

Later upgrades:

- Embedding-based clustering.
- Local LLM-assisted relevance filtering.
- Cross-topic clusters when the same story matches multiple topics.
- Better evolving story thread detection.

### Summaries

Headline-only by default.

Expanded card summaries can be:

- Extracted from source descriptions for MVP.
- Generated later by an LLM if cost and source grounding are acceptable.

For MVP, avoid making summary generation a hard dependency. A simple synthesized summary from article descriptions is enough to start.

## Local-First Data Model

Suggested entities:

```ts
type Topic = {
  id: string;
  label: string;
  query: string;
  status: "active" | "muted";
  createdAt: string;
  updatedAt: string;
};

type Article = {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  url: string;
  sourceName?: string;
  sourceDomain: string;
  publishedAt: string;
  fetchedAt: string;
};

type StoryCluster = {
  id: string;
  topicIds: string[];
  headline: string;
  summary?: string;
  sourceCount: number;
  latestPublishedAt: string;
  articleIds: string[];
};
```

Recommended local storage:

- IndexedDB via a small wrapper such as Dexie.
- Keep data exportable as plain JSON.
- Do not store secrets in browser storage.

## Suggested Technical Architecture

### Frontend

Recommended stack:

- Vite.
- React.
- TypeScript.
- CSS modules or plain CSS.
- IndexedDB with Dexie.

This is enough for a fast local-first web app without framework overhead.

Alternative:

- Next.js if deployment patterns in the parent GitHub projects strongly prefer it.

However, because Plahp should be static-first and local-first, Vite is the simpler starting point.

### Backend or Serverless Layer

Because browsers cannot reliably query many news/search sources directly due to CORS and API key exposure, use a minimal serverless fetch layer.

Suggested options:

- GitHub Pages or static hosting for frontend plus a small serverless API elsewhere.
- Cloudflare Workers if acceptable.
- Vercel/Netlify functions if the user's existing GitHub deployment patterns prefer those.
- Local development mock provider first.

Important constraint:

- No user accounts.
- Server should not store user preferences.
- Server receives a query, fetches candidate articles, returns normalized results.
- Client stores topics and feed state locally.

### API Shape

Example endpoint:

```http
GET /api/search?q=bitcoin&since=2026-08-23T00:00:00.000Z
```

Example response:

```json
{
  "query": "bitcoin",
  "fetchedAt": "2026-08-24T19:00:00.000Z",
  "articles": [
    {
      "title": "Bitcoin reaches new yearly high",
      "description": "Bitcoin moved higher as ETF inflows accelerated.",
      "url": "https://example.com/story",
      "sourceName": "Example News",
      "sourceDomain": "example.com",
      "publishedAt": "2026-08-24T18:42:00.000Z"
    }
  ]
}
```

### Development Phases

Phase 1: Local prototype

- Build static mobile-first UI.
- Add topic storage in IndexedDB.
- Add sample/mock story data.
- Implement unified feed.
- Implement expandable cards.
- Implement bottom search/topic manager.
- Implement active/muted/remove topic states.

Phase 2: Real fetch provider

- Add minimal API route or local server endpoint.
- Query free/public sources.
- Normalize articles.
- Store fetched articles locally.
- Add refresh behavior.
- Add loading and error states.

Phase 3: Clustering

- Implement deterministic headline similarity clustering.
- Merge duplicate and near-duplicate stories.
- Show source count.
- Expand card to reveal sources.

Phase 4: Deployment

- Match GitHub deployment pattern from nearby projects.
- Keep frontend static if possible.
- Deploy API through the smallest free-compatible layer.
- Document local development and deployment steps.

Phase 5: Optional intelligence

- Add semantic relevance filtering.
- Add embedding-based clustering.
- Add generated summaries.
- Add export/import JSON.
- Add optional sync only if user demand justifies it.

## MVP Scope

MVP must include:

- Mobile-first Plahp web app.
- Local topic storage.
- No accounts or login.
- Unified chronological feed.
- Persistent bottom search UI.
- Expanded topic manager.
- Add topic.
- Mute topic.
- Remove topic.
- Headline-only story cards.
- Expandable story details.
- Source list on expanded cards.
- Story clustering.
- Empty state.
- Loading state.
- Error state.
- Free/open-source-friendly architecture.

MVP should not include:

- Accounts.
- Passwords.
- Email capture.
- Push notifications.
- Recommendations.
- Trending stories.
- Political/bias scoring.
- Editorial judgment.
- Infinite unrelated content.
- Complex onboarding.
- Native mobile app.
- Paid APIs as hard requirements.

## Implementation Notes for Codex

Start by inspecting the parent directory for existing project patterns, especially:

- Package manager.
- Framework preferences.
- GitHub deployment workflows.
- Static hosting patterns.
- Styling conventions.

Then scaffold Plahp in a new project directory unless the user specifies an existing repo.

Suggested first implementation:

- Vite + React + TypeScript.
- Single-page app.
- App shell with centered feed column.
- IndexedDB topic store.
- Mock fetch provider returning seeded article data.
- Deterministic clustering utility with unit tests.
- CSS tuned for mobile first.

Suggested component structure:

```text
src/
  app/
    App.tsx
  components/
    Feed.tsx
    StoryCard.tsx
    BottomTopicBar.tsx
    TopicManager.tsx
    EmptyState.tsx
  data/
    db.ts
    mockProvider.ts
    types.ts
  lib/
    clustering.ts
    dates.ts
    normalize.ts
  styles/
    app.css
```

Suggested first user flow:

1. User opens app.
2. Empty state appears.
3. User taps bottom search.
4. User types a topic and presses Enter.
5. Topic is saved locally.
6. Mock stories appear in the unified feed.
7. User taps a card.
8. Card expands to show summary and sources.
9. User opens topic manager and mutes/removes a topic.
10. Feed updates immediately.

## Product Guardrails

Every implementation decision should be checked against these questions:

- Does this show only what the user explicitly asked for?
- Does this preserve local-first behavior?
- Does this avoid accounts and identity?
- Does this keep the feed finite and calm?
- Does this reduce clutter?
- Does this make the app faster or simpler?
- Is every story grounded in real source URLs?
- Can the user understand why this appeared in their feed?

If a feature violates these principles, defer it.

## Open Questions

These can be decided during implementation:

- Should removed topics be permanently deleted or archived locally?
- Should cards show exact timestamps or only relative times?
- Should feed refresh be manual, automatic on app open, or both?
- Which free source provider should power the first real API?
- Should source domains be shown on collapsed cards or only expanded cards?
- Should the first version use monospace typography or a softer system UI font?

## Initial Build Prompt for Codex

Build Plahp, a local-first mobile web app for a personal news stream. It should have no accounts, no login, no recommendations, and no content outside topics the user explicitly adds.

Use a simple Vite + React + TypeScript stack unless the surrounding repo strongly suggests a different pattern. Store user topics locally in IndexedDB. Build a mobile-first unified chronological feed with headline-only clustered story cards. Cards expand to show a short summary and source links. Add a persistent minimal bottom search/topic manager that expands when focused and lets users add, mute, and remove topics. Start with a mock provider and deterministic story clustering so the UI works before connecting real public news/search sources.

The visual design should be black and white, sparse, terminal-inspired but not literally a terminal, with gentle shadows, strong typography, and no decorative clutter. The app should feel finite, calm, and focused. If there are no new stories, show a beautiful empty state rather than filling the screen with unrelated content.

Keep the architecture open-source-friendly and free to run at small scale. Do not add authentication, tracking, paid API dependencies, recommendations, trending sections, or notifications in the MVP.
