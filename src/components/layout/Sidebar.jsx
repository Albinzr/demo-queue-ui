import { LayoutGrid, BarChart2 } from "lucide-react";

export function Sidebar({ view, setView, state, flow, onAccountChange }) {
  const degraded = state.queues.filter((q) => q.status !== "healthy").length;
  const account = state.accounts.find((a) => a.id === flow.accountId);

  const navItems = [
    { id: "explorer", label: "Resources", hint: "Browse", icon: LayoutGrid },
    { id: "debug", label: "Debug Center", hint: "Observe", icon: BarChart2 },
  ];

  return (
    <aside
      style={{
        width: 248,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div style={{ padding: "22px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            className="serif"
            style={{
              fontSize: 24,
              fontStyle: "italic",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            Queue
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Mgr
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          v2.14.0 · Production
        </div>
      </div>

      <div className="hairline" style={{ margin: "0 20px" }} />

      {/* ── Account (Resources scope) ─────────────────────────── */}
      <div style={{ padding: "14px 20px 6px" }}>
        <label htmlFor="sidebar-account" className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
          Account
        </label>
        <select
          id="sidebar-account"
          value={flow.accountId}
          onChange={(e) => onAccountChange?.(e.target.value)}
          style={{ width: "100%", fontSize: 13 }}
        >
          {state.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav style={{ padding: "12px 12px 12px", flex: 1, overflowY: "auto" }}>
        <div className="eyebrow" style={{ padding: "0 10px 10px" }}>Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: active ? "var(--surface-2)" : "transparent",
                border: "1px solid",
                borderColor: active ? "var(--border)" : "transparent",
                borderRadius: 8,
                color: active ? "var(--text)" : "var(--text-2)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                fontFamily: "var(--font-sans)",
                transition: "all 0.15s",
                textAlign: "left",
                marginBottom: 3,
                position: "relative",
                letterSpacing: "-0.005em",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--surface-2)";
                  e.currentTarget.style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-2)";
                }
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: -12,
                    top: 10,
                    bottom: 10,
                    width: 2,
                    background: "var(--accent)",
                    borderRadius: 2,
                  }}
                />
              )}
              <Icon size={15} strokeWidth={active ? 2 : 1.6} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === "debug" && degraded > 0 && (
                <span
                  title={`${degraded} degraded queue${degraded > 1 ? "s" : ""}`}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--warning)",
                    background: "var(--warning-bg)",
                    border: "1px solid var(--warning-border)",
                    padding: "1px 6px",
                    borderRadius: 99,
                    flexShrink: 0,
                  }}
                >
                  {degraded}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer card ──────────────────────────────────────── */}
      <div style={{ padding: 16 }}>
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "14px 16px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: 2, height: "100%",
              background: "var(--accent)",
              opacity: 0.6,
            }}
          />
          <div className="eyebrow" style={{ marginBottom: 6 }}>Active</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
            {account?.name || "—"}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              marginTop: 10,
              lineHeight: 1.55,
            }}
          >
            Flow: <span style={{ color: "var(--text-2)" }}>account → namespace → queue → shard → segment</span>.
          </div>
        </div>
      </div>
    </aside>
  );
}
