"use client";

import { motion } from "framer-motion";
import { Dices, Shuffle, Scale } from "lucide-react";
import type { DraftMode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ModeSelectProps {
  mode: DraftMode;
  onChange: (mode: DraftMode) => void;
}

export function ModeSelect({ mode, onChange }: ModeSelectProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <ModeCard
        active={mode === "competitive"}
        onClick={() => onChange("competitive")}
        icon={<Scale className="h-4 w-4" />}
        title="Competitive"
        description="Fairest possible game. Role-aware balancing with minimal MMR gap."
      />
      <ModeCard
        active={mode === "role-consider"}
        onClick={() => onChange("role-consider")}
        icon={<Dices className="h-4 w-4" />}
        title="Role Consider"
        description="Random teams, but still tries to put people on roles they play."
      />
      <ModeCard
        active={mode === "normal"}
        onClick={() => onChange("normal")}
        icon={<Shuffle className="h-4 w-4" />}
        title="Normal"
        description="Anyone anywhere. No roles, MMR, or tier fairness considered."
      />
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "relative rounded-[10px] border p-5 text-left transition-colors",
        active
          ? "border-white/20 bg-surface-raised"
          : "border-white/[0.07] bg-surface hover:border-white/[0.12]"
      )}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            active
              ? "border-white/15 bg-white/[0.06] text-foreground"
              : "border-white/[0.07] bg-transparent text-muted"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium tracking-tight">{title}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {description}
          </p>
        </div>
      </div>
      {active && (
        <motion.div
          layoutId="mode-indicator"
          className="absolute inset-x-5 bottom-0 h-px bg-foreground/40"
        />
      )}
    </motion.button>
  );
}
