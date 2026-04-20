import { useState, useMemo, useEffect } from "react";
import {
  Activity, GitBranch, AlertTriangle, CheckCircle2, Cpu, HardDrive,
  BarChart2, Users, Search, Settings, Server, Zap, Gauge,
} from "lucide-react";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { Badge, StatusBadge, MetricCard } from "../../components/ui/Badge.jsx";
import { InfoRow } from "../../components/ui/InfoRow.jsx";
import { ProgressBar } from "../../components/ui/ProgressBar.jsx";
import { SegmentView } from "../../components/SegmentView.jsx";
import { getShardList, getSegmentsForShard } from "../../utils/explorerHelpers.js";

const SystemHealthTab = ({ state, selectedQ }) => {
  const q = state.queues.find(qq => qq.id === selectedQ);
  const shards = q
    ? state.shards[q.id]?.length
      ? state.shards[q.id]
      : getShardList(state, q.id)
    : [];

  const alerts = useMemo(() => {
    if (!q) return [];
    const out = [];
    if (q.lag > 10000) out.push({ sev:"error",  code:"HIGH_LAG",        msg: `Consumer lag is ${q.lag.toLocaleString()} messages — consumers are falling significantly behind.` });
    if (q.consumeRate < q.publishRate * 0.95) out.push({ sev:"warning", code:"SLOW_CONSUMER",    msg: `Consume rate is ${((q.consumeRate/q.publishRate)*100).toFixed(1)}% of publish rate — downstream processing may be bottlenecked.` });
    if (q.errorRate > 0.05) out.push({ sev:"error",  code:"HIGH_ERROR_RATE", msg: `Error rate ${(q.errorRate*100).toFixed(2)}% exceeds 5% SLO — investigate write failures or consumer errors.` });
    if (shards.length > 1) {
      const max = Math.max(...shards.map(s => s.writeQps));
      const min = Math.min(...shards.map(s => s.writeQps));
      if (max > min * 2.5 && min > 0) out.push({ sev:"warning", code:"HOT_SHARD", msg: `Uneven shard load detected (${min}–${max} QPS). Consider splitting the hot shard or re-keying producers.` });
    }
    if (state.resourceMetrics.disk >= 90) out.push({ sev:"error",  code:"DISK_CRITICAL",  msg: `Disk usage at ${state.resourceMetrics.disk}% — approaching capacity. Segment creation may fail soon.` });
    if (state.retryData[q.id]?.retryRate > 2) out.push({ sev:"warning", code:"HIGH_RETRY",     msg: `Retry rate at ${state.retryData[q.id]?.retryRate} retries/s — indicates persistent write or processing failures.` });
    const consumers = state.consumerGroups.filter(cg => cg.queue === q.id);
    consumers.forEach(cg => {
      const off = state.offsets[q.id];
      if (off && off.latest - (off.committed[cg.name] || 0) > 20000) out.push({ sev:"warning", code:"CONSUMER_NOT_COMMITTING", msg: `Consumer group "${cg.name}" has not committed recent offsets — lag may be growing silently.` });
    });
    if (out.length === 0) out.push({ sev:"ok", code:"ALL_CLEAR", msg:"No anomalies detected. Queue is operating within all SLOs." });
    return out;
  }, [q, shards, state]);

  const systemSnapshot = { status:"HEALTHY", writeRate: q?.publishRate || 0, readRate: q?.consumeRate || 0, lag: q?.lag || 0, errorRate: q?.errorRate || 0 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* 7.1 System Snapshot */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>System Snapshot</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
          <MetricCard label="Status"      value={systemSnapshot.status} color="var(--success)" />
          <MetricCard label="Write Rate"  value={systemSnapshot.writeRate.toLocaleString()} unit="msg/s" />
          <MetricCard label="Read Rate"   value={systemSnapshot.readRate.toLocaleString()}  unit="msg/s" />
          <MetricCard label="Lag"         value={systemSnapshot.lag.toLocaleString()} color={systemSnapshot.lag > 10000 ? "var(--warning)" : "var(--text)"} />
          <MetricCard label="Error Rate"  value={(systemSnapshot.errorRate*100).toFixed(2)} unit="%" color={systemSnapshot.errorRate > 0.05 ? "var(--error)" : "var(--text)"} />
        </div>
      </div>

      {/* Section 8: Automatic Failure Detection */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Automatic Failure Detection</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {alerts.map((a, i) => {
            const colors = { ok:{bg:"var(--success-bg)",border:"var(--success-border)",text:"var(--success)",Icon:CheckCircle2}, warning:{bg:"var(--warning-bg)",border:"var(--warning-border)",text:"var(--warning)",Icon:AlertTriangle}, error:{bg:"var(--error-bg)",border:"var(--error-border)",text:"var(--error)",Icon:AlertTriangle} };
            const c = colors[a.sev] || colors.ok;
            return (
              <div key={i} style={{ display:"flex", gap:13, padding:"13px 16px", background:c.bg, border:`1px solid ${c.border}`, borderRadius:10, alignItems:"flex-start" }}>
                <c.Icon size={16} color={c.text} style={{ flexShrink:0, marginTop:1 }} />
                <div>
                  <span style={{ fontSize:11, fontWeight:700, color:c.text, textTransform:"uppercase", letterSpacing:"0.06em", marginRight:8 }}>{a.code}</span>
                  <span style={{ fontSize:13, color:"var(--text)" }}>{a.msg}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Tab: Infrastructure (7.2 Shards, 7.3 Segments, 7.9 Nodes) ──
const InfrastructureTab = ({ state, selectedQ, focusShardId = null, focusSegmentId = null }) => {
  const q = state.queues.find(qq => qq.id === selectedQ);
  const shardsAll = q
    ? state.shards[q.id]?.length
      ? state.shards[q.id]
      : getShardList(state, q.id)
    : [];
  const shards =
    focusShardId != null ? shardsAll.filter((s) => s.id === focusShardId) : shardsAll;
  const [activeSeg, setActiveSeg] = useState(focusShardId ?? null);
  useEffect(() => {
    setActiveSeg(focusShardId ?? null);
  }, [focusShardId, selectedQ]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* 7.2 Shard State */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Shard State</h3>
        {shards.length === 0 ? (
          <div className="card" style={{ textAlign:"center", color:"var(--text-3)", padding:32 }}>No shard data available for this queue</div>
        ) : (
          <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
            <div className="table-header" style={{ gridTemplateColumns:"50px 1fr 1fr 1fr 1.2fr 1fr 1fr" }}>
              {["Shard","Write QPS","Read QPS","Lag","Last Offset","Messages","Status"].map(h => <span key={h}>{h}</span>)}
            </div>
            {shards.map(s => (
              <div key={s.id} onClick={() => setActiveSeg(activeSeg===s.id?null:s.id)} className="table-row clickable" style={{ gridTemplateColumns:"50px 1fr 1fr 1fr 1.2fr 1fr 1fr", background:activeSeg===s.id?"var(--accent-bg)":"" }}>
                <span style={{ fontWeight:700, color:"var(--accent-2)" }}>{s.id}</span>
                <span style={{ fontSize:13 }}>{s.writeQps}</span>
                <span style={{ fontSize:13 }}>{s.readQps}</span>
                <span style={{ fontSize:13, color:s.lag>5000?"var(--warning)":"var(--text-2)" }}>{s.lag.toLocaleString()}</span>
                <span className="mono" style={{ fontSize:12 }}>{s.lastOffset.toLocaleString()}</span>
                <span style={{ fontSize:13 }}>{s.totalMessages.toLocaleString()}</span>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7.3 Segment State */}
      {activeSeg !== null && q && (
        <div className="fade-in">
          <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Segment State — Shard {activeSeg}</h3>
          <SegmentView
            queueId={q.id}
            shardId={activeSeg}
            segments={state.segments}
            rows={
              focusSegmentId
                ? getSegmentsForShard(state, q.id, activeSeg).filter((s) => s.id === focusSegmentId)
                : undefined
            }
          />
        </div>
      )}

      {/* 7.9 Node State */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Node State</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {state.nodes.map(node => (
            <div key={node.id} className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <Server size={16} color="var(--text-2)" />
                  <span style={{ fontWeight:700 }}>{node.id}</span>
                </div>
                <StatusBadge status={node.status} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <InfoRow label="Region"  value={node.region} />
                <InfoRow label="Uptime"  value={node.uptime} />
                <InfoRow label="Shards"  value={`[${node.shards.join(", ")}]`} mono />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0" }}>
                  <span style={{ fontSize:13, color:"var(--text-2)" }}>Load</span>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, marginLeft:16 }}>
                    <ProgressBar value={node.load} />
                    <span style={{ fontSize:12, fontWeight:600, minWidth:30, textAlign:"right", color: node.load>80?"var(--error)":node.load>60?"var(--warning)":"var(--success)" }}>{node.load}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Tab: Consumers (7.4 Offsets, 7.5 Consumer State, 7.16 Processing) ──
const ConsumersTab = ({ state, selectedQ }) => {
  const consumers = state.consumerGroups.filter(cg => cg.queue === selectedQ);
  const offsets = state.offsets[selectedQ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* 7.4 Offset Tracking */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Offset Tracking</h3>
        {offsets ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:14 }}>
            <div className="card">
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:"var(--text-2)" }}>Boundary Offsets</div>
              <InfoRow label="Earliest" value={offsets.earliest.toLocaleString()} mono />
              <InfoRow label="Latest"   value={offsets.latest.toLocaleString()}   mono />
              <InfoRow label="Span"     value={(offsets.latest-offsets.earliest).toLocaleString()} mono />
            </div>
            <div className="card">
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:"var(--text-2)" }}>Committed Offsets per Group</div>
              {Object.entries(offsets.committed).map(([group, offset]) => {
                const lag = offsets.latest - offset;
                return (
                  <div key={group} style={{ padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{group}</span>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span className="mono" style={{ fontSize:12, color:"var(--text-2)" }}>{offset.toLocaleString()}</span>
                        {lag > 0 && <Badge color={lag>10000?"error":lag>1000?"warning":"success"}>lag: {lag.toLocaleString()}</Badge>}
                      </div>
                    </div>
                    <ProgressBar value={offset-offsets.earliest} max={offsets.latest-offsets.earliest} color={lag>10000?"var(--warning)":"var(--accent)"} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign:"center", color:"var(--text-3)", padding:32 }}>No offset data available for this queue</div>
        )}
      </div>

      {/* 7.5 Consumer State */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Consumer Groups</h3>
        {consumers.length === 0 ? (
          <div className="card" style={{ textAlign:"center", color:"var(--text-3)", padding:32 }}>No consumer groups registered for this queue</div>
        ) : (
          <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
            <div className="table-header" style={{ gridTemplateColumns:"1.4fr 1fr 1fr 1.8fr 1fr" }}>
              {["Group","Members","Lag","Last Commit","Status"].map(h => <span key={h}>{h}</span>)}
            </div>
            {consumers.map(cg => (
              <div key={cg.id} className="table-row" style={{ gridTemplateColumns:"1.4fr 1fr 1fr 1.8fr 1fr" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}><Users size={13} color="var(--text-3)" /><span style={{ fontWeight:500 }}>{cg.name}</span></div>
                <span style={{ fontSize:13 }}>{cg.members}</span>
                <span style={{ fontSize:13, fontWeight:500, color:cg.lag>10000?"var(--error)":cg.lag>1000?"var(--warning)":"var(--text-2)" }}>{cg.lag.toLocaleString()}</span>
                <span className="mono" style={{ fontSize:12, color:"var(--text-2)" }}>{cg.lastCommit}</span>
                <StatusBadge status={cg.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7.16 Consumer Processing */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Consumer Processing</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {consumers.map(cg => {
            const failed = cg.status === "lagging";
            return (
              <div key={cg.id} className="card" style={{ borderColor:failed?"var(--error-border)":"var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{cg.name}</span>
                  <StatusBadge status={failed?"error":cg.status} />
                </div>
                {failed && <div style={{ fontSize:12, color:"var(--error)", marginBottom:8, padding:"6px 10px", background:"var(--error-bg)", borderRadius:6 }}>Processing failure: db timeout</div>}
                <InfoRow label="Processing time" value={failed ? "400 ms (failed)" : "< 50 ms"} valueColor={failed?"var(--error)":undefined} />
                <InfoRow label="Members"         value={`${cg.members} active`} />
                <InfoRow label="Last commit"      value={cg.lastCommit} />
              </div>
            );
          })}
          {consumers.length === 0 && <div className="card" style={{ textAlign:"center", color:"var(--text-3)", padding:24, gridColumn:"1/-1" }}>No consumer groups for this queue</div>}
        </div>
      </div>
    </div>
  );
};

// ── Tab: Producers (7.15 Producer State, 7.12 Retry) ──────────
const ProducersTab = ({ state, selectedQ }) => {
  const producers = state.producerStates.filter(p => p.queue === selectedQ);
  const retry = state.retryData[selectedQ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* 7.15 Producer State */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Producer State</h3>
        {producers.length === 0 ? (
          <div className="card" style={{ textAlign:"center", color:"var(--text-3)", padding:32 }}>No active producers for this queue</div>
        ) : (
          <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
            <div className="table-header" style={{ gridTemplateColumns:"1.4fr 1fr 1fr 1fr 1fr" }}>
              {["Client ID","Rate","Batch Size","Retries","Status"].map(h => <span key={h}>{h}</span>)}
            </div>
            {producers.map((p, i) => (
              <div key={i} className="table-row" style={{ gridTemplateColumns:"1.4fr 1fr 1fr 1fr 1fr" }}>
                <span style={{ fontWeight:500 }}>{p.clientId}</span>
                <span style={{ fontSize:13 }}>{p.rate.toLocaleString()} msg/s</span>
                <span style={{ fontSize:13 }}>{p.batchSize}</span>
                <span style={{ fontSize:13, color:p.retryCount>0?"var(--warning)":"var(--text-2)" }}>{p.retryCount}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7.12 Retry Tracking */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Retry Tracking</h3>
        {retry ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:14 }}>
            <div className="card">
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:"var(--text-2)" }}>Summary</div>
              <InfoRow label="Total retries"  value={retry.totalRetries} />
              <InfoRow label="Retry rate"     value={`${retry.retryRate} / sec`} valueColor={retry.retryRate>2?"var(--error)":"var(--text)"} />
              <InfoRow label="Dead lettered"  value={retry.deadLettered ? "Yes" : "No"} valueColor={retry.deadLettered?"var(--error)":"var(--success)"} />
            </div>
            <div className="card">
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:"var(--text-2)" }}>Recent Attempts</div>
              {retry.attempts.map((a, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i<retry.attempts.length-1?"1px solid var(--border)":"none" }}>
                  <span style={{ width:26, height:26, borderRadius:"50%", background:a.error?"var(--error-bg)":"var(--success-bg)", border:`1px solid ${a.error?"var(--error-border)":"var(--success-border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:a.error?"var(--error)":"var(--success)", flexShrink:0 }}>{a.attempt}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:"var(--text-2)" }}>{a.timestamp}</div>
                    <div className="mono" style={{ fontSize:11, color:"var(--text-3)" }}>{a.msgId}</div>
                  </div>
                  {a.error ? <Badge color="error">{a.error}</Badge> : <Badge color="success">Success</Badge>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign:"center", color:"var(--text-3)", padding:32 }}>No retry data for this queue</div>
        )}
      </div>
    </div>
  );
};

// ── Tab: Diagnostics (7.7 Errors, 7.8 Resources, 7.11 Latency, 7.13 Integrity, 7.14 Network) ──
const DiagnosticsTab = ({ state, selectedQ, focusShardId = null }) => {
  const latency = state.latencyBreakdown[selectedQ];
  const integrity = state.integrityData[selectedQ];
  const errors = state.errorLogs.filter(
    (e) => e.queue === selectedQ && (focusShardId == null || e.shard === focusShardId)
  );
  const res = state.resourceMetrics;
  const net = state.networkMetrics;

  const latencyData = latency ? [
    { name: "Produce → Disk",    value: latency.produceToDisk,   color: "var(--accent)" },
    { name: "Disk → Consumer",   value: latency.diskToConsumer,  color: "var(--info)" },
    { name: "Processing",        value: latency.processing,      color: latency.processing>300?"var(--warning)":"var(--success)" },
    { name: "Commit",            value: latency.commit,          color: "var(--text-2)" }
  ] : [];
  const totalLatency = latencyData.reduce((s,d) => s+d.value, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* 7.8 Resource Metrics */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Resource Metrics</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            { label:"CPU", value:res.cpu,    icon:Cpu },
            { label:"Memory", value:res.memory, icon:BarChart2 },
            { label:"Disk", value:res.disk,   icon:HardDrive },
            { label:"Disk I/O", value:null, raw:res.diskIo, icon:Gauge }
          ].map(m => {
            const c = m.value>=90?"var(--error)":m.value>=70?"var(--warning)":"var(--success)";
            return (
              <div key={m.label} className="card">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:500, color:"var(--text-2)" }}>{m.label}</span>
                  <m.icon size={15} color="var(--text-3)" />
                </div>
                {m.value !== null ? (
                  <>
                    <div style={{ fontSize:28, fontWeight:700, color:c, lineHeight:1, marginBottom:10 }}>{m.value}%</div>
                    <ProgressBar value={m.value} color={c} />
                  </>
                ) : (
                  <Badge color={m.raw==="HIGH"?"error":"success"} size="md">{m.raw}</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7.11 Latency Breakdown + 7.14 Network Metrics */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div className="card">
          <h4 style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Latency Breakdown</h4>
          <p style={{ fontSize:12, color:"var(--text-3)", marginBottom:16 }}>End-to-end message path timing</p>
          {latency ? (
            <>
              <div style={{ display:"flex", gap:3, height:20, borderRadius:99, overflow:"hidden", marginBottom:16 }}>
                {latencyData.map((d,i) => (
                  <div key={i} style={{ flex:d.value, background:d.color, minWidth:4 }} title={`${d.name}: ${d.value}ms`} />
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {latencyData.map((d,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<latencyData.length-1?"1px solid var(--border)":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }} />
                      <span style={{ fontSize:13, color:"var(--text-2)" }}>{d.name}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{d.value} ms</span>
                      <span style={{ fontSize:11, color:"var(--text-4)" }}>{((d.value/totalLatency)*100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontWeight:700 }}>
                  <span>Total</span><span>{totalLatency} ms</span>
                </div>
              </div>
            </>
          ) : <p style={{ color:"var(--text-3)", fontSize:13 }}>No latency data available</p>}
        </div>

        {/* 7.14 Network Metrics */}
        <div className="card">
          <h4 style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Network Metrics</h4>
          <p style={{ fontSize:12, color:"var(--text-3)", marginBottom:16 }}>Producer & consumer connection stats</p>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { label:"Producer Latency", value:net.producerLatency, unit:"ms", threshold:50  },
              { label:"Consumer Latency", value:net.consumerLatency, unit:"ms", threshold:100 },
              { label:"Packet Loss",      value:net.packetLoss,      unit:"%",  threshold:0.1 }
            ].map(m => (
              <div key={m.label}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, color:"var(--text-2)" }}>{m.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:m.value>m.threshold?"var(--warning)":"var(--success)" }}>{m.value} {m.unit}</span>
                </div>
                <ProgressBar value={m.value} max={m.threshold*2} color={m.value>m.threshold?"var(--warning)":"var(--success)"} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7.13 Data Integrity */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Data Integrity</h3>
        {integrity ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { label:"Checksum Valid",  value:integrity.checksumValid, ok:integrity.checksumValid,   display:integrity.checksumValid?"Passed":"Failed" },
              { label:"Offset Gaps",     value:!integrity.offsetGap,    ok:!integrity.offsetGap,      display:integrity.offsetGap?"Detected":"None" },
              { label:"Duplicates",      value:integrity.duplicates===0,ok:integrity.duplicates===0,  display:integrity.duplicates.toString() },
              { label:"Corrupted",       value:integrity.corrupted===0,  ok:integrity.corrupted===0,   display:integrity.corrupted.toString() }
            ].map(item => (
              <div key={item.label} className="card" style={{ textAlign:"center", borderColor:item.ok?"var(--border)":"var(--error-border)" }}>
                {item.ok ? <CheckCircle2 size={24} color="var(--success)" style={{ marginBottom:8 }} /> : <AlertTriangle size={24} color="var(--error)" style={{ marginBottom:8 }} />}
                <div style={{ fontSize:18, fontWeight:700, color:item.ok?"var(--success)":"var(--error)", marginBottom:4 }}>{item.display}</div>
                <div style={{ fontSize:12, color:"var(--text-3)" }}>{item.label}</div>
              </div>
            ))}
          </div>
        ) : <div className="card" style={{ textAlign:"center", color:"var(--text-3)", padding:32 }}>No integrity data available</div>}
      </div>

      {/* 7.7 Error Logs */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Structured Error Logs</h3>
        {errors.length === 0 ? (
          <div className="card" style={{ display:"flex", alignItems:"center", gap:10, padding:20 }}>
            <CheckCircle2 size={18} color="var(--success)" />
            <span style={{ fontSize:13, color:"var(--text-2)" }}>No errors logged for this queue</span>
          </div>
        ) : (
          <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
            <div className="table-header" style={{ gridTemplateColumns:"1.4fr 60px 2fr 1.4fr" }}>
              {["Event","Shard","Reason","Timestamp"].map(h => <span key={h}>{h}</span>)}
            </div>
            {errors.map(e => (
              <div key={e.id} className="table-row" style={{ gridTemplateColumns:"1.4fr 60px 2fr 1.4fr" }}>
                <Badge color="error">{e.event}</Badge>
                <span style={{ fontSize:13, fontWeight:600, color:"var(--text-2)" }}>{e.shard}</span>
                <span style={{ fontSize:13, color:"var(--text)" }}>{e.reason}</span>
                <span className="mono" style={{ fontSize:12, color:"var(--text-3)" }}>{e.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tab: Message Trace (7.10) ──────────────────────────────────
const TraceTab = ({ state }) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const search = () => {
    const trace = state.messageTraces.find(t => t.traceId === query.trim());
    setResult(trace || null);
    setNotFound(!trace);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Message Trace</h3>
        <p style={{ fontSize:13, color:"var(--text-3)", marginBottom:16 }}>Every message carries a <code style={{ fontFamily:"monospace", fontSize:12, background:"var(--surface-3)", padding:"1px 6px", borderRadius:4 }}>trace_id</code> for end-to-end correlation across producers and consumers.</p>
        <div style={{ display:"flex", gap:10, marginBottom:8 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8 }}>
            <Search size={14} color="var(--text-3)" />
            <input value={query} onChange={e => { setQuery(e.target.value); setNotFound(false); }} placeholder="Enter trace ID, e.g. txn-123" style={{ border:"none", background:"transparent", padding:0, fontSize:13 }} onKeyDown={e => e.key==="Enter" && search()} />
          </div>
          <button className="btn btn-primary" onClick={search}><Search size={13} />Trace</button>
        </div>
        <p style={{ fontSize:11, color:"var(--text-4)" }}>Try: txn-123, txn-456</p>
      </div>

      {notFound && (
        <div style={{ padding:"14px 18px", background:"var(--warning-bg)", border:"1px solid var(--warning-border)", borderRadius:10, fontSize:13 }}>
          <AlertTriangle size={14} color="var(--warning)" style={{ marginRight:8, verticalAlign:"middle" }} />
          No trace found for ID <strong>{query}</strong>
        </div>
      )}

      {result && (
        <div className="fade-in">
          {/* Trace header */}
          <div className="card" style={{ marginBottom:14, borderColor:"var(--accent-border)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text-4)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Trace ID</div>
                <div className="mono" style={{ fontSize:20, fontWeight:700, color:"var(--accent-2)" }}>{result.traceId}</div>
              </div>
              <Badge color="accent">Complete</Badge>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <div><div style={{ fontSize:11, color:"var(--text-3)", marginBottom:3 }}>Shard</div><div style={{ fontWeight:700 }}>{result.shard}</div></div>
              <div><div style={{ fontSize:11, color:"var(--text-3)", marginBottom:3 }}>Segment</div><div className="mono" style={{ fontWeight:600, fontSize:13 }}>{result.segment}</div></div>
              <div><div style={{ fontSize:11, color:"var(--text-3)", marginBottom:3 }}>Offset</div><div className="mono" style={{ fontWeight:600 }}>{result.offset.toLocaleString()}</div></div>
              <div><div style={{ fontSize:11, color:"var(--text-3)", marginBottom:3 }}>Producer</div><div style={{ fontWeight:600 }}>{result.producedBy}</div></div>
            </div>
            <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid var(--border)", fontSize:12, color:"var(--text-3)" }}>Produced at {result.producedAt}</div>
          </div>

          {/* Consumer journey */}
          <div className="card">
            <h4 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Consumer Journey</h4>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {result.consumed.map((c, i) => (
                <div key={i} style={{ display:"flex", gap:14, padding:"14px 16px", background:c.processed?"var(--success-bg)":"var(--error-bg)", border:`1px solid ${c.processed?"var(--success-border)":"var(--error-border)"}`, borderRadius:10 }}>
                  {c.processed ? <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink:0 }} /> : <AlertTriangle size={18} color="var(--error)" style={{ flexShrink:0 }} />}
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontWeight:600 }}>{c.group}</span>
                      <div style={{ display:"flex", gap:8 }}>
                        {c.processed && <Badge color="success">Processed</Badge>}
                        {c.committed && <Badge color="info">Committed</Badge>}
                        {!c.processed && <Badge color="error">Failed</Badge>}
                      </div>
                    </div>
                    {c.error && <div style={{ fontSize:12, color:"var(--error)", marginBottom:4 }}>Error: {c.error}</div>}
                    <div style={{ fontSize:12, color:"var(--text-3)" }}>
                      Processing time: {c.processingTime} ms
                      {c.processedAt && ` · Processed at ${c.processedAt}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab: Config & History (7.6, 7.17, 7.19, 7.20) ─────────────
const ConfigTab = ({ state }) => {
  const timelineColors = { info:"var(--info)", warning:"var(--warning)", error:"var(--error)" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* 7.6 Configuration */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div className="card">
          <h4 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Current Configuration</h4>
          <InfoRow label="Shard Count"      value={state.config.shardCount}   mono />
          <InfoRow label="Retention"        value={`${(state.config.retentionMs/86400000).toFixed(0)} days (${state.config.retentionMs.toLocaleString()} ms)`} />
          <InfoRow label="Segment Size"     value={`${state.config.segmentSizeMb} MB`} />
          <InfoRow label="Debug API"        value="GET /queues/{id}/debug-dump" mono />
        </div>

        {/* 7.13 Data integrity summary */}
        <div className="card">
          <h4 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Queue Parameters</h4>
          {state.queues.slice(0,4).map(q => (
            <InfoRow key={q.id} label={q.name} value={`${q.shardCount} shards · ${q.status}`} valueColor={q.status==="degraded"?"var(--warning)":undefined} />
          ))}
        </div>
      </div>

      {/* 7.19 Config History */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Configuration History</h3>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
          <div className="table-header" style={{ gridTemplateColumns:"1.2fr 1.2fr 1.2fr 1.4fr 1.4fr" }}>
            {["Field","Old Value","New Value","Changed By","Timestamp"].map(h => <span key={h}>{h}</span>)}
          </div>
          {state.configHistory.map(ch => (
            <div key={ch.id} className="table-row" style={{ gridTemplateColumns:"1.2fr 1.2fr 1.2fr 1.4fr 1.4fr" }}>
              <span className="mono" style={{ fontSize:12, fontWeight:600 }}>{ch.field}</span>
              <span className="mono" style={{ fontSize:12, color:"var(--error)" }}>{ch.oldValue}</span>
              <span className="mono" style={{ fontSize:12, color:"var(--success)" }}>{ch.newValue}</span>
              <span style={{ fontSize:12, color:"var(--text-2)" }}>{ch.changedBy}</span>
              <span className="mono" style={{ fontSize:12, color:"var(--text-3)" }}>{ch.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7.17 Rebalance Events */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Rebalance Events</h3>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
          <div className="table-header" style={{ gridTemplateColumns:"1.2fr 60px 1fr 1fr 0.8fr 1.4fr" }}>
            {["Event","Shard","From","To","Duration","Timestamp"].map(h => <span key={h}>{h}</span>)}
          </div>
          {state.rebalanceEvents.map(r => (
            <div key={r.id} className="table-row" style={{ gridTemplateColumns:"1.2fr 60px 1fr 1fr 0.8fr 1.4fr" }}>
              <Badge color="info">{r.event}</Badge>
              <span style={{ fontSize:13, fontWeight:600 }}>{r.shard}</span>
              <span style={{ fontSize:13, color:"var(--text-2)" }}>{r.from || "—"}</span>
              <span style={{ fontSize:13, color:"var(--text-2)" }}>{r.to}</span>
              <span style={{ fontSize:13 }}>{r.duration} ms</span>
              <span className="mono" style={{ fontSize:12, color:"var(--text-3)" }}>{r.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7.20 Timeline View */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Timeline View</h3>
        <div className="card">
          <div style={{ position:"relative", paddingLeft:28 }}>
            <div style={{ position:"absolute", left:10, top:0, bottom:0, width:2, background:"var(--border)", borderRadius:1 }} />
            {state.timeline.map((item, i) => (
              <div key={i} style={{ display:"flex", gap:14, marginBottom:i<state.timeline.length-1?18:0, position:"relative" }}>
                <div style={{ position:"absolute", left:-24, top:4, width:12, height:12, borderRadius:"50%", background:timelineColors[item.type], border:"2px solid var(--surface)", flexShrink:0, zIndex:1 }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"baseline", marginBottom:2 }}>
                    <span className="mono" style={{ fontSize:11, color:"var(--text-4)", fontWeight:600 }}>{item.time}</span>
                    <Badge color={item.type==="error"?"error":item.type==="warning"?"warning":"info"}>{item.type}</Badge>
                  </div>
                  <span style={{ fontSize:13, color:"var(--text)" }}>{item.event}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Shared workbench (full Debug Center + scoped panels) ───────
export function DebugWorkbench({
  state,
  title = "Debug Center",
  subtitle = "End-to-end observability — metrics, traces, logs, and diagnostics",
  selectedQ,
  onSelectQueue,
  queueOptions = null,
  showQueuePicker = true,
  focusShardId = null,
  focusSegmentId = null,
}) {
  const [tab, setTab] = useState("health");
  const queues = queueOptions ?? state.queues;

  const tabs = [
    { id: "health", label: "Health", icon: Activity },
    { id: "infra", label: "Infrastructure", icon: Server },
    { id: "consumers", label: "Consumers", icon: Users },
    { id: "producers", label: "Producers", icon: Zap },
    { id: "diagnostics", label: "Diagnostics", icon: BarChart2 },
    { id: "trace", label: "Message Trace", icon: GitBranch },
    { id: "config", label: "Config & History", icon: Settings },
  ];

  const degradedQ = queues.filter((q) => q.status !== "healthy");

  return (
    <div className="fade-in">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          showQueuePicker && queues.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ margin: 0, fontSize: 13, color: "var(--text-2)" }}>Queue:</label>
              <select
                value={selectedQ}
                onChange={(e) => onSelectQueue?.(e.target.value)}
                style={{ width: 220 }}
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                    {q.status !== "healthy" ? " ⚠" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {degradedQ.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 16px",
            background: "var(--warning-bg)",
            border: "1px solid var(--warning-border)",
            borderRadius: 10,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>
            <strong>
              {degradedQ.length} queue{degradedQ.length > 1 ? "s" : ""}
            </strong>{" "}
            in degraded state: {degradedQ.map((q) => q.name).join(", ")}
          </span>
        </div>
      )}

      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <div className="tab-bar" style={{ width: "fit-content" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`tab-btn${tab === t.id ? " active" : ""}`}>
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "health" && <SystemHealthTab state={state} selectedQ={selectedQ} />}
      {tab === "infra" && (
        <InfrastructureTab
          state={state}
          selectedQ={selectedQ}
          focusShardId={focusShardId}
          focusSegmentId={focusSegmentId}
        />
      )}
      {tab === "consumers" && <ConsumersTab state={state} selectedQ={selectedQ} />}
      {tab === "producers" && <ProducersTab state={state} selectedQ={selectedQ} />}
      {tab === "diagnostics" && (
        <DiagnosticsTab state={state} selectedQ={selectedQ} focusShardId={focusShardId} />
      )}
      {tab === "trace" && <TraceTab state={state} />}
      {tab === "config" && <ConfigTab state={state} />}
    </div>
  );
}

export function DebugView({ state }) {
  const [selectedQ, setSelectedQ] = useState(state.queues[0]?.id || "");
  return (
    <DebugWorkbench
      state={state}
      selectedQ={selectedQ}
      onSelectQueue={setSelectedQ}
      queueOptions={null}
      showQueuePicker
    />
  );
}
