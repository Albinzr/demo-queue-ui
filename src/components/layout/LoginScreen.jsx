import { useState } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle.jsx";

export function LoginScreen({ onLogin, theme, onThemeChange }) {
  const [loading, setLoading] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* theme toggle */}
      <div style={{ position: "absolute", top: 24, right: 28, zIndex: 10 }}>
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
      </div>

      {/* ── Left: editorial hero ───────────────────────────────── */}
      <section
        style={{
          flex: 1.2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          borderRight: "1px solid var(--border)",
          background:
            "linear-gradient(165deg, color-mix(in srgb, var(--surface) 70%, transparent), transparent 65%)",
          position: "relative",
        }}
      >
        {/* decorative blob */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -120,
            left: -120,
            width: 460,
            height: 460,
            background: `radial-gradient(circle, var(--login-glow), transparent 68%)`,
            pointerEvents: "none",
          }}
        />

        {/* brand lockup */}
        <div className="fade-in" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              className="serif"
              style={{
                fontSize: 26,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
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
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Mgr
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "var(--text-3)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Control Plane · v2.14.0
          </div>
        </div>

        {/* editorial headline */}
        <div className="rise-in" style={{ position: "relative", zIndex: 1, maxWidth: 560 }}>
          <div className="eyebrow" style={{ marginBottom: 24, color: "var(--accent)" }}>
            —  Distributed queues, precisely managed
          </div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(44px, 6vw, 72px)",
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "var(--text)",
              marginBottom: 18,
            }}
          >
            Move messages with <em style={{ color: "var(--accent)" }}>intention.</em>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--text-2)",
              lineHeight: 1.55,
              maxWidth: 480,
            }}
          >
            A workbench for queue infrastructure. Explore namespaces, tune shards,
            and trace a message end-to-end — all from one pane of glass.
          </p>
        </div>

        {/* bottom rail */}
        <div
          className="fade-in"
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: 40,
            flexWrap: "wrap",
            fontSize: 11,
            color: "var(--text-3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <span>SOC 2 Type II</span>
          <span>ISO 27001</span>
          <span>99.99% uptime SLA</span>
        </div>
      </section>

      {/* ── Right: sign-in panel ───────────────────────────────── */}
      <section
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          minWidth: 420,
        }}
      >
        <div
          className="rise-in"
          style={{
            width: "100%",
            maxWidth: 380,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 14 }}>Sign in</div>
          <h2
            className="serif"
            style={{
              fontSize: 38,
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: 10,
            }}
          >
            Welcome back.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-2)",
              marginBottom: 36,
              lineHeight: 1.55,
            }}
          >
            Continue with the account provisioned by your organization.
          </p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setTimeout(onLogin, 900);
            }}
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "13px 16px",
              fontSize: 14,
              borderRadius: 10,
              fontWeight: 500,
              letterSpacing: "-0.005em",
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
                Signing in…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
                <ArrowRight size={14} style={{ marginLeft: 2 }} />
              </>
            )}
          </button>

          <button
            type="button"
            className="btn"
            disabled
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "12px 16px",
              marginTop: 10,
              fontSize: 13,
              color: "var(--text-3)",
              cursor: "not-allowed",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            SSO · SAML (coming soon)
          </button>

          <div
            style={{
              marginTop: 36,
              paddingTop: 20,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "var(--text-3)",
              letterSpacing: "0.04em",
            }}
          >
            <span>Encrypted · TLS 1.3</span>
            <span className="mono">status.queuemgr.io</span>
          </div>
        </div>
      </section>
    </div>
  );
}
