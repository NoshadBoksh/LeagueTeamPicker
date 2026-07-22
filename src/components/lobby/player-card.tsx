"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { getPlayerRolePrefs } from "@/lib/role-prefs";
import { getBestTierSummary } from "@/lib/ratings";
import {
  ROLE_LABELS,
  type Player,
  type RatingsOverride,
  type RolePrefsOverride,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  selected: boolean;
  onToggle: () => void;
  overrides?: RatingsOverride;
  rolePrefs?: RolePrefsOverride;
  disabled?: boolean;
}

export function PlayerCard({
  player,
  selected,
  onToggle,
  overrides,
  rolePrefs,
  disabled,
}: PlayerCardProps) {
  const best = getBestTierSummary(player, overrides);
  const prefs = getPlayerRolePrefs(rolePrefs ?? {}, player.id);
  const hasRoles = prefs.fill || prefs.roles.length > 0;
  const label = prefs.fill
    ? "FILL"
    : prefs.roles.map((r) => ROLE_LABELS[r]).join(" · ") || "No roles";

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
          <div className="mt-0.5 truncate text-xs text-muted">{label}</div>
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
            Set roles on Roles page
          </span>
        )}
        {prefs.fill && (
          <span className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-foreground/80">
            FILL
          </span>
        )}
        {!prefs.fill &&
          prefs.roles.map((role) => {
            const tier =
              overrides?.[player.id]?.[role] ?? player.ratings[role];
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
      </div>
    </motion.button>
  );
}
