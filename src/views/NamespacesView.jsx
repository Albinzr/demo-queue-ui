import { useState } from "react";
import { Layers, Plus, X } from "lucide-react";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { MetricCard, Badge } from "../components/ui/Badge.jsx";
import { QueueTable } from "../components/QueueTable.jsx";
import { ServiceAccountTable } from "../components/ServiceAccountTable.jsx";

export function NamespacesView({ state, setState, setView, setSelected, selected }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", publicKey: "" });

  const selectedNs = selected?.type === "namespace" ? state.namespaces.find(n => n.id === selected.id) : null;

  const createNamespace = () => {
    if (!form.name.trim()) return;
    const newNs = { id: `ns_${Date.now()}`, accountId: state.user?.accountId || "acc_01", name: form.name.trim().toLowerCase().replace(/\s+/g,"_"), description: form.description || "—", created: new Date().toISOString().slice(0,10), queues: [], serviceAccounts: [] };
    setState({ ...state, namespaces: [...state.namespaces, newNs] });
    setForm({ name: "", description: "", publicKey: "" });
    setCreateOpen(false);
  };

  if (selectedNs) {
    const nsQueues = state.queues.filter(q => q.namespace === selectedNs.id);
    const nsSAs   = state.serviceAccounts.filter(sa => sa.namespace === selectedNs.id);
    return (
      <div className="fade-in">
        <SectionHeader
          title={selectedNs.name}
          subtitle={selectedNs.description}
          action={<button className="btn" onClick={() => setSelected(null)}><X size={14} />Close</button>}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
          <MetricCard label="Queues" value={nsQueues.length} color="var(--accent-2)" />
          <MetricCard label="Service Accounts" value={nsSAs.length} />
          <MetricCard label="Total Messages" value={(nsQueues.reduce((s,q)=>s+q.totalMessages,0)/1_000_000).toFixed(2)} unit="M" />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Queues in this namespace</h3>
        <QueueTable queues={nsQueues} namespaces={state.namespaces} onOpen={q => { setSelected({ type:"queue", id:q.id }); setView("queues"); }} />
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "28px 0 14px" }}>Service Accounts</h3>
        <ServiceAccountTable accounts={nsSAs} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <SectionHeader title="Namespaces" subtitle="Isolated workspace boundaries for queues and service accounts"
        action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={14} />New Namespace</button>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {state.namespaces.map(ns => {
          const nsQueues = state.queues.filter(q => q.namespace === ns.id);
          return (
            <div key={ns.id} onClick={() => setSelected({ type:"namespace", id:ns.id })} className="card" style={{ cursor: "pointer", transition: "all 0.15s", borderColor: "var(--border)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Layers size={18} color="var(--accent-2)" />
                </div>
                <Badge color="default">{ns.id}</Badge>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{ns.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 18, minHeight: 38 }}>{ns.description}</div>
              <div style={{ display: "flex", gap: 20, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <div><div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>Queues</div><div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-2)" }}>{nsQueues.length}</div></div>
                <div><div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>Messages</div><div style={{ fontSize: 18, fontWeight: 700 }}>{(nsQueues.reduce((s,q)=>s+q.totalMessages,0)/1_000_000).toFixed(1)}M</div></div>
                <div><div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>Created</div><div style={{ fontSize: 13, color: "var(--text-2)" }}>{ns.created}</div></div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Namespace" subtitle="Namespaces provide isolated queue & access boundaries">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label>Namespace Name</label><input placeholder="e.g. payments" value={form.name} onChange={e => setForm({...form, name:e.target.value})} /><p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>Lowercase letters, numbers, and underscores only.</p></div>
          <div><label>Description</label><input placeholder="Short description of this namespace's purpose" value={form.description} onChange={e => setForm({...form, description:e.target.value})} /></div>
          <div><label>Public Key (PEM) — Optional</label><textarea rows={3} placeholder="-----BEGIN PUBLIC KEY-----&#10;..." value={form.publicKey} onChange={e => setForm({...form, publicKey:e.target.value})} /><p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>Used for signed request verification. Can be configured later.</p></div>
          <div className="modal-footer">
            <button className="btn" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createNamespace}><Plus size={13} />Create Namespace</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
