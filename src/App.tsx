import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { clusterArticles } from "./clustering";
import InstallPrompt from "./InstallPrompt";
import { fetchArticleSummary, fetchTopicArticles } from "./news";
import { readArticles, readSettings, readThemePrefs, readTopics, saveArticles, saveSettings, saveThemePrefs, saveTopics } from "./storage";
import { DARK_THEMES, LIGHT_THEMES, resolveThemeId, type ThemeDef, type ThemeMode, type ThemePrefs } from "./theme";
import type { Article, Settings, Story, Topic } from "./types";

const STORY_LIMITS = [10, 20, 40, 80, 150];
const AGE_LIMITS = [1, 3, 7, 14, 30, 90];
const ageLabel = (days: number) => (days === 1 ? "24 hours" : `${days} days`);

const relativeTime = (timestamp: string) => {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

function StoryCard({
  story,
  topics,
  expanded,
  enriching,
  onToggle,
}: {
  story: Story;
  topics: Topic[];
  expanded: boolean;
  enriching: boolean;
  onToggle: () => void;
}) {
  const labels = story.topicIds
    .map((topicId) => topics.find((topic) => topic.id === topicId)?.label)
    .filter(Boolean);
  const meta = [
    labels.join(" · "),
    `${story.sourceCount} ${story.sourceCount === 1 ? "source" : "sources"}`,
    relativeTime(story.latestPublishedAt),
  ].filter(Boolean).join("  |  ");

  return (
    <article className={`story-card ${expanded ? "is-expanded" : ""}`}>
      <button
        className="story-trigger"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <h2>{story.headline}</h2>
        <p className="story-meta">{meta}</p>
        <span className="expand-mark" aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="story-detail">
          {story.bullets.length > 0 ? (
            <ul className="story-summary">
              {story.bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          ) : (
            <p className="story-summary-empty">
              {enriching
                ? "Pulling a summary from the source…"
                : "No summary is available for this story — open it at the source below."}
            </p>
          )}
          <div className="source-list">
            {story.articles.map((article) => (
              <a key={article.id} href={article.url} target="_blank" rel="noreferrer">
                <strong>{article.sourceName}</strong>
                <span className="source-read">Read the full story →</span>
                <time>{new Date(article.publishedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function App() {
  const [topics, setTopics] = useState<Topic[]>(readTopics);
  const [articles, setArticles] = useState<Article[]>(readArticles);
  const [query, setQuery] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePrefs, setThemePrefs] = useState<ThemePrefs>(readThemePrefs);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(() => new Set());
  const enrichedArticleIds = useRef<Set<string>>(new Set());
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "error">("idle");
  const [refreshError, setRefreshError] = useState("");
  const activeTopics = topics.filter((topic) => topic.status === "active");
  const feed = useMemo(() => {
    const cutoff = Date.now() - settings.maxAgeDays * 24 * 60 * 60 * 1000;
    const scoped = articles.filter(
      (article) => activeTopics.some((topic) => topic.id === article.topicId) && new Date(article.publishedAt).getTime() >= cutoff,
    );
    return clusterArticles(scoped, topics).slice(0, settings.maxStories);
  }, [activeTopics, articles, topics, settings.maxAgeDays, settings.maxStories]);

  useEffect(() => saveTopics(topics), [topics]);
  useEffect(() => saveArticles(articles), [articles]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolveThemeId(themePrefs, systemDark);
    saveThemePrefs(themePrefs);
  }, [themePrefs, systemDark]);

  const refresh = async (topicsToRefresh = activeTopics) => {
    if (!topicsToRefresh.length) return;
    setRefreshState("loading");
    setRefreshError("");
    const results = await Promise.allSettled(topicsToRefresh.map(fetchTopicArticles));
    const fetched = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (fetched.length) {
      const refreshedIds = new Set(topicsToRefresh.map((topic) => topic.id));
      setArticles((current) => [...current.filter((article) => !refreshedIds.has(article.topicId)), ...fetched]);
    }
    const failures = results.filter((result) => result.status === "rejected");
    setRefreshState(failures.length ? "error" : "idle");
    if (failures.length) setRefreshError("Couldn’t reach the news source. Your saved stories are still here.");
  };

  useEffect(() => {
    if (activeTopics.length) void refresh();
  }, []);

  const addTopic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = query.trim();
    if (!label || topics.some((topic) => topic.label.toLowerCase() === label.toLowerCase())) return;
    const newTopic: Topic = {
      id: crypto.randomUUID(), label, status: "active", createdAt: new Date().toISOString(),
    };
    setTopics((current) => [
      ...current,
      newTopic,
    ]);
    setQuery("");
    setManagerOpen(false);
    void refresh([...activeTopics, newTopic]);
  };

  const updateTopic = (topicId: string, status: Topic["status"]) =>
    setTopics((current) => current.map((topic) => (topic.id === topicId ? { ...topic, status } : topic)));
  const removeTopic = (topicId: string) => {
    setTopics((current) => current.filter((topic) => topic.id !== topicId));
    setArticles((current) => current.filter((article) => article.topicId !== topicId));
  };

  // When a summary-less story is opened, try once to pull a summary from a real publisher
  // URL (Google's opaque links can't be resolved, so those stay link-only).
  const enrichStory = async (story: Story) => {
    if (story.bullets.length) return;
    const target = story.articles.find(
      (article) => article.url && article.sourceDomain && article.sourceDomain !== "news.google.com" && !enrichedArticleIds.current.has(article.id),
    );
    if (!target) return;
    enrichedArticleIds.current.add(target.id);
    setEnrichingIds((current) => new Set(current).add(story.id));
    const summary = await fetchArticleSummary(target.url);
    if (summary) {
      setArticles((current) => current.map((article) => (article.id === target.id ? { ...article, description: summary } : article)));
    }
    setEnrichingIds((current) => {
      const next = new Set(current);
      next.delete(story.id);
      return next;
    });
  };

  const toggleStory = (story: Story) => {
    setExpandedStoryId((current) => (current === story.id ? null : story.id));
    if (expandedStoryId !== story.id) void enrichStory(story);
  };

  // Select a theme within its section. In an explicit Light/Dark mode this also switches to
  // that mode so the choice previews immediately; in System mode it just updates the
  // section's default (the theme used when the OS is in that mode).
  const pickTheme = (theme: ThemeDef) =>
    setThemePrefs((prefs) => ({
      ...prefs,
      [theme.mode]: theme.id,
      mode: prefs.mode === "system" ? "system" : theme.mode,
    }));

  return (
    <main className="app-shell">
      <InstallPrompt />
      <header>
        <a className="wordmark" href="/" aria-label="Sighlo home">sighlo</a>
        {activeTopics.length ? (
          <button className="refresh-button" type="button" onClick={() => void refresh()} disabled={refreshState === "loading"}>
            {refreshState === "loading" ? "refreshing" : "refresh"}
          </button>
        ) : <p>your personal stream</p>}
      </header>

      <section className="feed" aria-live="polite">
        {refreshError && <p className="feed-notice">{refreshError}</p>}
        {refreshState === "loading" && !feed.length ? <div className="loading-state">Finding your streams<span>...</span></div> : feed.length ? (
          feed.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              topics={topics}
              expanded={story.id === expandedStoryId}
              enriching={enrichingIds.has(story.id)}
              onToggle={() => toggleStory(story)}
            />
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-mark">↘</span>
            <h1>Nothing new in your streams.</h1>
            <p>{activeTopics.length ? "Nothing new right now. Try refreshing again later." : "Add a topic below. Sighlo will only show stories you explicitly choose to follow."}</p>
          </div>
        )}
      </section>

      {expandedStoryId && (
        <button
          className="reading-scrim"
          type="button"
          aria-label="Close expanded story"
          onClick={() => setExpandedStoryId(null)}
        />
      )}

      <div className={`topic-dock ${managerOpen ? "is-open" : ""}`}>
        {managerOpen && (
          <div className="topic-manager" aria-label="Your topics">
            <div className="manager-topbar">
              <button className="settings-toggle" type="button" onClick={() => setThemeOpen((open) => !open)} aria-expanded={themeOpen}>
                <span>Settings</span>
                <span className={`settings-chevron ${themeOpen ? "is-open" : ""}`} aria-hidden="true">›</span>
              </button>
              <button className="manager-close" type="button" onClick={() => setManagerOpen(false)} aria-label="Close menu">×</button>
            </div>
            <div className="manager-scroll">
            {themeOpen && (
              <div className="theme-panel">
                <div className="mode-row" role="group" aria-label="Theme mode">
                  {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={themePrefs.mode === mode ? "is-selected" : ""}
                      onClick={() => setThemePrefs((prefs) => ({ ...prefs, mode }))}
                    >
                      {mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
                    </button>
                  ))}
                </div>
                {([["Light", LIGHT_THEMES, themePrefs.light], ["Dark", DARK_THEMES, themePrefs.dark]] as const).map(([heading, list, selectedId]) => (
                  <div className="theme-section" key={heading}>
                    <p className="eyebrow">{heading} <span className="section-note">system default when OS is {heading.toLowerCase()}</span></p>
                    {list.map((themeDef) => (
                      <button
                        key={themeDef.id}
                        type="button"
                        className={`theme-row ${selectedId === themeDef.id ? "is-active" : ""}`}
                        aria-pressed={selectedId === themeDef.id}
                        onClick={() => pickTheme(themeDef)}
                      >
                        <span className={`theme-swatch sw-${themeDef.id}`} aria-hidden="true" />
                        <span className="theme-name">{themeDef.label}</span>
                        <span className="theme-check" aria-hidden="true">{selectedId === themeDef.id ? "●" : "○"}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {themeOpen && (
              <div className="limits-section">
                <p className="eyebrow">Feed limits</p>
                <label className="limit-row">
                  <span>Stories shown</span>
                  <select value={settings.maxStories} onChange={(event) => setSettings((current) => ({ ...current, maxStories: Number(event.target.value) }))}>
                    {STORY_LIMITS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label className="limit-row">
                  <span>Max age</span>
                  <select value={settings.maxAgeDays} onChange={(event) => setSettings((current) => ({ ...current, maxAgeDays: Number(event.target.value) }))}>
                    {AGE_LIMITS.map((value) => <option key={value} value={value}>{ageLabel(value)}</option>)}
                  </select>
                </label>
              </div>
            )}
            <div className="manager-divider" />
            <p className="eyebrow streams-heading">Your streams</p>
            {topics.map((topic) => (
              <div className="topic-row" key={topic.id}>
                <span className={topic.status === "muted" ? "is-muted" : ""}>{topic.label}</span>
                <div>
                  <button type="button" onClick={() => updateTopic(topic.id, topic.status === "active" ? "muted" : "active")}>
                    {topic.status === "active" ? "Mute" : "Unmute"}
                  </button>
                  <button type="button" onClick={() => removeTopic(topic.id)}>Remove</button>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
        <form onSubmit={addTopic} className="topic-form">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setManagerOpen(true)}
            placeholder="Add a topic"
            aria-label="Add a topic"
          />
          {managerOpen && <button className="add-button" type="submit">Add</button>}
          <button className="manager-button" type="button" onClick={() => setManagerOpen((open) => !open)} aria-label="Manage topics">
            {managerOpen ? "×" : "≡"}
          </button>
        </form>
      </div>
    </main>
  );
}
