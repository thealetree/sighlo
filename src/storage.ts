import type { Article, Settings, Topic } from "./types";
import { DEFAULT_THEME_PREFS, isThemeId, type ThemePrefs } from "./theme";

const storageKey = "sighlo-topics";
const articleStorageKey = "sighlo-articles";
const themeStorageKey = "sighlo-theme";
const settingsStorageKey = "sighlo-settings";
const readStorageKey = "sighlo-read";
const dismissedStorageKey = "sighlo-dismissed";

// Keep the read/dismissed history from growing without bound.
const ID_HISTORY_CAP = 4000;

function readIdList(key: string): string[] {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as string[]) : [];
  } catch {
    return [];
  }
}

export const readReadIds = () => readIdList(readStorageKey);
export const saveReadIds = (ids: string[]) => window.localStorage.setItem(readStorageKey, JSON.stringify(ids.slice(-ID_HISTORY_CAP)));
export const readDismissedIds = () => readIdList(dismissedStorageKey);
export const saveDismissedIds = (ids: string[]) => window.localStorage.setItem(dismissedStorageKey, JSON.stringify(ids.slice(-ID_HISTORY_CAP)));

export const DEFAULT_SETTINGS: Settings = { maxStories: 40, maxAgeDays: 30, sources: { google: true, bing: true } };

// Map the pre-1.0 single-string theme ids onto the current theme set.
const LEGACY_THEME_MAP: Record<string, Partial<ThemePrefs>> = {
  light: { mode: "light", light: "light-plus" },
  "atom-one-light": { mode: "light", light: "github-light" },
  dark: { mode: "dark", dark: "dark-plus" },
  monokai: { mode: "dark", dark: "monokai" },
  gruvbox: { mode: "dark", dark: "gruvbox-dark" },
  "atom-one-dark": { mode: "dark", dark: "one-dark" },
  "tokyo-night": { mode: "dark", dark: "dark-plus" },
};

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

export function readThemePrefs(): ThemePrefs {
  const raw = window.localStorage.getItem(themeStorageKey);
  if (!raw) return DEFAULT_THEME_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
    if (parsed && typeof parsed === "object" && parsed.mode) {
      return {
        mode: parsed.mode === "light" || parsed.mode === "dark" ? parsed.mode : "system",
        light: parsed.light && isThemeId(parsed.light) ? parsed.light : DEFAULT_THEME_PREFS.light,
        dark: parsed.dark && isThemeId(parsed.dark) ? parsed.dark : DEFAULT_THEME_PREFS.dark,
      };
    }
  } catch {
    // Not JSON — fall through to the legacy single-string migration below.
  }
  return { ...DEFAULT_THEME_PREFS, ...LEGACY_THEME_MAP[raw] };
}

export function saveThemePrefs(prefs: ThemePrefs) {
  window.localStorage.setItem(themeStorageKey, JSON.stringify(prefs));
}

export function readSettings(): Settings {
  try {
    const saved = window.localStorage.getItem(settingsStorageKey);
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved) as Partial<Settings>;
    return {
      maxStories: Number.isFinite(parsed.maxStories) ? Number(parsed.maxStories) : DEFAULT_SETTINGS.maxStories,
      maxAgeDays: Number.isFinite(parsed.maxAgeDays) ? Number(parsed.maxAgeDays) : DEFAULT_SETTINGS.maxAgeDays,
      sources: { ...DEFAULT_SETTINGS.sources, ...(parsed.sources ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}
