import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Plus, X, Filter, GitBranch, RefreshCw, ChevronDown } from "lucide-react";
import { genSeries } from "../utils/genSeries.js";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { MetricCard, StatusBadge } from "../components/ui/Badge.jsx";
import { QueueTable } from "../components/QueueTable.jsx";
import { SegmentView } from "../components/SegmentView.jsx";

export function QueuesView({ state, setState, setSelected, selected }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", namespace: state.namespaces[0]?.id || "", shards: 2 });
  const [filter, setFilter] = useState("");
  const [activeShardId, setActiveShardId] = useState(null);

  const selectedQueue = selected?.type === "queue" ? state.queues.find(q => q.id === selected.id) : null;

  const createQueue = () => {
    if (!form.name.trim() || !form.namespace) return;
    const newQ = { id: `q_${Date.now()}`, namespace: form.namespace, name: form.name.trim().toLowerCase().replace(/\s+/g,"_"), shardCount: Number(form.shards), totalMessages: 0, publishRate: 0, consumeRate: 0, lag: 0, errorRate: 0, status: "healthy" };
    const updatedNs = state.namespaces.map(n => n.id === form.namespace ? { ...n, queues: [...n.queues, newQ.id] } : n);
    setState({ ...state, queues: [...state.queues, newQ], namespaces: updatedNs });
    setForm({ name: "", namespace: state.namespaces[0]?.id || "", shards: 2 });
    setCreateOpen(false);
  };

  if (selectedQueue) {
    const shards = state.shards[selectedQueue.id] || Array.from({ length: selectedQueue.shardCount }, (_, i) => ({ id:i, writeQps:0, readQps:0, lag:0, lastOffset:0, totalMessages:0, activeSegment:"—", status:"active" }));
    const series = genSeries(48, selectedQueue.publishRate, selectedQueue.publishRate*0.3);
    const activeShard = activeShardId != null ? shards.find(s => s.id === activeShardId) : null;

    return (
      <div className="fade-in">
        <SectionHeader title={selectedQueue.name} subtitle={`${state.namespaces.find(n => n.id === selectedQueue.namespace)?.name} · ${selectedQueue.shardCount} shards`}
          action={<div style={{display:"flex",gap:8}}><button className="btn"><RefreshCw size={13} />Pause</button><button className="btn" onClick={() => { setSelected(null); setActiveShardId(null); }}><X size={14} />Close</button></div>}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 20 }}>
          <MetricCard label="Total Messages"  value={selectedQueue.totalMessages.toLocaleString()} />
          <MetricCard label="Publish Rate"    value={selectedQueue.publishRate.toLocaleString()} unit="msg/s" color="var(--accent-2)" />
          <MetricCard label="Consume Rate"    value={selectedQueue.consumeRate.toLocaleString()} unit="msg/s" />
          <MetricCard label="Consumer Lag"    value={selectedQueue.lag.toLocaleString()} sub={selectedQueue.lag > 10000 ? "Above threshold" : "Healthy"} trend={selectedQueue.lag > 10000 ? "down" : "up"} />
          <MetricCard label="Error Rate"      value={(selectedQueue.errorRate*100).toFixed(2)} unit="%" color={selectedQueue.errorRate > 0.05 ? "var(--error)" : "var(--text)"} />
        </div>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Publish vs Consume Rate</h3>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 18 }}>Last 12 hours · message throughput</p>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={series}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" stroke="var(--text-4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-4)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background:"var(--surface-2)", border:"1px solid var(--border-strong)", borderRadius:8, fontSize:12, fontFamily:"Inter" }} />
              <Line type="monotone" dataKey="publish" stroke="#a78bfa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="consume" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lag"     stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Shard Distribution</h3>
          <button className="btn"><GitBranch size={13} />Split Shard</button>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden", marginBottom: activeShard ? 20 : 0 }}>
          <div className="table-header" style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}>
            {["#","Write QPS","Read QPS","Lag","Last Offset","Messages","Active Seg","Status",""].map(h => <span key={h}>{h}</span>)}
          </div>
          {shards.map((s, i) => (
            <div key={s.id} onClick={() => setActiveShardId(s.id === activeShardId ? null : s.id)} className="table-row clickable" style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", background: activeShardId === s.id ? "var(--accent-bg)" : "" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-2)" }}>{s.id}</span>
              <span style={{ fontSize: 13 }}>{s.writeQps}</span>
              <span style={{ fontSize: 13 }}>{s.readQps}</span>
              <span style={{ fontSize: 13, color: s.lag > 5000 ? "var(--warning)" : "var(--text-2)" }}>{s.lag.toLocaleString()}</span>
              <span className="mono" style={{ fontSize: 12 }}>{s.lastOffset.toLocaleString()}</span>
              <span style={{ fontSize: 13 }}>{s.totalMessages.toLocaleString()}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-2)" }}>{s.activeSegment}</span>
              <StatusBadge status={s.status} />
              <ChevronDown size={14} color="var(--text-3)" style={{ transform: activeShardId === s.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
          ))}
        </div>

        {activeShard && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Shard {activeShard.id} — Segments</h3>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Segment timeline and storage details</p>
              </div>
              <button className="btn-ghost btn" onClick={() => setActiveShardId(null)}><X size={13} />Hide</button>
            </div>
            <SegmentView queueId={selectedQueue.id} shardId={activeShard.id} segments={state.segments} />
          </div>
        )}
      </div>
    );
  }

  const filtered = state.queues.filter(q => q.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="fade-in">
      <SectionHeader title="Queues" subtitle="All queues across your namespaces"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 13px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <Filter size={13} color="var(--text-3)" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name" style={{ border:"none", background:"transparent", padding:0, width:160, fontSize:13 }} />
            </div>
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={13} />New Queue</button>
          </div>
        }
      />
      <QueueTable queues={filtered} namespaces={state.namespaces} onOpen={q => setSelected({ type:"queue", id:q.id })} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Queue" subtitle="Queues are partitioned into shards for parallel processing">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Namespace</label><select value={form.namespace} onChange={e => setForm({...form, namespace:e.target.value})}>{state.namespaces.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
          <div><label>Queue Name</label><input placeholder="e.g. order_events" value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></div>
          <div><label>Number of Shards</label><input type="number" min="1" max="32" value={form.shards} onChange={e => setForm({...form, shards:e.target.value})} /><p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>More shards = higher parallelism. Shards can be split later.</p></div>
          <div className="modal-footer">
            <button className="btn" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createQueue}><Plus size={13} />Create Queue</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
