import { useState } from "react";
import { Key, Eye, EyeOff, Copy, MoreHorizontal } from "lucide-react";
import { Badge } from "./ui/Badge.jsx";

export function ServiceAccountTable({ accounts }) {
  const [showKey, setShowKey] = useState({});
  return (
    <div className="data-table">
      <div
        className="table-header"
        style={{ gridTemplateColumns: "1.4fr 1.4fr 2fr 1fr 60px" }}
      >
        {["Name", "API Key", "Permissions", "Created", ""].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {accounts.map((sa) => (
        <div
          key={sa.id}
          className="table-row"
          style={{ gridTemplateColumns: "1.4fr 1.4fr 2fr 1fr 60px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Key size={13} color="var(--text-3)" />
            <span style={{ fontWeight: 500 }}>{sa.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
              {showKey[sa.id]
                ? `${sa.keyPrefix}_████████████`
                : `${sa.keyPrefix}_••••••••••••`}
            </span>
            <button
              type="button"
              className="btn-ghost btn"
              style={{ padding: "3px 6px" }}
              onClick={() => setShowKey({ ...showKey, [sa.id]: !showKey[sa.id] })}
            >
              {showKey[sa.id] ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button type="button" className="btn-ghost btn" style={{ padding: "3px 6px" }}>
              <Copy size={12} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sa.permissions.map((p, j) => (
              <Badge key={j} color="accent" size="sm">
                {p.queue}: {p.perms.join(", ")}
              </Badge>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{sa.created}</span>
          <button type="button" className="btn-ghost btn">
            <MoreHorizontal size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
