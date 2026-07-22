"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getPlayerRolePrefs } from "@/lib/role-prefs";
import {
  type PlayerRolePrefs,
  type Role,
  type RolePrefsOverride,
} from "@/lib/types";

const KEY = "customs-draft:role-prefs";

export function useRolePrefs() {
  const [prefs, setPrefs, hydrated] = useLocalStorage<RolePrefsOverride>(
    KEY,
    {}
  );

  const getPrefs = useCallback(
    (playerId: string): PlayerRolePrefs =>
      getPlayerRolePrefs(prefs, playerId),
    [prefs]
  );

  const setFill = useCallback(
    (playerId: string, fill: boolean) => {
      setPrefs((prev) => {
        const current = getPlayerRolePrefs(prev, playerId);
        return {
          ...prev,
          [playerId]: { ...current, fill },
        };
      });
    },
    [setPrefs]
  );

  const toggleRole = useCallback(
    (playerId: string, role: Role) => {
      setPrefs((prev) => {
        const current = getPlayerRolePrefs(prev, playerId);
        const has = current.roles.includes(role);
        const roles = has
          ? current.roles.filter((r) => r !== role)
          : [...current.roles, role];
        return {
          ...prev,
          [playerId]: {
            fill: false,
            roles,
          },
        };
      });
    },
    [setPrefs]
  );

  const resetPrefs = useCallback(() => {
    setPrefs({});
  }, [setPrefs]);

  return {
    prefs,
    getPrefs,
    setFill,
    toggleRole,
    resetPrefs,
    hydrated,
  };
}
