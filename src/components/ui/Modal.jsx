import { createPortal } from "react-dom";
import { X } from "lucide-react";

function getMountNode() {
  if (typeof document === "undefined") return null;
  return document.getElementById("main-modal-root");
}

export function Modal({ open, onClose, title, subtitle, children, width = 540 }) {
  if (!open) return null;

  const mount = getMountNode() ?? document.body;
  const useViewport = mount === document.body;

  const content = (
    <div
      className={`modal-backdrop fade-in${useViewport ? " modal-backdrop--viewport" : ""}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-panel"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-panel__header">
          <div style={{ minWidth: 0, paddingRight: 8 }}>
            <h2
              id="modal-title"
              className="serif"
              style={{
                fontSize: 22,
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                marginBottom: subtitle ? 6 : 0,
                color: "var(--text)",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-2)",
                  lineHeight: 1.6,
                  maxWidth: 520,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-panel__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, mount);
}
