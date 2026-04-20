import { useState, useEffect } from "react";
import { readStoredTheme, persistTheme, applyThemeToDocument } from "../constants/theme.js";

export function useTheme() {
  const [theme, setTheme] = useState(() => readStoredTheme());

  useEffect(() => {
    applyThemeToDocument(theme);
    persistTheme(theme);
  }, [theme]);

  return [theme, setTheme];
}
