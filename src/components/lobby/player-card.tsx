"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { getBestTierSummary } from "@/lib/ratings";
import { ROLE_LABELS, type Player, type RatingsOverride } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  selected: boolean;
  onToggle: () => void;
  overrides?: RatingsOverride;
  disabled?: boolean;
}

export function PlayerCard({
  player,
  selected,
  onToggle,
  overrides,
  disabled,
}: PlayerCardProps) {
  const best = getBestTierSummary(player, overrides);
  const hasRoles =
    player.primaryRoles.length > 0 || player.secondaryRoles.length > 0;
  const primaries = player.primaryRoles
    .map((r) => ROLE_LABELS[r])
    .join(" · ");

  return (
    <motion.button
      type="button"
      layout
      whileHover={disabled && !selected ? undefined : { y: -2 }}
      whileTap={disabled && !selected ? undefined : { scale: 0.985 }}
      animate={{
        scale: selected ? 1.02 : 1,
        opacity: selected ? 1 : disabled ? 0.4 : 0.85,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onToggle}
      disabled={disabled && !selected}
      className={cn(
        "group relative flex w-full flex-col items-start gap-4 overflow-hidden rounded-[10px] border p-5 text-left transition-colors",
        selected
          ? "border-white/20 bg-surface-raised"
          : "border-white/[0.07] bg-surface hover:border-white/[0.12] hover:bg-surface-raised/80",
        disabled && !selected && "cursor-not-allowed"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
        >
          <Check className="h-3 w-3" strokeWidth={2.5} />
        </motion.div>
      )}

      <div className="relative flex w-full items-center gap-3.5">
        <PlayerAvatar
          name={player.name}
          playerId={player.id}
          selected={selected}
          size="lg"
        />
        <div className="min-w-0 flex-1 pr-6">
          <div className="truncate text-[15px] font-medium tracking-tight text-foreground">
            {player.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {hasRoles ? primaries || "Flex" : "Roles not decided"}
          </div>
        </div>
        {best ? (
          <TierBadge tier={best.tier} size="md" />
        ) : (
          <span className="rounded-md border border-white/[0.07] px-2 py-1 text-[10px] text-muted">
            Tier TBD
          </span>
        )}
      </div>

      <div className="relative flex flex-wrap gap-1.5">
        {!hasRoles && (
          <span className="rounded-md border border-white/[0.07] px-2 py-1 text-[11px] text-muted">
            Not decided
          </span>
        )}
        {player.primaryRoles.map((role) => {
          const tier = overrides?.[player.id]?.[role] ?? player.ratings[role];
          return (
            <span
              key={role}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[11px] text-foreground/80"
            >
              {ROLE_LABELS[role]}
              {tier && (
                <span className="font-medium text-foreground/50">{tier}</span>
              )}
            </span>
          );
        })}
        {player.secondaryRoles.map((role) => {
          const tier = overrides?.[player.id]?.[role] ?? player.ratings[role];
          return (
            <span
              key={role}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted"
            >
              {ROLE_LABELS[role]}
              {tier && <span className="text-muted/70">{tier}</span>}
            </span>
          );
        })}
      </div>
    </motion.button>
  );
}
