export const themes = [
  ["light", "Paper"],
  ["dark", "Night Shift"],
  ["monokai", "Velvet Terminal"],
  ["gruvbox", "Hearth"],
  ["atom-one-dark", "Deep Signal"],
  ["atom-one-light", "Day Signal"],
  ["tokyo-night", "Midnight Metro"],
] as const;

export type Theme = (typeof themes)[number][0];
