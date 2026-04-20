import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal.jsx";
import { MetricCard } from "../../components/ui/Badge.jsx";
import { Plus, Search } from "lucide-react";
import {
  ACCOUNT_ROLES,
  CAPABILITY_LABELS,
  ROLE_CAPS,
  can,
  isLastOwner,
  membersForAccount,
  ownerCount,
  permissionValue,
} from "../../utils/accountAccess.js";

const CAP_KEYS = /** @type {const} */ (["manage_team", "edit_resources", "view_debug"]);

function initials(name) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAccountStats(state, accountId) {
  const nsList = state.namespaces.filter((n) => n.accountId === accountId);
  const queueIdSet = new Set(nsList.flatMap((n) => n.queues || []));
  const queues = state.queues.filter((q) => queueIdSet.has(q.id));
  const members = membersForAccount(state, accountId).length;
  const totalMessages = queues.reduce((s, q) => s + q.totalMessages, 0);
  const publishRate = queues.reduce((s, q) => s + q.publishRate, 0);
  return {
    namespaces: nsList.length,
    queues: queues.length,
    members,
    totalMessages,
    publishRate,
  };
}

export function AdminPanelView({ state, setState, flow }) {
  const manageActive = can(state, "manage_team", flow.accountId);

  const [adminTab, setAdminTab] = useState(/** @type {"accounts" | "users"} */ ("accounts"));
  const [selectedAccountId, setSelectedAccountId] = useState(flow.accountId);
  const [accountView, setAccountView] = useState(/** @type {"detail" | "create"} */ ("detail"));

  const [selectedUserKey, setSelectedUserKey] = useState(/** @type {string | null} */ (null));
  const [userView, setUserView] = useState(/** @type {"detail" | "invite"} */ ("detail"));
  const [userSearch, setUserSearch] = useState("");

  const [createAccountName, setCreateAccountName] = useState("");
  const [addForm, setAddForm] = useState({
    accountId: flow.accountId,
    name: "",
    email: "",
    role: "member",
    permissions: { ...ROLE_CAPS.member },
  });
  const [removeTarget, setRemoveTarget] = useState(null);
  const [addAccessOpen, setAddAccessOpen] = useState(false);
  const [addAccessForm, setAddAccessForm] = useState({
    accountId: "",
    role: "member",
    permissions: { ...ROLE_CAPS.member },
  });

  useEffect(() => {
    setAddForm((f) => ({ ...f, accountId: flow.accountId }));
  }, [flow.accountId]);

  useEffect(() => {
    setAddAccessOpen(false);
  }, [selectedUserKey]);

  useEffect(() => {
    if (adminTab === "accounts") {
      setSelectedUserKey(null);
      setUserView("detail");
      setUserSearch("");
    } else {
      setAccountView("detail");
    }
  }, [adminTab]);

  const uniqueUsers = useMemo(() => {
    const list = state.accountMembers ?? [];
    const byEmail = new Map();
    for (const m of list) {
      const key = (m.email || "").toLowerCase();
      if (!key) continue;
      if (!byEmail.has(key)) {
        byEmail.set(key, {
          key,
          name: m.name,
          email: m.email,
          userId: m.userId,
          memberships: [],
        });
      }
      byEmail.get(key).memberships.push(m);
    }
    return Array.from(byEmail.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [state.accountMembers]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return uniqueUsers;
    return uniqueUsers.filter(
      (x) =>
        (x.name || "").toLowerCase().includes(q) ||
        (x.email || "").toLowerCase().includes(q)
    );
  }, [uniqueUsers, userSearch]);

  const selectedUser = selectedUserKey ? uniqueUsers.find((x) => x.key === selectedUserKey) : null;

  /** Organizations this person is not on yet, where the signed-in user may manage the team. */
  const addableAccounts = useMemo(() => {
    if (!selectedUser) return [];
    const have = new Set(selectedUser.memberships.map((m) => m.accountId));
    return state.accounts.filter((a) => !have.has(a.id) && can(state, "manage_team", a.id));
  }, [selectedUser, state.accounts, state.accountMembers, state.user]);

  const canAddAccountAccess = addableAccounts.length > 0;

  useEffect(() => {
    if (selectedUserKey && !uniqueUsers.some((x) => x.key === selectedUserKey)) {
      setSelectedUserKey(null);
    }
  }, [uniqueUsers, selectedUserKey]);

  const createAccount = () => {
    const name = createAccountName.trim();
    if (!name || !manageActive) return;
    const id = `acc_${Date.now()}`;
    const joinedAt = new Date().toISOString().slice(0, 10);
    const memberId = `m_${Date.now()}`;
    setState((s) => ({
      ...s,
      accounts: [...s.accounts, { id, name, created: joinedAt }],
      accountMembers: [
        ...(s.accountMembers || []),
        {
          id: memberId,
          accountId: id,
          userId: s.user.id,
          email: s.user.email,
          name: s.user.name,
          role: "owner",
          joinedAt,
        },
      ],
    }));
    setCreateAccountName("");
    setSelectedAccountId(id);
    setAccountView("detail");
  };

  const addUserToAccount = () => {
    if (!manageActive) return;
    const accountId = addForm.accountId;
    const email = addForm.email.trim().toLowerCase();
    const name = addForm.name.trim();
    if (!email || !name || !accountId) return;
    const existing = membersForAccount(state, accountId);
    if (existing.some((r) => (r.email || "").toLowerCase() === email)) return;
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
          permissions: { ...addForm.permissions },
        },
      ],
    }));
    setAddForm((f) => ({
      ...f,
      name: "",
      email: "",
      role: "member",
      permissions: { ...ROLE_CAPS.member },
    }));
    setSelectedUserKey(email);
    setUserView("detail");
  };

  const setMemberRole = (memberId, newRole) => {
    setState((s) => {
      const m = s.accountMembers.find((x) => x.id === memberId);
      if (!m || !can(s, "manage_team", m.accountId)) return s;
      if (m.role === "owner" && newRole !== "owner" && ownerCount(s, m.accountId) <= 1) return s;
      return {
        ...s,
        accountMembers: s.accountMembers.map((x) =>
          x.id === memberId ? { ...x, role: newRole, permissions: undefined } : x
        ),
      };
    });
  };

  const setMemberCapability = (memberId, capability, checked) => {
    setState((s) => {
      const m = s.accountMembers.find((x) => x.id === memberId);
      if (!m || !can(s, "manage_team", m.accountId)) return s;
      if (m.role === "owner" && capability === "manage_team" && !checked && ownerCount(s, m.accountId) <= 1) {
        return s;
      }
      const nextPerms = { ...(m.permissions || {}), [capability]: checked };
      return {
        ...s,
        accountMembers: s.accountMembers.map((x) =>
          x.id === memberId ? { ...x, permissions: nextPerms } : x
        ),
      };
    });
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    const { id, accountId } = removeTarget;
    if (isLastOwner(state, accountId, id)) return;
    setState((s) => ({
      ...s,
      accountMembers: s.accountMembers.filter((m) => m.id !== id),
    }));
    setRemoveTarget(null);
  };

  const openAddAccessModal = () => {
    if (!selectedUser || addableAccounts.length === 0) return;
    const first = addableAccounts[0].id;
    setAddAccessForm({
      accountId: first,
      role: "member",
      permissions: { ...ROLE_CAPS.member },
    });
    setAddAccessOpen(true);
  };

  const submitAddAccess = () => {
    if (!selectedUser || !addAccessForm.accountId) return;
    if (!can(state, "manage_team", addAccessForm.accountId)) return;
    const email = (selectedUser.email || "").toLowerCase();
    if (membersForAccount(state, addAccessForm.accountId).some((r) => (r.email || "").toLowerCase() === email)) {
      return;
    }
    const id = `m_${Date.now()}`;
    const joinedAt = new Date().toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      accountMembers: [
        ...(s.accountMembers || []),
        {
          id,
          accountId: addAccessForm.accountId,
          userId: selectedUser.userId,
          email: selectedUser.email,
          name: selectedUser.name,
          role: addAccessForm.role,
          joinedAt,
          permissions: { ...addAccessForm.permissions },
        },
      ],
    }));
    setAddAccessOpen(false);
  };

  const selectedAccount = state.accounts.find((a) => a.id === selectedAccountId);
  const accountStats = selectedAccountId ? getAccountStats(state, selectedAccountId) : null;

  const listItemClass = (active) =>
    `admin-list-item${active ? " admin-list-item--active" : ""}`;

  return (
    <div className="fade-in admin-page">
      <header className="admin-page-header">
        <h1 className="admin-page-title">Admin</h1>
        <p className="admin-page-desc">
          Organizations, people, and access. The sidebar sets which account Resources uses.
        </p>
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn${adminTab === "accounts" ? " active" : ""}`}
            onClick={() => setAdminTab("accounts")}
          >
            Accounts
          </button>
          <button
            type="button"
            className={`tab-btn${adminTab === "users" ? " active" : ""}`}
            onClick={() => setAdminTab("users")}
          >
            Users
          </button>
        </div>
      </header>

      <div className="admin-shell">
        <div className="admin-rail">
          {adminTab === "accounts" && (
            <>
              <div className="admin-rail-header">
                <p className="admin-rail-label">Organizations · {state.accounts.length}</p>
              </div>
              <div className="admin-rail-scroll">
                {[...state.accounts]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((a) => {
                    const active = accountView === "detail" && selectedAccountId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={listItemClass(active)}
                        onClick={() => {
                          setSelectedAccountId(a.id);
                          setAccountView("detail");
                        }}
                      >
                        <div className="admin-avatar">{initials(a.name)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="admin-list-primary">{a.name}</div>
                          <div className="admin-list-meta">{a.id}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
              <div className="admin-rail-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => {
                    setAccountView("create");
                    setSelectedAccountId(null);
                  }}
                  disabled={!manageActive}
                >
                  <Plus size={16} /> New organization
                </button>
              </div>
            </>
          )}

          {adminTab === "users" && (
            <>
              <div className="admin-rail-header">
                <p className="admin-rail-label">Directory · {uniqueUsers.length}</p>
                <div className="admin-search-wrap">
                  <Search size={15} aria-hidden />
                  <input
                    placeholder="Search by name or email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    aria-label="Search users"
                  />
                </div>
              </div>
              <div className="admin-rail-scroll">
                {filteredUsers.map((person) => {
                  const active = userView === "detail" && selectedUserKey === person.key;
                  return (
                    <button
                      key={person.key}
                      type="button"
                      className={listItemClass(active)}
                      onClick={() => {
                        setSelectedUserKey(person.key);
                        setUserView("detail");
                      }}
                    >
                      <div className="admin-avatar">{initials(person.name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="admin-list-primary">{person.name}</div>
                        <div className="admin-list-secondary" title={person.email}>
                          {person.email}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && userSearch.trim() && (
                  <p style={{ fontSize: 13, color: "var(--text-3)", padding: "12px 6px", margin: 0 }}>
                    No matches for “{userSearch.trim()}”.
                  </p>
                )}
              </div>
              <div className="admin-rail-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => {
                    setUserView("invite");
                    setSelectedUserKey(null);
                  }}
                  disabled={!manageActive}
                >
                  <Plus size={16} aria-hidden /> Add user
                </button>
              </div>
            </>
          )}
        </div>

        <div className="admin-detail">
          {adminTab === "accounts" && accountView === "create" && (
            <div className="admin-form-panel">
              <h2>New organization</h2>
              <p className="admin-form-lead">Creates an account and adds you as owner. You can switch to it from the sidebar.</p>
              <label htmlFor="admin-new-account-name">Name</label>
              <input
                id="admin-new-account-name"
                placeholder="e.g. Northwind Labs"
                value={createAccountName}
                onChange={(e) => setCreateAccountName(e.target.value)}
                disabled={!manageActive}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => setAccountView("detail")}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={createAccount}
                  disabled={!manageActive || !createAccountName.trim()}
                >
                  Create organization
                </button>
              </div>
            </div>
          )}

          {adminTab === "accounts" && accountView === "detail" && !selectedAccount && (
            <div className="admin-detail-empty">
              Choose an organization from the list or create a new one.
            </div>
          )}

          {adminTab === "accounts" && accountView === "detail" && selectedAccount && accountStats && (
            <>
              <div className="admin-account-hero">
                <h2>{selectedAccount.name}</h2>
                <div className="admin-meta-row">
                  <span>Created {selectedAccount.created}</span>
                  <span className="admin-meta-id">{selectedAccount.id}</span>
                </div>
              </div>
              <p className="admin-rail-label" style={{ marginBottom: 14 }}>
                Snapshot
              </p>
              <div className="admin-metric-grid">
                <MetricCard label="Namespaces" value={String(accountStats.namespaces)} />
                <MetricCard label="Queues" value={String(accountStats.queues)} />
                <MetricCard label="Members" value={String(accountStats.members)} />
                <MetricCard label="Messages" value={accountStats.totalMessages.toLocaleString()} />
                <MetricCard
                  label="Publish rate"
                  value={accountStats.publishRate.toLocaleString()}
                  unit="msg/s"
                  color="var(--accent)"
                />
              </div>
            </>
          )}

          {adminTab === "users" && userView === "invite" && (
            <div className="admin-form-panel">
              <h2>Add user</h2>
              <p className="admin-form-lead">
                Grant access on one account. Set role and fine-grained permissions, then enter their name and email.
              </p>

              <span className="admin-step-label">Account</span>
              <label htmlFor="admin-invite-account" className="visually-hidden">
                Account
              </label>
              <select
                id="admin-invite-account"
                value={addForm.accountId}
                onChange={(e) => setAddForm({ ...addForm, accountId: e.target.value })}
                disabled={!manageActive}
              >
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <span className="admin-step-label">Role</span>
              <label htmlFor="admin-invite-role" className="visually-hidden">
                Role
              </label>
              <select
                id="admin-invite-role"
                value={addForm.role}
                onChange={(e) => {
                  const role = e.target.value;
                  setAddForm((f) => ({
                    ...f,
                    role,
                    permissions: { ...ROLE_CAPS[role in ROLE_CAPS ? role : "viewer"] },
                  }));
                }}
                disabled={!manageActive}
              >
                {ACCOUNT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <span className="admin-step-label">Permissions on this account</span>
              <div className="admin-perm-box">
                {CAP_KEYS.map((cap) => (
                  <label key={cap}>
                    <input
                      type="checkbox"
                      checked={Boolean(addForm.permissions[cap])}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          permissions: { ...f.permissions, [cap]: e.target.checked },
                        }))
                      }
                      disabled={!manageActive}
                      style={{ width: 15, height: 15, accentColor: "var(--accent)" }}
                    />
                    {CAPABILITY_LABELS[cap]}
                  </label>
                ))}
              </div>

              <span className="admin-step-label">Profile</span>
              <label htmlFor="admin-invite-name">Full name</label>
              <input
                id="admin-invite-name"
                placeholder="Full name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                disabled={!manageActive}
              />
              <label htmlFor="admin-invite-email">Email</label>
              <input
                id="admin-invite-email"
                type="email"
                placeholder="email@company.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                disabled={!manageActive}
              />
              {addForm.email.trim() &&
                membersForAccount(state, addForm.accountId).some(
                  (r) => (r.email || "").toLowerCase() === addForm.email.trim().toLowerCase()
                ) && (
                  <p style={{ fontSize: 12, color: "var(--error)", marginTop: 8 }}>This email is already on that account.</p>
                )}
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <button type="button" className="btn" onClick={() => setUserView("detail")}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addUserToAccount}
                  disabled={
                    !manageActive ||
                    !addForm.name.trim() ||
                    !addForm.email.trim() ||
                    membersForAccount(state, addForm.accountId).some(
                      (r) => (r.email || "").toLowerCase() === addForm.email.trim().toLowerCase()
                    )
                  }
                >
                  Add user
                </button>
              </div>
            </div>
          )}

          {adminTab === "users" && userView === "detail" && !selectedUser && (
            <div className="admin-detail-empty">
              Select someone from the list, or use Add user below.
            </div>
          )}

          {adminTab === "users" && userView === "detail" && selectedUser && (
            <>
              <div className="admin-user-hero">
                <div className="admin-avatar admin-avatar--lg">{initials(selectedUser.name)}</div>
                <div>
                  <h2>{selectedUser.name}</h2>
                  <p>{selectedUser.email}</p>
                </div>
              </div>

              <dl className="admin-dl-grid">
                <div>
                  <dt>User ID</dt>
                  <dd className="mono">{selectedUser.userId}</dd>
                </div>
                <div>
                  <dt>Accounts</dt>
                  <dd>{selectedUser.memberships.length}</dd>
                </div>
              </dl>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 4,
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <h3 className="admin-section-title" style={{ marginBottom: 6 }}>
                    Access by organization
                  </h3>
                  <p className="admin-section-desc" style={{ marginBottom: 0 }}>
                    Adjust role and capabilities per account, remove access, or grant access to another organization.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flexShrink: 0 }}
                  onClick={openAddAccessModal}
                  disabled={!canAddAccountAccess}
                  title={
                    !canAddAccountAccess
                      ? selectedUser.memberships.length >= state.accounts.length
                        ? "This person is already on every organization you can manage."
                        : "You need team management rights on an organization they are not yet on."
                      : undefined
                  }
                >
                  <Plus size={16} aria-hidden /> Add access
                </button>
              </div>

              <div className="admin-membership-stack">
                {selectedUser.memberships.map((m) => {
                  const accName = state.accounts.find((a) => a.id === m.accountId)?.name || m.accountId;
                  const rowManage = can(state, "manage_team", m.accountId);
                  const blockDemote = m.role === "owner" && ownerCount(state, m.accountId) <= 1;
                  return (
                    <article key={m.id} className="admin-membership-card">
                      <header>
                        <h4>{accName}</h4>
                        <button
                          type="button"
                          className="btn-ghost btn"
                          style={{
                            fontSize: 13,
                            color: isLastOwner(state, m.accountId, m.id) ? "var(--text-4)" : "var(--error)",
                          }}
                          disabled={!rowManage || isLastOwner(state, m.accountId, m.id)}
                          onClick={() =>
                            setRemoveTarget({ id: m.id, accountId: m.accountId, name: m.name, email: m.email })
                          }
                        >
                          Remove access
                        </button>
                      </header>
                      <label htmlFor={`role-${m.id}`} style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
                        Role
                      </label>
                      <select
                        id={`role-${m.id}`}
                        value={m.role}
                        onChange={(e) => setMemberRole(m.id, e.target.value)}
                        disabled={!rowManage}
                        style={{ marginBottom: 16, maxWidth: 220 }}
                      >
                        {ACCOUNT_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 10 }}>
                        Capabilities
                      </div>
                      <div className="admin-cap-row">
                        {CAP_KEYS.map((cap) => (
                          <label key={cap}>
                            <input
                              type="checkbox"
                              checked={permissionValue(m, cap)}
                              disabled={!rowManage || (blockDemote && cap === "manage_team")}
                              onChange={(e) => setMemberCapability(m.id, cap, e.target.checked)}
                              style={{ width: 15, height: 15, accentColor: "var(--accent)" }}
                            />
                            {CAPABILITY_LABELS[cap]}
                          </label>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {!manageActive && (
        <div className="admin-banner">
          You can’t add organizations or users for the account selected in the sidebar. Switch accounts or ask an owner.
        </div>
      )}

      <Modal
        open={addAccessOpen}
        onClose={() => setAddAccessOpen(false)}
        title="Add organization access"
        subtitle={selectedUser ? `${selectedUser.name} · ${selectedUser.email}` : ""}
        width={480}
      >
        {selectedUser && (
          <div className="admin-form-panel" style={{ maxWidth: "none" }}>
            <span className="admin-step-label">Organization</span>
            <label htmlFor="add-access-account" className="visually-hidden">
              Organization
            </label>
            <select
              id="add-access-account"
              value={addAccessForm.accountId}
              onChange={(e) => setAddAccessForm((f) => ({ ...f, accountId: e.target.value }))}
            >
              {addableAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <span className="admin-step-label">Role</span>
            <label htmlFor="add-access-role" className="visually-hidden">
              Role
            </label>
            <select
              id="add-access-role"
              value={addAccessForm.role}
              onChange={(e) => {
                const role = e.target.value;
                setAddAccessForm((f) => ({
                  ...f,
                  role,
                  permissions: { ...ROLE_CAPS[role in ROLE_CAPS ? role : "viewer"] },
                }));
              }}
            >
              {ACCOUNT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <span className="admin-step-label">Permissions on this organization</span>
            <div className="admin-perm-box">
              {CAP_KEYS.map((cap) => (
                <label key={cap}>
                  <input
                    type="checkbox"
                    checked={Boolean(addAccessForm.permissions[cap])}
                    onChange={(e) =>
                      setAddAccessForm((f) => ({
                        ...f,
                        permissions: { ...f.permissions, [cap]: e.target.checked },
                      }))
                    }
                    style={{ width: 15, height: 15, accentColor: "var(--accent)" }}
                  />
                  {CAPABILITY_LABELS[cap]}
                </label>
              ))}
            </div>

            <div className="modal-footer" style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              <button type="button" className="btn" onClick={() => setAddAccessOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitAddAccess}
                disabled={
                  !addAccessForm.accountId ||
                  membersForAccount(state, addAccessForm.accountId).some(
                    (r) => (r.email || "").toLowerCase() === (selectedUser.email || "").toLowerCase()
                  )
                }
              >
                Add access
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove access" subtitle="">
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
          Remove <strong>{removeTarget?.name}</strong> from this account?
        </p>
        <div className="modal-footer" style={{ marginTop: 0 }}>
          <button type="button" className="btn" onClick={() => setRemoveTarget(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirmRemove}
            disabled={removeTarget && isLastOwner(state, removeTarget.accountId, removeTarget.id)}
          >
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
