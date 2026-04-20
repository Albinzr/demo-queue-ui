import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Layers, Plus, GitBranch, ArrowRight, RefreshCw } from "lucide-react";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { MetricCard, StatusBadge, Badge } from "../../components/ui/Badge.jsx";
import { QueueTable } from "../../components/QueueTable.jsx";
import { ServiceAccountTable } from "../../components/ServiceAccountTable.jsx";
import { SegmentView } from "../../components/SegmentView.jsx";
import { genSeries } from "../../utils/genSeries.js";
import {
  namespacesForAccount,
  queuesForNamespace,
  serviceAccountsForNamespace,
  aggregateQueueMetrics,
  segmentDensity,
  getShardList,
  getSegmentsForShard,
  splitShardToTargetCount,
  closeSegmentState,
  rolloverSegmentState,
} from "../../utils/explorerHelpers.js";
import { ScopedDebugPanel } from "../debug/ScopedDebugPanel.jsx";

/** Internal editorial-styled sub-section header. */
function SubsectionHeader({ title, description, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h3
          className="serif"
          style={{
            fontSize: 22,
            fontStyle: "italic",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--text)",
          }}
        >
          {title}
        </h3>
        {description && (
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4, maxWidth: 620 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

export function ResourceExplorer({ flow, setFlow, state, setState }) {
  const account = state.accounts.find((a) => a.id === flow.accountId);
  const nsList = useMemo(() => namespacesForAccount(state, flow.accountId), [state.namespaces, flow.accountId]);

  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [createNsOpen, setCreateNsOpen] = useState(false);
  const [createQueueOpen, setCreateQueueOpen] = useState(false);
  const [createSaOpen, setCreateSaOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  const [accountForm, setAccountForm] = useState({ name: "" });
  const [nsForm, setNsForm] = useState({ name: "", description: "" });
  const [queueForm, setQueueForm] = useState({ name: "", shards: 2 });
  const [saForm, setSaForm] = useState({ name: "", permissions: [] });
  const [splitShardId, setSplitShardId] = useState(null);
  const [splitTargetShards, setSplitTargetShards] = useState("");
  const [namespaceHomeTab, setNamespaceHomeTab] = useState(/** @type {"queue" | "service_account"} */ ("queue"));

  useEffect(() => {
    setNamespaceHomeTab("queue");
  }, [flow.namespaceId]);

  const namespace = flow.namespaceId ? state.namespaces.find((n) => n.id === flow.namespaceId) : null;
  const queue = flow.queueId ? state.queues.find((q) => q.id === flow.queueId) : null;
  const shards = queue ? getShardList(state, queue.id) : [];
  const shard = flow.shardId != null && queue ? shards.find((s) => s.id === flow.shardId) : null;
  const segmentList = queue && flow.shardId != null ? getSegmentsForShard(state, queue.id, flow.shardId) : [];
  const activeSegmentRow = flow.segmentId ? segmentList.find((s) => s.id === flow.segmentId) : null;

  const accountQueues = useMemo(() => {
    const ids = new Set(nsList.flatMap((n) => n.queues || []));
    return state.queues.filter((q) => ids.has(q.id));
  }, [state.queues, nsList]);

  const accountMetrics = aggregateQueueMetrics(accountQueues);
  const nsQueues = namespace ? queuesForNamespace(state, namespace.id) : [];
  const nsMetrics = aggregateQueueMetrics(nsQueues);
  const nsSAs = namespace ? serviceAccountsForNamespace(state, namespace.id) : [];

  const openNamespace = (id) => {
    setFlow({ accountId: flow.accountId, namespaceId: id, queueId: null, shardId: null, segmentId: null });
  };

  const openQueue = (id) => {
    setFlow({
      accountId: flow.accountId,
      namespaceId: flow.namespaceId,
      queueId: id,
      shardId: null,
      segmentId: null,
    });
  };

  const openShard = (shardId) => {
    setFlow({ ...flow, queueId: flow.queueId, shardId, segmentId: null });
  };

  const openSegment = (segmentId) => {
    setFlow({ ...flow, segmentId });
  };

  const createAccount = () => {
    if (!accountForm.name.trim()) return;
    const id = `acc_${Date.now()}`;
    const name = accountForm.name.trim();
    const u = state.user;
    const memberId = `m_${Date.now()}`;
    const joinedAt = new Date().toISOString().slice(0, 10);
    setState({
      ...state,
      accounts: [...state.accounts, { id, name, created: joinedAt }],
      accountMembers: [
        ...(state.accountMembers || []),
        {
          id: memberId,
          accountId: id,
          userId: u.id,
          email: u.email,
          name: u.name,
          role: "owner",
          joinedAt,
        },
      ],
      user: { ...u, accountId: id, account: name },
    });
    setFlow({ accountId: id, namespaceId: null, queueId: null, shardId: null, segmentId: null });
    setAccountForm({ name: "" });
    setCreateAccountOpen(false);
  };

  const createNamespace = () => {
    if (!nsForm.name.trim()) return;
    const id = `ns_${Date.now()}`;
    const newNs = {
      id,
      accountId: flow.accountId,
      name: nsForm.name.trim().toLowerCase().replace(/\s+/g, "_"),
      description: nsForm.description || "—",
      created: new Date().toISOString().slice(0, 10),
      queues: [],
      serviceAccounts: [],
    };
    setState({ ...state, namespaces: [...state.namespaces, newNs] });
    setNsForm({ name: "", description: "" });
    setCreateNsOpen(false);
    openNamespace(id);
  };

  const createQueue = () => {
    if (!queueForm.name.trim() || !namespace) return;
    const newQ = {
      id: `q_${Date.now()}`,
      namespace: namespace.id,
      name: queueForm.name.trim().toLowerCase().replace(/\s+/g, "_"),
      shardCount: Number(queueForm.shards),
      totalMessages: 0,
      publishRate: 0,
      consumeRate: 0,
      lag: 0,
      errorRate: 0,
      status: "healthy",
    };
    const updatedNs = state.namespaces.map((n) =>
      n.id === namespace.id ? { ...n, queues: [...n.queues, newQ.id] } : n
    );
    setState({ ...state, queues: [...state.queues, newQ], namespaces: updatedNs });
    setQueueForm({ name: "", shards: 2 });
    setCreateQueueOpen(false);
    openQueue(newQ.id);
  };

  const toggleSaPerm = (queueName, perm) => {
    const existing = saForm.permissions.find((p) => p.queue === queueName);
    if (existing) {
      const newPerms = existing.perms.includes(perm)
        ? existing.perms.filter((p) => p !== perm)
        : [...existing.perms, perm];
      if (newPerms.length === 0) {
        setSaForm({ ...saForm, permissions: saForm.permissions.filter((p) => p.queue !== queueName) });
      } else {
        setSaForm({
          ...saForm,
          permissions: saForm.permissions.map((p) => (p.queue === queueName ? { ...p, perms: newPerms } : p)),
        });
      }
    } else {
      setSaForm({ ...saForm, permissions: [...saForm.permissions, { queue: queueName, perms: [perm] }] });
    }
  };

  const createServiceAccount = () => {
    if (!saForm.name.trim() || !namespace) return;
    const newSA = {
      id: `sa_${Date.now()}`,
      namespace: namespace.id,
      name: saForm.name.trim().toLowerCase().replace(/\s+/g, "-"),
      keyPrefix: `pk_live_${Math.random().toString(36).slice(2, 6)}`,
      created: new Date().toISOString().slice(0, 10),
      permissions: saForm.permissions,
    };
    const updatedNs = state.namespaces.map((n) =>
      n.id === namespace.id ? { ...n, serviceAccounts: [...n.serviceAccounts, newSA.id] } : n
    );
    setState({
      ...state,
      serviceAccounts: [...state.serviceAccounts, newSA],
      namespaces: updatedNs,
    });
    setSaForm({ name: "", permissions: [] });
    setCreateSaOpen(false);
  };

  const applySplit = () => {
    if (splitShardId == null || !queue) return;
    const target = parseInt(splitTargetShards, 10);
    if (!Number.isFinite(target) || target <= shards.length) return;
    setState((s) => splitShardToTargetCount(s, queue.id, splitShardId, target));
    setSplitOpen(false);
    setSplitShardId(null);
    setSplitTargetShards("");
  };

  /* ── Segment detail ─────────────────────────────────── */
  if (queue && shard && flow.segmentId && activeSegmentRow) {
    const segment = activeSegmentRow;
    const dens = segmentDensity(segment);
    const qNsSeg = state.namespaces.find((n) => n.id === queue.namespace);
    return (
      <div className="fade-in">
        <SectionHeader
          title={segment.id}
          subtitle={`Shard ${shard.id} · ${queue.name}`}
          back={{
            onClick: () => setFlow({ ...flow, segmentId: null }),
            label: "Back to shard",
          }}
          breadcrumbItems={[
            {
              label: account?.name || "Account",
              onClick: () =>
                setFlow({
                  accountId: flow.accountId,
                  namespaceId: null,
                  queueId: null,
                  shardId: null,
                  segmentId: null,
                }),
            },
            {
              label: qNsSeg?.name || queue.namespace,
              onClick: () =>
                setFlow({
                  ...flow,
                  queueId: null,
                  shardId: null,
                  segmentId: null,
                }),
            },
            {
              label: queue.name,
              onClick: () => setFlow({ ...flow, shardId: null, segmentId: null }),
            },
            {
              label: `Shard ${shard.id}`,
              onClick: () => setFlow({ ...flow, segmentId: null }),
            },
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
          <MetricCard label="Messages" value={(segment.messageCount || 0).toLocaleString()} />
          <MetricCard label="Size" value={String(segment.sizeMb || 0)} unit="MB" />
          <MetricCard label="Density" value={String(dens)} unit="msg/MB" color="var(--accent-2)" />
          <MetricCard
            label="Write throughput"
            value={String(segment.writeQps ?? shard.writeQps ?? 0)}
            unit="msg/s"
          />
          <MetricCard label="Read throughput" value={String(segment.readQps ?? shard.readQps ?? 0)} unit="msg/s" />
        </div>
        <div className="card" style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="eyebrow" style={{ minWidth: 110 }}>Offset span</span>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
              {segment.startOffset?.toLocaleString()} → {segment.endOffset?.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="eyebrow" style={{ minWidth: 110 }}>Status</span>
            <StatusBadge status={segment.status} />
          </div>
        </div>
        {segment.status === "active" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setState((s) => closeSegmentState(s, queue.id, shard.id, segment.id));
                setFlow({ ...flow, segmentId: null });
              }}
            >
              Close segment
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setState((s) => rolloverSegmentState(s, queue.id, shard.id, segment.id));
                setFlow({ ...flow, segmentId: null });
              }}
            >
              <RefreshCw size={14} /> Rollover (new active segment)
            </button>
          </div>
        )}
        <ScopedDebugPanel state={state} flow={flow} />
      </div>
    );
  }

  /* ── Shard detail ───────────────────────────────────── */
  if (queue && shard && flow.shardId != null && !(flow.segmentId && activeSegmentRow)) {
    const segs = getSegmentsForShard(state, queue.id, shard.id);
    const proc = Math.min(shard.writeQps || 0, shard.readQps || 0);
    const qNsShard = state.namespaces.find((n) => n.id === queue.namespace);
    return (
      <div className="fade-in">
        <SectionHeader
          title={`Shard ${shard.id}`}
          subtitle={`${queue.name} · active segment ${shard.activeSegment}`}
          back={{
            onClick: () => setFlow({ ...flow, shardId: null, segmentId: null }),
            label: "Back to queue",
          }}
          breadcrumbItems={[
            {
              label: account?.name || "Account",
              onClick: () =>
                setFlow({
                  accountId: flow.accountId,
                  namespaceId: null,
                  queueId: null,
                  shardId: null,
                  segmentId: null,
                }),
            },
            {
              label: qNsShard?.name || queue.namespace,
              onClick: () =>
                setFlow({
                  ...flow,
                  queueId: null,
                  shardId: null,
                  segmentId: null,
                }),
            },
            { label: queue.name, onClick: () => setFlow({ ...flow, shardId: null, segmentId: null }) },
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
          <MetricCard label="Messages (shard)" value={(shard.totalMessages || 0).toLocaleString()} />
          <MetricCard label="Write QPS" value={String(shard.writeQps)} unit="msg/s" color="var(--accent)" />
          <MetricCard label="Read QPS" value={String(shard.readQps)} unit="msg/s" />
          <MetricCard label="Lag" value={(shard.lag || 0).toLocaleString()} />
          <MetricCard label="Processing" value={String(proc)} unit="msg/s (min)" />
        </div>
        <SubsectionHeader
          title="Segments"
          description="Open a segment for offset, density, and read/write detail. Close seals the file; rollover closes the active segment and starts a new one."
          action={
            <button
              type="button"
              className="btn"
              title="Close the current active segment and append a new empty segment"
              onClick={() =>
                setState((s) => rolloverSegmentState(s, queue.id, shard.id, null))
              }
            >
              <RefreshCw size={14} /> Rollover active segment
            </button>
          }
        />
        <SegmentView
          queueId={queue.id}
          shardId={shard.id}
          segments={state.segments}
          rows={segs}
          onSegmentClick={(seg) => openSegment(seg.id)}
          onCloseSegment={(seg) => setState((s) => closeSegmentState(s, queue.id, shard.id, seg.id))}
          onRolloverSegment={(seg) => setState((s) => rolloverSegmentState(s, queue.id, shard.id, seg.id))}
        />
        <ScopedDebugPanel state={state} flow={flow} />
      </div>
    );
  }

  /* ── Queue detail ───────────────────────────────────── */
  if (queue && flow.queueId) {
    const series = genSeries(48, queue.publishRate, queue.publishRate * 0.3);
    const qNs = state.namespaces.find((n) => n.id === queue.namespace);
    return (
      <div className="fade-in">
        <SectionHeader
          title={queue.name}
          subtitle={`${qNs?.name || queue.namespace} · ${shards.length} shards`}
          back={{
            onClick: () => setFlow({ ...flow, queueId: null, shardId: null, segmentId: null }),
            label: "Back to namespace",
          }}
          breadcrumbItems={[
            {
              label: account?.name || "Account",
              onClick: () =>
                setFlow({
                  accountId: flow.accountId,
                  namespaceId: null,
                  queueId: null,
                  shardId: null,
                  segmentId: null,
                }),
            },
            {
              label: qNs?.name || queue.namespace,
              onClick: () => setFlow({ ...flow, queueId: null, shardId: null, segmentId: null }),
            },
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
          <MetricCard label="Total Messages" value={queue.totalMessages.toLocaleString()} />
          <MetricCard label="Publish Rate" value={queue.publishRate.toLocaleString()} unit="msg/s" color="var(--accent)" />
          <MetricCard label="Consume Rate" value={queue.consumeRate.toLocaleString()} unit="msg/s" />
          <MetricCard
            label="Consumer Lag"
            value={queue.lag.toLocaleString()}
            sub={queue.lag > 10000 ? "Above threshold" : "Healthy"}
            trend={queue.lag > 10000 ? "down" : "up"}
          />
          <MetricCard
            label="Error Rate"
            value={(queue.errorRate * 100).toFixed(2)}
            unit="%"
            color={queue.errorRate > 0.05 ? "var(--error)" : "var(--text)"}
          />
        </div>
        <div className="card" style={{ marginBottom: 32, padding: "24px 26px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h3
                className="serif"
                style={{ fontSize: 22, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1 }}
              >
                Publish vs Consume Rate
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                Last 12 hours · message throughput & lag
              </p>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--text-2)" }}>
              {[["#a78bfa", "Publish"], ["#60a5fa", "Consume"], ["#fbbf24", "Lag"]].map(([c, l]) => (
                <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 2, background: c, borderRadius: 2 }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={series}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" stroke="var(--text-4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-4)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "Inter",
                }}
              />
              <Line type="monotone" dataKey="publish" stroke="#a78bfa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="consume" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lag" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <SubsectionHeader
          title="Shards"
          description="Click a shard to drill into segments, offsets, and per-shard throughput."
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSplitShardId(shards[0]?.id ?? 0);
                setSplitTargetShards(String(Math.min(32, shards.length + 1)));
                setSplitOpen(true);
              }}
            >
              <GitBranch size={13} /> Split shard
            </button>
          }
        />
        <div className="data-table">
          <div className="table-header" style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}>
            {["#", "Write QPS", "Read QPS", "Lag", "Last Offset", "Messages", "Active Seg", "Status"].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {shards.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => openShard(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openShard(s.id);
              }}
              className="table-row clickable"
              style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
            >
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{s.id}</span>
              <span className="mono" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{s.writeQps}</span>
              <span className="mono" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{s.readQps}</span>
              <span className="mono" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: s.lag > 5000 ? "var(--warning)" : "var(--text-2)" }}>
                {s.lag.toLocaleString()}
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                {s.lastOffset.toLocaleString()}
              </span>
              <span className="mono" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{s.totalMessages.toLocaleString()}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                {s.activeSegment}
              </span>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>

        <Modal
          open={splitOpen}
          onClose={() => {
            setSplitOpen(false);
            setSplitShardId(null);
            setSplitTargetShards("");
          }}
          title="Split shard"
          subtitle="Choose which shard lineage to keep splitting and the target total shard count for this queue (mock — updates local state)."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label>Shard to split</label>
              <select
                value={splitShardId ?? ""}
                onChange={(e) => setSplitShardId(parseInt(e.target.value, 10))}
              >
                {shards.map((s) => (
                  <option key={s.id} value={s.id}>
                    Shard {s.id} · {s.totalMessages.toLocaleString()} msgs
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Target shard count</label>
              <input
                type="number"
                min={shards.length + 1}
                max={32}
                value={splitTargetShards}
                onChange={(e) => setSplitTargetShards(e.target.value)}
              />
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, lineHeight: 1.5 }}>
                Current: {shards.length}. Enter a number from {shards.length + 1} to 32. Each step splits the selected shard into two along the same lineage until the count is reached.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSplitOpen(false);
                  setSplitShardId(null);
                  setSplitTargetShards("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  !Number.isFinite(parseInt(splitTargetShards, 10)) ||
                  parseInt(splitTargetShards, 10) <= shards.length
                }
                onClick={applySplit}
              >
                <GitBranch size={13} /> Apply splits
              </button>
            </div>
          </div>
        </Modal>
        <ScopedDebugPanel state={state} flow={flow} />
      </div>
    );
  }

  /* ── Namespace home ─────────────────────────────────── */
  if (namespace && flow.namespaceId) {
    const saNsQueues = state.queues.filter((q) => q.namespace === namespace.id);
    return (
      <div className="fade-in">
        <SectionHeader
          title={namespace.name}
          subtitle={namespace.description}
          back={{
            onClick: () =>
              setFlow({
                accountId: flow.accountId,
                namespaceId: null,
                queueId: null,
                shardId: null,
                segmentId: null,
              }),
            label: "Back to all namespaces",
          }}
          breadcrumbItems={[
            {
              label: account?.name || "Account",
              onClick: () =>
                setFlow({
                  accountId: flow.accountId,
                  namespaceId: null,
                  queueId: null,
                  shardId: null,
                  segmentId: null,
                }),
            },
          ]}
          action={
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-primary" onClick={() => setCreateQueueOpen(true)}>
                <Plus size={13} /> New queue
              </button>
              <button type="button" className="btn" onClick={() => setCreateSaOpen(true)}>
                <Plus size={13} /> Service account
              </button>
            </div>
          }
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginBottom: 36 }} className="stagger">
          <MetricCard label="Queues" value={nsQueues.length} color="var(--accent)" />
          <MetricCard label="Service accounts" value={nsSAs.length} />
          <MetricCard label="Total messages" value={nsMetrics.totalMessages.toLocaleString()} />
          <MetricCard label="Publish rate" value={nsMetrics.publishRate.toLocaleString()} unit="msg/s" />
          <MetricCard label="Consume rate" value={nsMetrics.consumeRate.toLocaleString()} unit="msg/s" />
          <MetricCard
            label="Consumer lag"
            value={nsMetrics.lag.toLocaleString()}
            sub={nsMetrics.errorRate > 0.05 ? `Err ${(nsMetrics.errorRate * 100).toFixed(2)}%` : "Healthy"}
            trend={nsMetrics.lag > 10000 ? "down" : "up"}
          />
        </div>
        <div className="tab-bar" style={{ width: "fit-content", marginBottom: 20 }}>
          <button
            type="button"
            className={`tab-btn${namespaceHomeTab === "queue" ? " active" : ""}`}
            onClick={() => setNamespaceHomeTab("queue")}
          >
            Queue
          </button>
          <button
            type="button"
            className={`tab-btn${namespaceHomeTab === "service_account" ? " active" : ""}`}
            onClick={() => setNamespaceHomeTab("service_account")}
          >
            Service account
          </button>
        </div>
        {namespaceHomeTab === "queue" && (
          <>
            <SubsectionHeader title="Queues" description="Partitioned topics under this namespace." />
            <QueueTable queues={nsQueues} namespaces={state.namespaces} onOpen={(q) => openQueue(q.id)} />
          </>
        )}
        {namespaceHomeTab === "service_account" && (
          <>
            <SubsectionHeader title="Service accounts" description="Scoped API access for producers and consumers." />
            <ServiceAccountTable accounts={nsSAs} />
          </>
        )}

        <ScopedDebugPanel state={state} flow={flow} />

        <Modal open={createQueueOpen} onClose={() => setCreateQueueOpen(false)} title="Create queue" subtitle="Partitioned into shards under this namespace">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label>Queue name</label>
              <input
                placeholder="e.g. order_events"
                value={queueForm.name}
                onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })}
              />
            </div>
            <div>
              <label>Shards</label>
              <input
                type="number"
                min={1}
                max={32}
                value={queueForm.shards}
                onChange={(e) => setQueueForm({ ...queueForm, shards: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setCreateQueueOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={createQueue}>
                <Plus size={13} /> Create
              </button>
            </div>
          </div>
        </Modal>

        <Modal open={createSaOpen} onClose={() => setCreateSaOpen(false)} title="Create service account" subtitle="API access scoped to queues in this namespace" width={620}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label>Account name</label>
              <input
                placeholder="e.g. order-worker"
                value={saForm.name}
                onChange={(e) => setSaForm({ ...saForm, name: e.target.value })}
              />
            </div>
            <div>
              <label>Queue permissions</label>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    padding: "10px 14px",
                    background: "var(--surface-2)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {["Queue", "Publish", "Subscribe", "Remove"].map((h) => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase" }}>
                      {h}
                    </span>
                  ))}
                </div>
                {saNsQueues.length === 0 && (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                    No queues in this namespace yet
                  </div>
                )}
                {saNsQueues.map((q) => {
                  const existing = saForm.permissions.find((p) => p.queue === q.name);
                  return (
                    <div
                      key={q.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr",
                        padding: "11px 14px",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{q.name}</span>
                      {["publish", "subscribe", "remove"].map((p) => (
                        <label key={p} style={{ display: "flex", alignItems: "center", gap: 7, margin: 0, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={existing?.perms.includes(p) || false}
                            onChange={() => toggleSaPerm(q.name, p)}
                            style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
                          />
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setCreateSaOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={createServiceAccount}>
                <Plus size={13} /> Create
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  /* ── Account home ───────────────────────────────────── */
  return (
    <div className="fade-in">
      <SectionHeader
        title={account?.name || "Account"}
        subtitle="Namespaces, queues, and access — drill in from here"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => setCreateAccountOpen(true)}>
              <Plus size={13} /> New account
            </button>
            <button type="button" className="btn" onClick={() => setCreateNsOpen(true)}>
              <Plus size={13} /> New namespace
            </button>
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginBottom: 36 }} className="stagger">
        <MetricCard label="Namespaces" value={nsList.length} color="var(--accent)" />
        <MetricCard label="Queues" value={accountQueues.length} />
        <MetricCard label="Total messages" value={accountMetrics.totalMessages.toLocaleString()} />
        <MetricCard label="Publish rate" value={accountMetrics.publishRate.toLocaleString()} unit="msg/s" />
        <MetricCard label="Consume rate" value={accountMetrics.consumeRate.toLocaleString()} unit="msg/s" />
        <MetricCard
          label="Consumer lag"
          value={accountMetrics.lag.toLocaleString()}
          sub={`Avg err ${(accountMetrics.errorRate * 100).toFixed(2)}%`}
        />
      </div>

      <SubsectionHeader title="Namespaces" description="Each namespace isolates its own queues and service accounts." />
      {nsList.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-3)" }}>
          No namespaces yet. Create one to add queues and service accounts.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="stagger">
          {nsList.map((ns, idx) => {
            const nq = state.queues.filter((q) => q.namespace === ns.id);
            const agg = aggregateQueueMetrics(nq);
            const hasIssue = nq.some((q) => q.status !== "healthy");
            return (
              <article
                key={ns.id}
                role="button"
                tabIndex={0}
                onClick={() => openNamespace(ns.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openNamespace(ns.id);
                }}
                className="card card-interactive"
                style={{ padding: "22px 24px" }}
              >
                {/* Header row: index + icon + status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: "var(--text-3)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      N/{String(idx + 1).padStart(2, "0")}
                    </span>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Layers size={15} color="var(--accent)" />
                    </div>
                  </div>
                  {hasIssue ? (
                    <Badge color="warning">Needs attention</Badge>
                  ) : (
                    <Badge color="success">Healthy</Badge>
                  )}
                </div>

                {/* Title */}
                <div
                  className="serif"
                  style={{
                    fontSize: 24,
                    fontStyle: "italic",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                    marginBottom: 6,
                    color: "var(--text)",
                  }}
                >
                  {ns.name}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-3)",
                    lineHeight: 1.5,
                    marginBottom: 22,
                    minHeight: 36,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {ns.description}
                </div>

                {/* Stats rail */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {[
                    { label: "Queues",   value: nq.length, accent: true },
                    { label: "Messages", value: agg.totalMessages.toLocaleString() },
                    { label: "Pub/s",    value: agg.publishRate.toLocaleString() },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>{stat.label}</div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: stat.accent ? "var(--accent)" : "var(--text)",
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enter hint */}
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    justifyContent: "flex-end",
                    fontSize: 11,
                    color: "var(--text-3)",
                    letterSpacing: "0.04em",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Open <ArrowRight size={11} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ScopedDebugPanel state={state} flow={flow} />

      <Modal open={createAccountOpen} onClose={() => setCreateAccountOpen(false)} title="Create account" subtitle="Adds an organization boundary for namespaces">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Account name</label>
            <input
              placeholder="e.g. Contoso Ltd"
              value={accountForm.name}
              onChange={(e) => setAccountForm({ name: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setCreateAccountOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={createAccount}>
              <Plus size={13} /> Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={createNsOpen} onClose={() => setCreateNsOpen(false)} title="Create namespace" subtitle="Isolated queues and service accounts under this account">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Namespace name</label>
            <input
              placeholder="e.g. payments"
              value={nsForm.name}
              onChange={(e) => setNsForm({ ...nsForm, name: e.target.value })}
            />
          </div>
          <div>
            <label>Description</label>
            <input
              placeholder="What this namespace is for"
              value={nsForm.description}
              onChange={(e) => setNsForm({ ...nsForm, description: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setCreateNsOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={createNamespace}>
              <Plus size={13} /> Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
