import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ theme, onThemeChange, style }) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => onThemeChange(dark ? "light" : "dark")}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 34,
        height: 34,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: "pointer",
        color: "var(--text-2)",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-3)";
        e.currentTarget.style.color = "var(--text)";
        e.currentTarget.style.borderColor = "var(--text-4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.color = "var(--text-2)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
