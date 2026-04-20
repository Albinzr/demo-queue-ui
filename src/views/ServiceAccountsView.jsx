import { useState } from "react";
import { Plus } from "lucide-react";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { ServiceAccountTable } from "../components/ServiceAccountTable.jsx";

export function ServiceAccountsView({ state, setState }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", namespace: state.namespaces[0]?.id || "", permissions: [] });

  const toggle = (queueName, perm) => {
    const existing = form.permissions.find(p => p.queue === queueName);
    if (existing) {
      const newPerms = existing.perms.includes(perm) ? existing.perms.filter(p => p !== perm) : [...existing.perms, perm];
      if (newPerms.length === 0) setForm({...form, permissions: form.permissions.filter(p => p.queue !== queueName)});
      else setForm({...form, permissions: form.permissions.map(p => p.queue === queueName ? {...p, perms:newPerms} : p)});
    } else {
      setForm({...form, permissions: [...form.permissions, { queue: queueName, perms: [perm] }]});
    }
  };

  const create = () => {
    if (!form.name.trim()) return;
    const newSA = { id:`sa_${Date.now()}`, namespace:form.namespace, name:form.name.trim().toLowerCase().replace(/\s+/g,"-"), keyPrefix:`pk_live_${Math.random().toString(36).slice(2,6)}`, created:new Date().toISOString().slice(0,10), permissions:form.permissions };
    setState({...state, serviceAccounts:[...state.serviceAccounts, newSA]});
    setForm({ name:"", namespace:state.namespaces[0]?.id||"", permissions:[] });
    setCreateOpen(false);
  };

  const nsQueues = state.queues.filter(q => q.namespace === form.namespace);

  return (
    <div className="fade-in">
      <SectionHeader title="Service Accounts" subtitle="Programmatic API access with queue-level permission controls"
        action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={13} />New Service Account</button>}
      />
      <ServiceAccountTable accounts={state.serviceAccounts} />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Service Account" subtitle="Service accounts authenticate producers and consumers" width={620}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label>Namespace</label><select value={form.namespace} onChange={e => setForm({...form, namespace:e.target.value, permissions:[]})}>{state.namespaces.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
            <div><label>Account Name</label><input placeholder="e.g. order-worker" value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></div>
          </div>
          <div>
            <label>Queue Permissions</label>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 14px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["Queue","Publish","Subscribe","Remove"].map(h => <span key={h} style={{ fontSize:11, fontWeight:600, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</span>)}
              </div>
              {nsQueues.length === 0 && <div style={{ padding:16, textAlign:"center", color:"var(--text-3)", fontSize:13 }}>No queues in this namespace</div>}
              {nsQueues.map(q => {
                const existing = form.permissions.find(p => p.queue === q.name);
                return (
                  <div key={q.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", padding:"11px 14px", borderBottom:"1px solid var(--border)", alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{q.name}</span>
                    {["publish","subscribe","remove"].map(p => (
                      <label key={p} style={{ display:"flex", alignItems:"center", gap:7, margin:0, fontSize:13, color:"var(--text)", fontWeight:400 }}>
                        <input type="checkbox" checked={existing?.perms.includes(p)||false} onChange={() => toggle(q.name,p)} style={{ width:15, height:15, accentColor:"var(--accent)", cursor:"pointer" }} />
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={create}><Plus size={13} />Create Account</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
