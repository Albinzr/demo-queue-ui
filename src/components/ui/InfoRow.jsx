export function InfoRow({ label, value, mono, valueColor }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 12.5,
          color: "var(--text-3)",
          letterSpacing: 0.01,
        }}
      >
        {label}
      </span>
      <span
        className={mono ? "mono" : ""}
        style={{
          fontSize: mono ? 12 : 13,
          fontWeight: 500,
          color: valueColor || "var(--text)",
          textAlign: "right",
          letterSpacing: mono ? 0 : "-0.005em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
