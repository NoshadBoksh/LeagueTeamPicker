"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { PLAYERS, getPlayerById } from "@/data/players";
import { useDraftHistory } from "@/hooks/use-draft-history";
import { mostCommonId, mostCommonRole, normalizePlayerStats } from "@/lib/storage";
import { ROLE_LABELS } from "@/lib/types";
import { Trash2 } from "lucide-react";

export function StatsView() {
  const { stats, clearStats, history, hydrated } = useDraftHistory();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
        Loading stats…
      </div>
    );
  }

  const playersWithStats = PLAYERS.map((player) => {
    const raw = stats[player.id];
    const s = raw ? normalizePlayerStats(raw, player.id) : null;
    return {
      player,
      stats: s,
      mostRole: s ? mostCommonRole(s.roleCounts) : null,
      mostTeammate: s ? mostCommonId(s.teammateCounts) : null,
      mostOpponent: s ? mostCommonId(s.opponentCounts) : null,
    };
  }).sort((a, b) => (b.stats?.totalGames ?? 0) - (a.stats?.totalGames ?? 0));

  const totalGames = history.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Analytics
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Stats
          </h1>
          <p className="mt-3 text-sm text-muted">
            Tracked across {totalGames} draft{totalGames === 1 ? "" : "s"} saved
            on this device.
          </p>
        </div>
        {Object.keys(stats).length > 0 && (
          <Button variant="destructive" size="sm" onClick={clearStats}>
            <Trash2 />
            Reset
          </Button>
        )}
      </div>

      {totalGames === 0 ? (
        <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface px-6 py-20 text-center">
          <p className="text-base font-medium text-muted">No stats yet</p>
          <p className="mt-2 text-sm text-muted/70">
            Play a few drafts and your analytics will show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {playersWithStats.map(
            ({ player, stats: s, mostRole, mostTeammate, mostOpponent }, i) => {
              if (!s || s.totalGames === 0) return null;
              const teammate = mostTeammate
                ? getPlayerById(mostTeammate)?.name
                : null;
              const opponent = mostOpponent
                ? getPlayerById(mostOpponent)?.name
                : null;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className="overflow-hidden rounded-[10px] border border-white/[0.07] bg-surface"
                >
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
                    <PlayerAvatar
                      name={player.name}
                      playerId={player.id}
                      size="lg"
                    />
                    <div>
                      <div className="text-sm font-medium tracking-tight">
                        {player.name}
                      </div>
                      <div className="text-xs text-muted">
                        {s.totalGames} game{s.totalGames === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
                    <StatCell
                      label="Blue"
                      value={String(s.blueAppearances)}
                      accent="text-blue-glow"
                    />
                    <StatCell
                      label="Red"
                      value={String(s.redAppearances)}
                      accent="text-red-glow"
                    />
                    <StatCell
                      label="Main Role"
                      value={mostRole ? ROLE_LABELS[mostRole] : "—"}
                    />
                    <StatCell
                      label="Autofills"
                      value={String(s.autofillCount)}
                    />
                    <StatCell label="Top Teammate" value={teammate ?? "—"} />
                    <StatCell label="Top Opponent" value={opponent ?? "—"} />
                  </div>

                  <div className="px-4 py-3.5">
                    <div className="mb-2 text-[11px] text-muted">
                      Role distribution
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      {(
                        [
                          ["top", "#a1a1aa"],
                          ["jungle", "#71717a"],
                          ["mid", "#d4d4d8"],
                          ["adc", "#52525b"],
                          ["support", "#3f3f46"],
                        ] as const
                      ).map(([role, color]) => {
                        const count = s.roleCounts[role] ?? 0;
                        const pct =
                          s.totalGames > 0 ? (count / s.totalGames) * 100 : 0;
                        if (!(pct > 0)) return null;
                        return (
                          <div
                            key={role}
                            style={{ width: `${pct}%`, background: color }}
                            title={`${ROLE_LABELS[role]}: ${count}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-background/80 px-3 py-2.5">
      <div className="text-[10px] text-muted">{label}</div>
      <div
        className={`mt-0.5 truncate text-sm font-medium tracking-tight ${accent ?? ""}`}
      >
        {value}
      </div>
    </div>
  );
}
