"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import {
  ROLE_LABELS,
  type AssignedPlayer,
  type DraftResult,
  type TeamSide,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_ORDER = ["top", "jungle", "mid", "adc", "support"] as const;

interface TeamPanelProps {
  draft: DraftResult;
  side: TeamSide;
  revealedCount: number;
  showStats: boolean;
}

export function TeamPanel({
  draft,
  side,
  revealedCount,
  showStats,
}: TeamPanelProps) {
  const team = side === "blue" ? draft.blue : draft.red;
  const isBlue = side === "blue";
  const plain = draft.mode === "normal";

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[12px] border bg-surface",
        isBlue ? "border-blue-glow/25" : "border-red-glow/25"
      )}
    >
      <div className="relative border-b border-white/[0.06] px-6 py-5">
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-[3px]",
            isBlue ? "bg-blue-glow" : "bg-red-glow"
          )}
        />
        <div
          className={cn(
            "text-xs font-medium uppercase tracking-[0.18em]",
            isBlue ? "text-blue-glow" : "text-red-glow"
          )}
        >
          {isBlue ? "Blue Team" : "Red Team"}
        </div>
        <AnimatePresence>
          {showStats && !plain && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-baseline gap-2"
            >
              <span className="text-2xl font-medium tracking-tight tabular-nums text-foreground">
                {team.mmr}
              </span>
              <span className="text-xs text-muted">MMR</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {ROLE_ORDER.map((role, index) => {
          const player = team.players.find((p) => p.role === role)!;
          const revealed = index < revealedCount;
          return (
            <RoleSlot
              key={role}
              player={player}
              revealed={revealed}
              side={side}
              delay={index * 0.05}
              plain={plain}
            />
          );
        })}
      </div>
    </div>
  );
}

function RoleSlot({
  player,
  revealed,
  side,
  delay,
  plain,
}: {
  player: AssignedPlayer;
  revealed: boolean;
  side: TeamSide;
  delay: number;
  plain: boolean;
}) {
  const isBlue = side === "blue";

  return (
    <div className="relative min-h-[68px] overflow-hidden rounded-[8px] border border-white/[0.05] bg-background/50">
      <div className="absolute left-3.5 top-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
        {ROLE_LABELS[player.role]}
      </div>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="flex h-[68px] items-center justify-center"
          >
            <div className="h-px w-12 bg-white/10" />
          </motion.div>
        ) : (
          <motion.div
            key={player.playerId}
            initial={{ x: isBlue ? -80 : 80, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
              delay,
            }}
            className="flex h-[68px] items-center gap-3 px-3.5 pt-3"
          >
            <PlayerAvatar
              name={player.name}
              playerId={player.playerId}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium tracking-tight">
                  {player.name}
                </span>
                {!plain && <TierBadge tier={player.tier} size="sm" />}
              </div>
              {!plain && player.autofilled && (
                <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                  <AlertTriangle className="h-3 w-3" />
                  Autofilled
                </div>
              )}
            </div>
            {!plain && (
              <div className="text-right">
                <div className="text-sm font-medium tabular-nums text-foreground/90">
                  {player.mmr}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted">
                  MMR
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
