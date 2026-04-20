import { ChevronLeft, ChevronRight } from "lucide-react";

/** @typedef {{ label: string, onClick?: () => void }} BreadcrumbItem */
/** @typedef {{ onClick: () => void, label?: string, ariaLabel?: string }} BackControl */

export function SectionHeader({ title, subtitle, action, eyebrow, back, breadcrumbItems }) {
  const showNavRow = Boolean(back || (breadcrumbItems && breadcrumbItems.length > 0));

  return (
    <div
      style={{
        marginBottom: 32,
        paddingBottom: 18,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {showNavRow && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {back && (
            <button
              type="button"
              className="section-header-back"
              onClick={back.onClick}
              aria-label={back.ariaLabel || back.label || "Go back"}
              title={back.label || undefined}
            >
              <ChevronLeft size={22} strokeWidth={2} aria-hidden />
            </button>
          )}
          {breadcrumbItems && breadcrumbItems.length > 0 && (
            <nav
              style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minWidth: 0 }}
              aria-label="Location"
            >
              {breadcrumbItems.map((item, i) => (
                <span key={`${item.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <ChevronRight size={14} color="var(--text-4)" aria-hidden />}
                  {item.onClick ? (
                    <button
                      type="button"
                      className="section-header-crumb"
                      onClick={item.onClick}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-2)",
                        padding: "2px 0",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
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
    </div>
  );
}
