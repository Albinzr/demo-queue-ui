import { useState, useMemo } from "react";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import {
  membersForAccount,
  can,
  ownerCount,
  isLastOwner,
  ACCOUNT_ROLES,
} from "../../utils/accountAccess.js";

const ROLE_BADGE = {
  owner: "accent",
  admin: "info",
  member: "default",
  viewer: "default",
};

export function AccountTeamView({ state, setState, flow }) {
  const accountId = flow.accountId;
  const account = state.accounts.find((a) => a.id === accountId);
  const rows = useMemo(() => membersForAccount(state, accountId), [state.accountMembers, accountId]);
  const manageTeam = can(state, "manage_team", accountId);

  const [addOpen, setAddOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(null);
  const [removeId, setRemoveId] = useState(null);

  const [addForm, setAddForm] = useState({ name: "", email: "", role: "member" });
  const [rolePick, setRolePick] = useState("member");

  const openRoleEditor = (m) => {
    setRolePick(m.role);
    setRoleOpen(m);
  };

  const applyRoleChange = () => {
    if (!roleOpen) return;
    if (roleOpen.role === "owner" && rolePick !== "owner" && ownerCount(state, accountId) <= 1) {
      return;
    }
    setState((s) => ({
      ...s,
      accountMembers: s.accountMembers.map((m) =>
        m.id === roleOpen.id ? { ...m, role: rolePick } : m,
      ),
    }));
    setRoleOpen(null);
  };

  const addMember = () => {
    const email = addForm.email.trim().toLowerCase();
    const name = addForm.name.trim();
    if (!email || !name) return;
    if (rows.some((r) => (r.email || "").toLowerCase() === email)) {
      return;
    }
    const id = `m_${Date.now()}`;
    const userId = `u_${email.split("@")[0].replace(/[^a-z0-9]/gi, "_")}_${Date.now().toString(36)}`;
    const joinedAt = new Date().toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      accountMembers: [
        ...(s.accountMembers || []),
        {
          id,
          accountId,
          userId,
          email,
          name,
          role: addForm.role,
          joinedAt,
        },
      ],
    }));
    setAddForm({ name: "", email: "", role: "member" });
    setAddOpen(false);
  };

  const confirmRemove = () => {
    if (!removeId) return;
    if (isLastOwner(state, accountId, removeId)) return;
    setState((s) => ({
      ...s,
      accountMembers: s.accountMembers.filter((m) => m.id !== removeId),
    }));
    setRemoveId(null);
  };

  const blockDemoteLastOwner =
    roleOpen?.role === "owner" && rolePick !== "owner" && ownerCount(state, accountId) <= 1;

  return (
    <div className="fade-in">
      <SectionHeader
        title="Team & access"
        subtitle={
          account
            ? `People and roles on ${account.name}. Roles control who can manage the team, change resources, and use Debug.`
            : "Select an account from the sidebar."
        }
        action={
          manageTeam ? (
            <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add member
            </button>
          ) : null
        }
      />

      {!manageTeam && (
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20, maxWidth: 640 }}>
          You have read-only access to this list. Ask an owner or admin to change roles or invite people.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-3)" }}>
          No members on this account yet. {manageTeam ? "Add someone to get started." : ""}
        </div>
      ) : (
        <div className="data-table">
          <div
            className="table-header"
            style={{ gridTemplateColumns: manageTeam ? "1.2fr 1.4fr 100px 100px 1fr 140px" : "1.2fr 1.4fr 100px 100px 1fr" }}
          >
            {["Name", "Email", "Role", "Joined", "User ID", ...(manageTeam ? ["Actions"] : [])].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {rows.map((m) => {
            return (
              <div
                key={m.id}
                className="table-row"
                style={{
                  gridTemplateColumns: manageTeam ? "1.2fr 1.4fr 100px 100px 1fr 140px" : "1.2fr 1.4fr 100px 100px 1fr",
                }}
              >
                <span style={{ fontWeight: 600 }}>{m.name}</span>
                <span style={{ color: "var(--text-2)", fontSize: 13 }}>{m.email}</span>
                <Badge color={ROLE_BADGE[m.role] || "default"}>{m.role}</Badge>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{m.joinedAt}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {m.userId}
                </span>
                {manageTeam ? (
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button type="button" className="btn-ghost btn" style={{ padding: "6px 8px" }} onClick={() => openRoleEditor(m)} title="Change role">
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn"
                      style={{ padding: "6px 8px", color: isLastOwner(state, accountId, m.id) ? "var(--text-4)" : "var(--error)" }}
                      disabled={isLastOwner(state, accountId, m.id)}
                      onClick={() => setRemoveId(m.id)}
                      title={isLastOwner(state, accountId, m.id) ? "Cannot remove the only owner" : "Remove"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add member" subtitle="They get access immediately (demo — no email invite).">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Name</label>
            <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Full name" />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="name@company.com"
            />
            {rows.some((r) => (r.email || "").toLowerCase() === addForm.email.trim().toLowerCase() && addForm.email.trim()) && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: 6 }}>This email is already on the account.</p>
            )}
          </div>
          <div>
            <label>Role</label>
            <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
              {ACCOUNT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={addMember}
              disabled={
                !addForm.name.trim() ||
                !addForm.email.trim() ||
                rows.some((r) => (r.email || "").toLowerCase() === addForm.email.trim().toLowerCase())
              }
            >
              <Users size={14} /> Add
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!roleOpen}
        onClose={() => setRoleOpen(null)}
        title="Change role"
        subtitle={roleOpen ? `${roleOpen.name} · ${roleOpen.email}` : ""}
      >
        {roleOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label>Role</label>
              <select value={rolePick} onChange={(e) => setRolePick(e.target.value)}>
                {ACCOUNT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {blockDemoteLastOwner && (
              <p style={{ fontSize: 13, color: "var(--error)" }}>This account must keep at least one owner.</p>
            )}
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setRoleOpen(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={applyRoleChange} disabled={blockDemoteLastOwner}>
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        title="Remove member"
        subtitle="They will lose access to this account in the demo UI."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 14, color: "var(--text-2)" }}>
            Remove <strong>{rows.find((r) => r.id === removeId)?.name}</strong> from this account?
          </p>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setRemoveId(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmRemove} disabled={removeId && isLastOwner(state, accountId, removeId)}>
              Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
