"use client";

import { motion } from "framer-motion";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { cn } from "@/lib/utils";

const SEGMENT_COLORS = [
  "rgba(255,255,255,0.06)",
  "rgba(255,255,255,0.11)",
  "rgba(59,130,246,0.18)",
  "rgba(255,255,255,0.08)",
  "rgba(239,68,68,0.16)",
];

/** Extra full turns on every spin so repeat spins keep momentum. */
const SPIN_TURNS = 6;

/**
 * Absolute wheel rotation that lands `winnerIndex` under the top pointer,
 * always spinning forward from `currentRotation` (never resets to 0).
 */
export function nextSpinRotation(
  currentRotation: number,
  winnerIndex: number,
  segmentCount: number
): number {
  const n = Math.max(segmentCount, 1);
  const slice = 360 / n;
  const centerAngle = winnerIndex * slice + slice / 2;
  const desiredMod = ((360 - centerAngle) % 360 + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const delta = (desiredMod - currentMod + 360) % 360;
  return currentRotation + 360 * SPIN_TURNS + delta;
}

export function WinnerSpinner({
  names,
  playerIds,
  spinning,
  rotation,
  onSpinEnd,
}: {
  names: string[];
  playerIds: string[];
  spinning: boolean;
  /** Absolute CSS degrees; must increase on each spin (do not wrap). */
  rotation: number;
  onSpinEnd?: () => void;
}) {
  const n = Math.max(names.length, 1);
  const slice = 360 / n;

  if (names.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[12px] border border-dashed border-white/[0.1] text-sm text-muted">
        Select the winning team to spin
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
        <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-foreground" />
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-full border border-white/[0.12] bg-surface shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]">
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: rotation }}
          transition={
            spinning
              ? { duration: 4.2, ease: [0.12, 0.8, 0.1, 1] }
              : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (spinning) onSpinEnd?.();
          }}
          style={{ background: conicGradient(n) }}
        >
          {names.map((name, i) => {
            const rot = i * slice + slice / 2;
            return (
              <div
                key={`${playerIds[i]}-${name}`}
                className="absolute inset-0 flex items-start justify-center"
                style={{ transform: `rotate(${rot}deg)` }}
              >
                <div className="mt-[12%] flex max-w-[42%] flex-col items-center gap-1 text-center">
                  <PlayerAvatar
                    name={name}
                    playerId={playerIds[i]}
                    size="sm"
                  />
                  <span className="truncate text-[10px] font-medium leading-tight tracking-tight text-foreground/90 sm:text-[11px]">
                    {name}
                  </span>
                </div>
              </div>
            );
          })}
        </motion.div>

        <div className="pointer-events-none absolute inset-[28%] rounded-full border border-white/[0.1] bg-background/90" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            Spin
          </span>
        </div>
      </div>
    </div>
  );
}

function conicGradient(n: number): string {
  const slice = 360 / n;
  const stops: string[] = [];
  for (let i = 0; i < n; i++) {
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    const start = i * slice;
    const end = (i + 1) * slice;
    stops.push(`${color} ${start}deg ${end}deg`);
  }
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

export function SpinResultBanner({
  name,
  playerId,
  visible,
}: {
  name: string;
  playerId: string;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mt-6 flex items-center justify-center gap-3 rounded-[10px] border border-white/15 bg-surface-raised px-4 py-3"
      )}
    >
      <PlayerAvatar name={name} playerId={playerId} size="md" />
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
          Winner · +1 point
        </div>
        <div className="text-base font-medium tracking-tight">{name}</div>
      </div>
    </motion.div>
  );
}
