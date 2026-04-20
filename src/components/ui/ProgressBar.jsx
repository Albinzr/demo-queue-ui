export function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, (value / max) * 100);
  const c =
    color || (pct >= 90 ? "var(--error)" : pct >= 70 ? "var(--warning)" : "var(--accent)");
  return (
    <div className="progress-track" style={{ flex: 1 }}>
      <div className="progress-fill" style={{ width: `${pct}%`, background: c }} />
    </div>
  );
}
