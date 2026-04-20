import { StatusBadge } from "./ui/Badge.jsx";

const defaultSeg = () => [
  {
    id: "seg_0001",
    startOffset: 0,
    endOffset: 0,
    messageCount: 0,
    sizeMb: 0,
    status: "active",
    created: new Date().toISOString().slice(0, 16).replace("T", " "),
    closed: null,
  },
];

export function SegmentView({ queueId, shardId, segments, rows, onSegmentClick }) {
  const key = `${queueId}_${shardId}`;
  const segs = rows ?? segments[key] ?? defaultSeg();
  const clickable = typeof onSegmentClick === "function";
  return (
    <div className="data-table">
      <div
        className="table-header"
        style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr 0.7fr 0.8fr 1.2fr 1.2fr" }}
      >
        {[
          "Segment ID",
          "Start Offset",
          "End Offset",
          "Messages",
          "Size",
          "Status",
          "Created",
          "Closed",
        ].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {segs.map((s) => (
        <div
          key={s.id}
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : undefined}
          onClick={clickable ? () => onSegmentClick(s) : undefined}
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") onSegmentClick(s);
                }
              : undefined
          }
          className={`table-row${clickable ? " clickable" : ""}`}
          style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr 0.7fr 0.8fr 1.2fr 1.2fr" }}
        >
          <span
            className="mono"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: s.status === "active" ? "var(--accent)" : "var(--text-2)",
            }}
          >
            {s.id}
          </span>
          <span className="mono" style={{ fontSize: 12 }}>
            {s.startOffset.toLocaleString()}
          </span>
          <span className="mono" style={{ fontSize: 12 }}>
            {s.endOffset.toLocaleString()}
          </span>
          <span style={{ fontSize: 13 }}>{s.messageCount.toLocaleString()}</span>
          <span style={{ fontSize: 13 }}>{s.sizeMb} MB</span>
          <StatusBadge status={s.status} />
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>{s.created}</span>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{s.closed || "—"}</span>
        </div>
      ))}
    </div>
  );
}
