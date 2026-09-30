"use client";

import { useMemo, useState } from "react";
import { RotateCcw, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { RoleIcon, RoleLabel } from "@/components/ui/role-icon";
import { PLAYERS, getPlayerById } from "@/data/players";
import { useAvoidPairs } from "@/hooks/use-avoid-pairs";
import { useRolePrefs } from "@/hooks/use-role-prefs";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RolesView() {
  const { getPrefs, setFill, toggleRole, resetPrefs, hydrated } =
    useRolePrefs();
  const {
    pairs,
    hasPair,
    addPair,
    removePair,
    resetPairs,
    hydrated: avoidHydrated,
  } = useAvoidPairs();
  const [pickA, setPickA] = useState<string>("");
  const [pickB, setPickB] = useState<string>("");

  const pairRows = useMemo(
    () =>
      pairs
        .map((pair) => ({
          pair,
          left: getPlayerById(pair.a),
          right: getPlayerById(pair.b),
        }))
        .filter((row) => row.left && row.right),
    [pairs]
  );

  if (!hydrated || !avoidHydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
        Loading roles…
      </div>
    );
  }

  const canAdd =
    Boolean(pickA && pickB && pickA !== pickB) && !hasPair(pickA, pickB);

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
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {prefs.fill ? (
                      "FILL — any role"
                    ) : prefs.roles.length === 0 ? (
                      "No roles selected"
                    ) : (
                      prefs.roles.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1"
                        >
                          <RoleIcon role={r} size="xs" className="opacity-70" />
                          {ROLE_LABELS[r]}
                        </span>
                      ))
                    )}
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
                      <RoleLabel role={role} size="xs" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Keep apart */}
      <div className="mt-14">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
              Team Constraints
            </p>
            <h2 className="text-2xl font-medium tracking-tight">Keep apart</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Mark pairs that should{" "}
              <span className="text-foreground/80">not</span> be on the same
              team. Competitive and Role Consider will split them.
            </p>
          </div>
          {pairs.length > 0 && (
            <Button variant="secondary" size="sm" onClick={resetPairs}>
              <RotateCcw />
              Clear pairs
            </Button>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-2 rounded-[10px] border border-white/[0.07] bg-surface p-4 sm:flex-row sm:items-center">
          <select
            value={pickA}
            onChange={(e) => setPickA(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-background px-3 py-2 text-sm outline-none focus:border-white/20"
          >
            <option value="">Player A</option>
            {PLAYERS.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === pickB}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="shrink-0 text-center text-xs text-muted">
            should NOT team with
          </span>
          <select
            value={pickB}
            onChange={(e) => setPickB(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-background px-3 py-2 text-sm outline-none focus:border-white/20"
          >
            <option value="">Player B</option>
            {PLAYERS.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === pickA}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!canAdd}
            onClick={() => {
              addPair(pickA, pickB);
              setPickA("");
              setPickB("");
            }}
          >
            <UserX />
            Add
          </Button>
        </div>

        {pairRows.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-white/[0.1] px-4 py-10 text-center text-sm text-muted">
            No keep-apart pairs yet.
          </div>
        ) : (
          <div className="space-y-2">
            {pairRows.map(({ pair, left, right }) => (
              <div
                key={`${pair.a}-${pair.b}`}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.07] bg-surface px-4 py-3"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar
                      name={left!.name}
                      playerId={left!.id}
                      size="sm"
                    />
                    <span className="text-sm font-medium">{left!.name}</span>
                  </div>
                  <span className="text-xs text-muted">≠</span>
                  <div className="flex items-center gap-2">
                    <PlayerAvatar
                      name={right!.name}
                      playerId={right!.id}
                      size="sm"
                    />
                    <span className="text-sm font-medium">{right!.name}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePair(pair)}
                  className="rounded-md border border-white/[0.08] p-1.5 text-muted transition-colors hover:border-white/15 hover:text-foreground"
                  aria-label="Remove pair"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
