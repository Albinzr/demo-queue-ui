import { TrendingUp, TrendingDown } from "lucide-react";

const COLORS = {
  default: { bg: "var(--surface-3)", text: "var(--text-2)", border: "var(--border)" },
  success: { bg: "var(--success-bg)", text: "var(--success)", border: "var(--success-border)" },
  warning: { bg: "var(--warning-bg)", text: "var(--warning)", border: "var(--warning-border)" },
  error: { bg: "var(--error-bg)", text: "var(--error)", border: "var(--error-border)" },
  info: { bg: "var(--info-bg)", text: "var(--info)", border: "var(--info-border)" },
  accent: { bg: "var(--accent-bg)", text: "var(--accent)", border: "var(--accent-border)" },
};

export function Badge({ children, color = "default", size = "sm" }) {
  const c = COLORS[color] || COLORS.default;
  return (
    <span
      className="badge"
      style={{
        background: c.bg,
        color: c.text,
        borderColor: c.border,
        fontSize: size === "sm" ? 10.5 : 11.5,
        padding: size === "sm" ? "2px 8px" : "3px 10px",
        fontWeight: 500,
        letterSpacing: 0.01,
      }}
    >
      {children}
    </span>
  );
}

const STATUS_MAP = {
  healthy:  { color: "success", dot: "var(--success)", pulse: "pulse-ring", label: "Healthy" },
  active:   { color: "success", dot: "var(--success)", pulse: "pulse-ring", label: "Active" },
  degraded: { color: "warning", dot: "var(--warning)", pulse: "pulse-warn", label: "Degraded" },
  lagging:  { color: "warning", dot: "var(--warning)", pulse: "pulse-warn", label: "Lagging" },
  idle:     { color: "default", dot: "var(--text-3)", pulse: "", label: "Idle" },
  closed:   { color: "default", dot: "var(--text-4)", pulse: "", label: "Closed" },
  error:    { color: "error",   dot: "var(--error)",  pulse: "", label: "Error" },
};

export function StatusBadge({ status }) {
  const m = STATUS_MAP[status] || STATUS_MAP.idle;
  return (
    <Badge color={m.color}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: m.dot,
          flexShrink: 0,
          animation: m.pulse ? `${m.pulse} 2s infinite` : "none",
        }}
      />
      {m.label}
    </Badge>
  );
}

/**
 * Editorial metric card.
 * Large, left-aligned numeral with tiny label above and delta below.
 * A thin accent hairline runs up the top edge — quietly decorative.
 */
export function MetricCard({ label, value, unit, sub, trend, color }) {
  const deltaColor =
    trend === "up" ? "var(--success)"
    : trend === "down" ? "var(--error)"
    : "var(--text-3)";

  return (
    <div className="card" style={{ paddingTop: 18, paddingBottom: 18, overflow: "hidden" }}>
      {/* decorative accent hairline */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 18,
          right: 18,
          height: 1,
          background: "linear-gradient(90deg, var(--accent-border), transparent 70%)",
        }}
      />
      <div
        className="eyebrow"
        style={{
          marginBottom: 14,
          fontSize: 10,
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: sub ? 10 : 0 }}>
        <span
          className="serif"
          style={{
            fontSize: 34,
            fontWeight: 400,
            fontStyle: "normal",
            color: color || "var(--text)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11.5,
            color: deltaColor,
            letterSpacing: "-0.005em",
          }}
        >
          {trend === "up" && <TrendingUp size={12} />}
          {trend === "down" && <TrendingDown size={12} />}
          {sub}
        </div>
      )}
    </div>
  );
}
