export const THEME_STORAGE_KEY = "queuemanager-theme";

/** Light is the default when nothing valid is stored. */
export function readStoredTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function applyThemeToDocument(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}
