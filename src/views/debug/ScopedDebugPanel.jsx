import { useState, useMemo, useEffect } from "react";
import { BarChart2, ChevronDown } from "lucide-react";
import { DebugWorkbench } from "./DebugCenter.jsx";
import { namespacesForAccount } from "../../utils/explorerHelpers.js";

export function ScopedDebugPanel({ state, flow }) {
  const [open, setOpen] = useState(true);

  const scopeQueues = useMemo(() => {
    if (flow.queueId) {
      const q = state.queues.find((x) => x.id === flow.queueId);
      return q ? [q] : [];
    }
    if (flow.namespaceId) {
      return state.queues.filter((q) => q.namespace === flow.namespaceId);
    }
    const nsList = namespacesForAccount(state, flow.accountId);
    const ids = new Set(nsList.flatMap((n) => n.queues || []));
    return state.queues.filter((q) => ids.has(q.id));
  }, [state.queues, state.namespaces, flow.accountId, flow.namespaceId, flow.queueId]);

  const [localQ, setLocalQ] = useState("");
  useEffect(() => {
    if (flow.queueId) return;
    setLocalQ(scopeQueues[0]?.id || "");
  }, [flow.accountId, flow.namespaceId, flow.queueId, scopeQueues]);

  const selectedQ = flow.queueId || localQ;
  const showQueuePicker = !flow.queueId && scopeQueues.length > 1;

  const account = state.accounts.find((a) => a.id === flow.accountId);
  const namespace = flow.namespaceId ? state.namespaces.find((n) => n.id === flow.namespaceId) : null;
  const queue = flow.queueId ? state.queues.find((q) => q.id === flow.queueId) : null;

  const scopeTitle = useMemo(() => {
    if (flow.segmentId && queue) return `Segment ${flow.segmentId}`;
    if (flow.shardId != null && queue) return `Shard ${flow.shardId} · ${queue.name}`;
    if (queue) return `Queue · ${queue.name}`;
    if (namespace) return `Namespace · ${namespace.name}`;
    return `Account · ${account?.name || "—"}`;
  }, [flow.segmentId, flow.shardId, queue, namespace, account]);

  const subtitle = useMemo(() => {
    if (flow.segmentId) return "Diagnostics filtered to this segment where applicable (errors, infrastructure).";
    if (flow.shardId != null) return "Diagnostics filtered to this shard (tables, error logs).";
    if (flow.queueId) return "Full debug tabs for this queue.";
    if (flow.namespaceId) return "Debug tools for queues in this namespace — pick a queue if there are several.";
    return "Debug tools for all queues in this account — pick a queue when more than one exists.";
  }, [flow]);

  const focusShardId = flow.shardId != null ? flow.shardId : null;
  const focusSegmentId = flow.segmentId || null;

  return (
    <section
      style={{
        marginTop: 56,
        paddingTop: 32,
        borderTop: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -1,
          left: 0,
          width: 48,
          height: 2,
          background: "var(--accent)",
          borderRadius: 2,
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: open ? 24 : 0,
          padding: "14px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.background = "var(--surface-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--surface)";
        }}
      >
        <span style={{ display: "flex", alignItems: "baseline", gap: 12, textAlign: "left" }}>
          <BarChart2 size={15} color="var(--accent)" style={{ transform: "translateY(2px)" }} />
          <span className="eyebrow" style={{ color: "var(--text-3)" }}>Debug</span>
          <span
            className="serif"
            style={{
              fontSize: 18,
              fontStyle: "italic",
              fontWeight: 400,
              letterSpacing: "-0.015em",
              color: "var(--text)",
              lineHeight: 1.1,
            }}
          >
            {scopeTitle}
          </span>
        </span>
        <ChevronDown
          size={17}
          color="var(--text-3)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <div className="fade-in">
          {!scopeQueues.length || !selectedQ ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-3)", padding: 32, fontSize: 13 }}>
              Add a namespace and queue to use health checks, traces, and diagnostics at this level.
            </div>
          ) : (
            <DebugWorkbench
              state={state}
              title={`Debug · ${scopeTitle}`}
              subtitle={subtitle}
              selectedQ={selectedQ}
              onSelectQueue={setLocalQ}
              queueOptions={scopeQueues}
              showQueuePicker={showQueuePicker}
              focusShardId={focusShardId}
              focusSegmentId={focusSegmentId}
            />
          )}
        </div>
      )}
    </section>
  );
}
