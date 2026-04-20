export function SectionHeader({ title, subtitle, action, eyebrow }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 32,
        gap: 20,
        paddingBottom: 18,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {eyebrow && (
          <div className="eyebrow" style={{ marginBottom: 10, color: "var(--accent)" }}>
            {eyebrow}
          </div>
        )}
        <h1
          className="serif"
          style={{
            fontSize: 36,
            fontStyle: "italic",
            fontWeight: 400,
            color: "var(--text)",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            marginBottom: subtitle ? 8 : 0,
            wordBreak: "break-word",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 14,
              color: "var(--text-2)",
              lineHeight: 1.55,
              maxWidth: 680,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
