import { Database } from "lucide-react";
import { StatusBadge } from "./ui/Badge.jsx";

export function QueueTable({ queues, namespaces, onOpen }) {
  return (
    <div className="data-table">
      <div
        className="table-header"
        style={{ gridTemplateColumns: "2fr 1.2fr 0.5fr 1fr 1fr 1fr 0.9fr 1fr" }}
      >
        {["Queue", "Namespace", "Shards", "Messages", "Pub/s", "Con/s", "Lag", "Status"].map(
          (h) => (
            <span key={h}>{h}</span>
          ),
        )}
      </div>
      {queues.map((q) => {
        const ns = namespaces.find((n) => n.id === q.namespace);
        return (
          <div
            key={q.id}
            onClick={() => onOpen(q)}
            className="table-row clickable"
            style={{ gridTemplateColumns: "2fr 1.2fr 0.5fr 1fr 1fr 1fr 0.9fr 1fr" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Database size={13} color="var(--text-3)" />
              <span style={{ fontWeight: 500 }}>{q.name}</span>
            </div>
            <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{ns?.name}</span>
            <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}>
              {q.shardCount}
            </span>
            <span className="mono" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{q.totalMessages.toLocaleString()}</span>
            <span className="mono" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{q.publishRate.toLocaleString()}</span>
            <span className="mono" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{q.consumeRate.toLocaleString()}</span>
            <span
              className="mono"
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                color: q.lag > 10000 ? "var(--warning)" : "var(--text-2)",
              }}
            >
              {q.lag.toLocaleString()}
            </span>
            <StatusBadge status={q.status} />
          </div>
        );
      })}
    </div>
  );
}
