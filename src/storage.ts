import type { Article, Topic } from "./types";
import type { Theme } from "./theme";

const storageKey = "sighlo-topics";
const articleStorageKey = "sighlo-articles";
const themeStorageKey = "sighlo-theme";

export function readTopics(): Topic[] {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Topic[]) : [];
  } catch {
    return [];
  }
}

export function saveTopics(topics: Topic[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(topics));
}

export function readArticles(): Article[] {
  try {
    const saved = window.localStorage.getItem(articleStorageKey);
    return saved ? (JSON.parse(saved) as Article[]) : [];
  } catch {
    return [];
  }
}

export function saveArticles(articles: Article[]) {
  window.localStorage.setItem(articleStorageKey, JSON.stringify(articles));
}

export function readTheme(): Theme {
  const theme = window.localStorage.getItem(themeStorageKey);
  return theme === "dark" || theme === "monokai" || theme === "gruvbox" || theme === "atom-one-dark" || theme === "atom-one-light" || theme === "tokyo-night" ? theme : "light";
}

export function saveTheme(theme: Theme) {
  window.localStorage.setItem(themeStorageKey, theme);
}
