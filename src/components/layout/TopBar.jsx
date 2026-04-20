import { ChevronRight, Search, LogOut } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle.jsx";

/** @typedef {{ label: string, onClick?: () => void }} BreadcrumbItem */

export function TopBar({ breadcrumbItems, user, onLogout, theme, onThemeChange }) {
  const items = breadcrumbItems?.length ? breadcrumbItems : [{ label: "—" }];
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <header
      style={{
        height: 60,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        background: "color-mix(in srgb, var(--surface) 82%, transparent)",
        backdropFilter: "saturate(1.4) blur(10px)",
        WebkitBackdropFilter: "saturate(1.4) blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* ── Breadcrumbs ──────────────────────────────────────── */}
      <nav style={{ display: "flex", alignItems: "center", gap: 4 }} aria-label="Breadcrumb">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={`${item.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && (
                <ChevronRight size={13} color="var(--text-4)" style={{ margin: "0 3px" }} />
              )}
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 400,
                    color: "var(--text-3)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    margin: 0,
                    borderRadius: 6,
                    transition: "color 0.15s, background 0.15s",
                    letterSpacing: "-0.005em",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-3)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={isLast ? "serif" : ""}
                  style={{
                    fontSize: isLast ? 15 : 13,
                    fontStyle: isLast ? "italic" : "normal",
                    fontWeight: isLast ? 400 : 600,
                    color: "var(--text)",
                    padding: "4px 8px",
                    letterSpacing: isLast ? "-0.015em" : "-0.005em",
                  }}
                >
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {/* ── Right rail ───────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          <Search size={13} color="var(--text-3)" />
          <input
            placeholder="Search resources…"
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              width: 180,
              fontSize: 13,
            }}
            onFocus={(e) => {
              e.currentTarget.parentElement.style.borderColor = "var(--accent-border)";
              e.currentTarget.parentElement.style.boxShadow = "0 0 0 3px var(--accent-bg)";
            }}
            onBlur={(e) => {
              e.currentTarget.parentElement.style.borderColor = "var(--border)";
              e.currentTarget.parentElement.style.boxShadow = "none";
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-3)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "1px 6px",
            }}
          >
            ⌘K
          </span>
        </div>

        <div style={{ width: 1, height: 26, background: "var(--border)" }} />

        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />

        <div style={{ width: 1, height: 26, background: "var(--border)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right", lineHeight: 1.25 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.005em" }}>
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{user.email}</div>
          </div>
          <div
            style={{
              width: 34,
              height: 34,
              background: "var(--text)",
              color: "var(--surface)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.02em",
              border: "1px solid var(--border)",
            }}
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="btn-ghost btn"
            title="Logout"
            style={{ padding: "7px 9px" }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
