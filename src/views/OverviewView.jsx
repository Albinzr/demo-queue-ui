import { useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Layers, ArrowUpRight } from "lucide-react";
import { genSeries } from "../utils/genSeries.js";
import { Badge, StatusBadge, MetricCard } from "../components/ui/Badge.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";

export function OverviewView({ state, setView, setSelected }) {
  const totals = useMemo(() => ({
    totalMsgs: state.queues.reduce((s, q) => s + q.totalMessages, 0),
    totalPub:  state.queues.reduce((s, q) => s + q.publishRate, 0),
    totalCon:  state.queues.reduce((s, q) => s + q.consumeRate, 0),
    totalLag:  state.queues.reduce((s, q) => s + q.lag, 0)
  }), [state.queues]);
  const series = useMemo(() => genSeries(48, 2400, 600), []);

  return (
    <div className="fade-in">
      <SectionHeader title="Infrastructure Overview" subtitle="Real-time view of your queue platform health and throughput" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <MetricCard label="Total Messages" value={(totals.totalMsgs/1_000_000).toFixed(2)} unit="M" sub="↗ 12.4% vs yesterday" trend="up" />
        <MetricCard label="Publish Rate"   value={totals.totalPub.toLocaleString()} unit="msg/s" color="var(--accent-2)" sub="Combined throughput" />
        <MetricCard label="Consume Rate"   value={totals.totalCon.toLocaleString()} unit="msg/s" sub={`${((totals.totalCon/totals.totalPub)*100).toFixed(1)}% keep-up ratio`} trend="up" />
        <MetricCard label="Total Lag"      value={totals.totalLag.toLocaleString()} unit="msgs"  sub="Across all queues" trend={totals.totalLag > 50000 ? "down" : "up"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 20 }}>
        {/* Throughput chart */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Throughput — Last 12h</h3>
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>Publish vs consume rates over time</p>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[["var(--accent-2)","Publish"],["var(--info)","Consume"]].map(([c,l]) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
                  <span style={{ width: 12, height: 3, background: c, borderRadius: 2 }} />{l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0}/></linearGradient>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.18}/><stop offset="100%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" stroke="var(--text-4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-4)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "Inter" }} />
              <Area type="monotone" dataKey="publish" stroke="#a78bfa" strokeWidth={2} fill="url(#gP)" />
              <Area type="monotone" dataKey="consume" stroke="#60a5fa" strokeWidth={2} fill="url(#gC)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Queue status */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Queue Health</h3>
            <Badge color="success">6 queues</Badge>
          </div>
          {state.queues.map((q, i) => (
            <div key={q.id} onClick={() => { setSelected({ type: "queue", id: q.id }); setView("queues"); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{q.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{state.namespaces.find(n => n.id === q.namespace)?.name} · {q.shardCount} shards</div>
              </div>
              <StatusBadge status={q.status} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Namespaces */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Namespaces</h3>
            <button className="btn" onClick={() => setView("namespaces")} style={{ padding: "6px 12px", fontSize: 12 }}>Manage <ArrowUpRight size={12} /></button>
          </div>
          {state.namespaces.map((ns, i) => {
            const nsQueues = state.queues.filter(q => q.namespace === ns.id);
            return (
              <div key={ns.id} onClick={() => { setSelected({ type: "namespace", id: ns.id }); setView("namespaces"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <div style={{ width: 36, height: 36, background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Layers size={16} color="var(--accent-2)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{ns.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ns.description}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{nsQueues.length} queues</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{ns.serviceAccounts.length} SAs</div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Top queues chart */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Top Queues by Publish Rate</h3>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>Messages per second</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[...state.queues].sort((a,b) => b.publishRate-a.publishRate).slice(0,5)} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
              <XAxis type="number" stroke="var(--text-4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="var(--text-4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "Inter" }} />
              <Bar dataKey="publishRate" fill="var(--accent)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
