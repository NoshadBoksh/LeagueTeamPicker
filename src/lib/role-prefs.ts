import {
  DEFAULT_ROLE_PREFS,
  ROLES,
  type PlayerRolePrefs,
  type Role,
  type RolePrefsOverride,
} from "@/lib/types";
import { BOT_LANE_ROLE_PREFS } from "@/lib/bot-lane-duos";

export function getPlayerRolePrefs(
  prefs: RolePrefsOverride,
  playerId: string
): PlayerRolePrefs {
  const locked = BOT_LANE_ROLE_PREFS[playerId];
  if (locked) return { fill: locked.fill, roles: [...locked.roles] };

  const raw = prefs[playerId];
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ROLE_PREFS };
  return {
    fill: Boolean(raw.fill),
    roles: Array.isArray(raw.roles)
      ? raw.roles.filter((r): r is Role => ROLES.includes(r))
      : [],
  };
}

export function resolveRolePrefs(
  prefs: RolePrefsOverride | undefined,
  playerId: string
): PlayerRolePrefs {
  if (!prefs) return { ...DEFAULT_ROLE_PREFS };
  return getPlayerRolePrefs(prefs, playerId);
}

/** Roles this player is allowed to be assigned. */
export function getAllowedRoles(
  playerId: string,
  prefs?: RolePrefsOverride
): Role[] {
  const p = resolveRolePrefs(prefs, playerId);
  if (p.fill) return [...ROLES];
  return p.roles;
}

export function canBeAssignedRole(
  playerId: string,
  role: Role,
  prefs?: RolePrefsOverride
): boolean {
  return getAllowedRoles(playerId, prefs).includes(role);
}
