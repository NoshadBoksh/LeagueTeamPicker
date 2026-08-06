"use client";

import { useCallback } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import { getPlayerRolePrefs } from "@/lib/role-prefs";
import {
  type PlayerRolePrefs,
  type Role,
  type RolePrefsOverride,
} from "@/lib/types";

export function useRolePrefs() {
  const { state, updateState, hydrated } = useAppState();
  const prefs = state.rolePrefs;

  const getPrefs = useCallback(
    (playerId: string): PlayerRolePrefs =>
      getPlayerRolePrefs(prefs, playerId),
    [prefs]
  );

  const setFill = useCallback(
    (playerId: string, fill: boolean) => {
      updateState((prev) => {
        const current = getPlayerRolePrefs(prev.rolePrefs, playerId);
        const rolePrefs: RolePrefsOverride = {
          ...prev.rolePrefs,
          [playerId]: { ...current, fill },
        };
        return { ...prev, rolePrefs };
      });
    },
    [updateState]
  );

  const toggleRole = useCallback(
    (playerId: string, role: Role) => {
      updateState((prev) => {
        const current = getPlayerRolePrefs(prev.rolePrefs, playerId);
        const has = current.roles.includes(role);
        const roles = has
          ? current.roles.filter((r) => r !== role)
          : [...current.roles, role];
        const rolePrefs: RolePrefsOverride = {
          ...prev.rolePrefs,
          [playerId]: {
            fill: false,
            roles,
          },
        };
        return { ...prev, rolePrefs };
      });
    },
    [updateState]
  );

  const resetPrefs = useCallback(() => {
    updateState((prev) => ({ ...prev, rolePrefs: {} }));
  }, [updateState]);

  return {
    prefs,
    getPrefs,
    setFill,
    toggleRole,
    resetPrefs,
    hydrated,
  };
}
