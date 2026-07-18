import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/types";

const TIER_STYLES: Record<Tier, string> = {
  S: "bg-white/[0.08] text-foreground border-white/15",
  A: "bg-white/[0.06] text-foreground/90 border-white/12",
  B: "bg-white/[0.04] text-muted border-white/10",
  C: "bg-transparent text-muted border-white/[0.08]",
  D: "bg-transparent text-muted/80 border-white/[0.06]",
  F: "bg-transparent text-muted/60 border-white/[0.05]",
};

export function TierBadge({
  tier,
  className,
  size = "md",
}: {
  tier: Tier;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-medium tabular-nums",
        size === "sm" && "h-5 min-w-5 px-1 text-[10px]",
        size === "md" && "h-6 min-w-6 px-1.5 text-xs",
        size === "lg" && "h-7 min-w-7 px-2 text-xs",
        TIER_STYLES[tier],
        className
      )}
    >
      {tier}
    </span>
  );
}
