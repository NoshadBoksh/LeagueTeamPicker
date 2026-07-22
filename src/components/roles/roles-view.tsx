"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { PLAYERS } from "@/data/players";
import { useRolePrefs } from "@/hooks/use-role-prefs";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RolesView() {
  const { getPrefs, setFill, toggleRole, resetPrefs, hydrated } =
    useRolePrefs();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
        Loading roles…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Playable Roles
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Role Assign
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Pick which lanes each player can take. Roles you leave off will
            never be assigned in Competitive or Role Consider. Use{" "}
            <span className="text-foreground/80">FILL</span> if they can play
            anywhere.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={resetPrefs}>
          <RotateCcw />
          Reset to FILL
        </Button>
      </div>

      <div className="space-y-2">
        {PLAYERS.map((player) => {
          const prefs = getPrefs(player.id);
          return (
            <div
              key={player.id}
              className="flex flex-col gap-3 rounded-[10px] border border-white/[0.07] bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <PlayerAvatar
                  name={player.name}
                  playerId={player.id}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium tracking-tight">
                    {player.name}
                  </div>
                  <div className="text-xs text-muted">
                    {prefs.fill
                      ? "FILL — any role"
                      : prefs.roles.length === 0
                        ? "No roles selected"
                        : prefs.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFill(player.id, !prefs.fill)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-[11px] font-medium tracking-wide transition-colors",
                    prefs.fill
                      ? "border-white/25 bg-white/[0.1] text-foreground"
                      : "border-white/[0.08] bg-background/40 text-muted hover:border-white/[0.14] hover:text-foreground"
                  )}
                >
                  FILL
                </button>

                <span className="mx-0.5 hidden h-4 w-px bg-white/[0.08] sm:block" />

                {ROLES.map((role: Role) => {
                  const active = !prefs.fill && prefs.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(player.id, role)}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        prefs.fill && "opacity-40",
                        active
                          ? "border-white/25 bg-white/[0.1] text-foreground"
                          : "border-white/[0.08] bg-background/40 text-muted hover:border-white/[0.14] hover:text-foreground"
                      )}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
