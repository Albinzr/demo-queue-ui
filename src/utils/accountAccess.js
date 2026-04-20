/** @typedef {'owner'|'admin'|'member'|'viewer'} AccountRole */

/** @typedef {'manage_team'|'edit_resources'|'view_debug'} AccountCapability */

/** Baseline capabilities per role (invites, effective access when no overrides). */
export const ROLE_CAPS = {
  owner: { manage_team: true, edit_resources: true, view_debug: true },
  admin: { manage_team: true, edit_resources: true, view_debug: true },
  member: { manage_team: false, edit_resources: true, view_debug: true },
  viewer: { manage_team: false, edit_resources: false, view_debug: true },
};

export const ACCOUNT_ROLES = /** @type {const} */ (["owner", "admin", "member", "viewer"]);

/** Labels for capability toggles in Admin (and elsewhere). */
export const CAPABILITY_LABELS = {
  manage_team: "Manage team",
  edit_resources: "Edit resources",
  view_debug: "View debug",
};

/**
 * Effective boolean for one capability (optional `member.permissions` overrides role defaults).
 * @param {object | null | undefined} member
 * @param {AccountCapability} capability
 */
export function permissionValue(member, capability) {
  if (!member) return false;
  if (member.permissions && typeof member.permissions[capability] === "boolean") {
    return member.permissions[capability];
  }
  const role = member.role in ROLE_CAPS ? member.role : "viewer";
  return Boolean(ROLE_CAPS[role]?.[capability]);
}

/**
 * @param {object} state
 * @param {string} accountId
 */
export function membersForAccount(state, accountId) {
  const list = state.accountMembers ?? [];
  return list.filter((m) => m.accountId === accountId);
}

/**
 * Membership row for the signed-in user on the given account, if any.
 * If the user belongs to the account but has no row (legacy), treat as owner.
 * @param {object} state
 * @param {string} accountId
 */
export function currentMember(state, accountId) {
  const uid = state.user?.id;
  const email = (state.user?.email || "").toLowerCase();
  const members = membersForAccount(state, accountId);
  const row =
    members.find((m) => m.userId === uid) ||
    members.find((m) => (m.email || "").toLowerCase() === email) ||
    null;
  if (row) return row;
  if (accountId === state.user?.accountId) {
    return {
      id: "legacy",
      accountId,
      userId: uid,
      email: state.user.email,
      name: state.user.name,
      role: /** @type {AccountRole} */ ("owner"),
      joinedAt: "—",
    };
  }
  return null;
}

/**
 * @param {object} state
 * @param {AccountCapability} capability
 * @param {string} [accountId] defaults to state.user.accountId
 */
export function can(state, capability, accountId = state.user?.accountId) {
  const m = currentMember(state, accountId);
  return permissionValue(m, capability);
}

export function ownerCount(state, accountId) {
  return membersForAccount(state, accountId).filter((m) => m.role === "owner").length;
}

export function isLastOwner(state, accountId, memberId) {
  const m = state.accountMembers?.find((x) => x.id === memberId);
  if (!m || m.role !== "owner") return false;
  return ownerCount(state, accountId) <= 1;
}
