import { FormEvent, useEffect, useMemo, useState } from "react";
import { clusterArticles } from "./clustering";
import { fetchTopicArticles } from "./news";
import { readArticles, readTheme, readTopics, saveArticles, saveTheme, saveTopics } from "./storage";
import { themes, type Theme } from "./theme";
import type { Article, Story, Topic } from "./types";

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
  onToggle,
}: {
  story: Story;
  topics: Topic[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const labels = story.topicIds
    .map((topicId) => topics.find((topic) => topic.id === topicId)?.label)
    .filter(Boolean);
  const sourceCount = new Set(story.articles.map((article) => article.sourceName)).size;

  return (
    <article className={`story-card ${expanded ? "is-expanded" : ""}`}>
      <button
        className="story-trigger"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="story-meta">
          <span>{labels.join(" · ")}</span>
          <span>{relativeTime(story.latestPublishedAt)}</span>
        </div>
        <h2>{story.headline}</h2>
        <span className="source-count">{sourceCount} {sourceCount === 1 ? "source" : "sources"}</span>
        <span className="expand-mark" aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="story-detail">
          <p>{story.summary}</p>
          <div className="source-list">
            {story.articles.map((article) => (
              <a key={article.id} href={article.url} target="_blank" rel="noreferrer">
                <span>{article.sourceName}</span>
                <strong>{article.title}</strong>
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
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "error">("idle");
  const [refreshError, setRefreshError] = useState("");
  const activeTopics = topics.filter((topic) => topic.status === "active");
  const feed = useMemo(
    () => clusterArticles(articles.filter((article) => activeTopics.some((topic) => topic.id === article.topicId)), topics),
    [activeTopics, articles, topics],
  );

  useEffect(() => saveTopics(topics), [topics]);
  useEffect(() => saveArticles(articles), [articles]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

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

  return (
    <main className="app-shell">
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
              onToggle={() => setExpandedStoryId((current) => (current === story.id ? null : story.id))}
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
            <div className="manager-heading">
              <p className="eyebrow">Your streams</p>
              <button className="theme-toggle" type="button" onClick={() => setThemeOpen((open) => !open)} aria-expanded={themeOpen}>
                <span>Theme</span><span>{themeOpen ? "−" : "+"}</span>
              </button>
            </div>
            {themeOpen && <div className="theme-options">
              {themes.map(([themeId, label]) => (
                <button key={themeId} className={theme === themeId ? "is-selected" : ""} type="button" onClick={() => setTheme(themeId)}>
                  {label}
                </button>
              ))}
            </div>}
            <div className="manager-divider" />
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
