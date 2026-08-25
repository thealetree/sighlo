export type ThemeMode = "light" | "dark" | "system";

export type ThemeDef = { id: string; label: string; mode: "light" | "dark" };

// VS Code–inspired palettes, an equal number of light and dark.
export const THEMES: ThemeDef[] = [
  { id: "light-plus", label: "Paper", mode: "light" },
  { id: "quiet-light", label: "Hush", mode: "light" },
  { id: "solarized-light", label: "Parchment", mode: "light" },
  { id: "github-light", label: "Porcelain", mode: "light" },
  { id: "blossom", label: "Blossom", mode: "light" },
  { id: "gruvbox-light", label: "Hearth", mode: "light" },
  { id: "dark-plus", label: "Graphite", mode: "dark" },
  { id: "monokai", label: "Velvet", mode: "dark" },
  { id: "dracula", label: "Nocturne", mode: "dark" },
  { id: "one-dark", label: "Deep Signal", mode: "dark" },
  { id: "phosphor", label: "Phosphor", mode: "dark" },
  { id: "gruvbox-dark", label: "Kiln", mode: "dark" },
];

export const LIGHT_THEMES = THEMES.filter((theme) => theme.mode === "light");
export const DARK_THEMES = THEMES.filter((theme) => theme.mode === "dark");

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));
export const isThemeId = (value: string): boolean => THEME_IDS.has(value);

export type ThemeId = string;

export type ThemePrefs = { mode: ThemeMode; light: ThemeId; dark: ThemeId };

export const DEFAULT_THEME_PREFS: ThemePrefs = { mode: "system", light: "light-plus", dark: "dark-plus" };

// Which concrete theme is applied, given the preference and the OS light/dark setting.
export function resolveThemeId(prefs: ThemePrefs, systemPrefersDark: boolean): ThemeId {
  if (prefs.mode === "light") return prefs.light;
  if (prefs.mode === "dark") return prefs.dark;
  return systemPrefersDark ? prefs.dark : prefs.light;
}
