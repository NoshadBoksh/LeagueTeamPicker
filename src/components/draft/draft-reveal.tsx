"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  RefreshCw,
} from "lucide-react";
import { TeamPanel } from "@/components/draft/team-panel";
import { Button } from "@/components/ui/button";
import {
  createDefaultDraftSfx,
  playDraftSfx,
  registerDraftSfx,
} from "@/lib/audio";
import { copyToClipboard, formatDraftForDiscord } from "@/lib/discord";
import type { DraftResult } from "@/lib/types";
import { MODE_LABELS } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";

type RevealPhase = "intro" | "panels" | "revealing" | "complete";

interface DraftRevealProps {
  draft: DraftResult;
  onReroll: () => void;
  onBack: () => void;
  isRerolling?: boolean;
}

export function DraftReveal({
  draft,
  onReroll,
  onBack,
  isRerolling,
}: DraftRevealProps) {
  const [phase, setPhase] = useState<RevealPhase>("intro");
  const [revealedCount, setRevealedCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    registerDraftSfx(createDefaultDraftSfx());
    return () => registerDraftSfx(null);
  }, []);

  useEffect(() => {
    setPhase("intro");
    setRevealedCount(0);
    setCopied(false);
    playDraftSfx("draft-start");

    const t1 = setTimeout(() => setPhase("panels"), 900);
    const t2 = setTimeout(() => setPhase("revealing"), 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [draft.id]);

  useEffect(() => {
    if (phase !== "revealing") return;

    if (revealedCount >= 5) {
      const t = setTimeout(() => {
        setPhase("complete");
        playDraftSfx("draft-complete");
      }, 500);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setRevealedCount((c) => c + 1);
      playDraftSfx("role-reveal");
    }, 520);

    return () => clearTimeout(t);
  }, [phase, revealedCount]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(formatDraftForDiscord(draft));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const showStats = phase === "complete";

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Subtle team atmosphere — restrained, not neon */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-background" />
        <motion.div
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute left-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_left,rgba(59,130,246,0.08),transparent_55%)]"
        />
        <motion.div
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1.2 }}
          className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(239,68,68,0.08),transparent_55%)]"
        />
        <div className="absolute left-1/2 top-[12%] h-[76%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
              className="flex min-h-[55vh] flex-col items-center justify-center text-center"
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-8 h-px w-16 bg-foreground/40"
              />
              <h1 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                Draft
              </h1>
              <p className="mt-4 text-sm text-muted">
                {MODE_LABELS[draft.mode]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {phase !== "intro" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                Live Reveal
              </p>
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                {draft.mode === "competitive"
                  ? "Fair Game"
                  : draft.mode === "role-consider"
                    ? "Role Consider"
                    : "Normal Draft"}
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
              <TeamPanel
                draft={draft}
                side="blue"
                revealedCount={revealedCount}
                showStats={showStats}
              />
              <TeamPanel
                draft={draft}
                side="red"
                revealedCount={revealedCount}
                showStats={showStats}
              />
            </div>

            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="mt-10 space-y-8"
                >
                  {draft.mode !== "normal" && <DraftStats draft={draft} />}

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <Button variant="secondary" onClick={onBack}>
                      <ArrowLeft />
                      Lobby
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        playDraftSfx("reroll");
                        onReroll();
                      }}
                      disabled={isRerolling}
                    >
                      <RefreshCw className={cn(isRerolling && "animate-spin")} />
                      Reroll
                      <kbd className="ml-1 hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted sm:inline">
                        Space
                      </kbd>
                    </Button>
                    <Button onClick={handleCopy}>
                      {copied ? <Check /> : <Copy />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DraftStats({ draft }: { draft: DraftResult }) {
  const isRoleConsider = draft.mode === "role-consider";

  return (
    <div className="mx-auto grid max-w-2xl gap-px overflow-hidden rounded-[10px] border border-white/[0.07] bg-white/[0.04] sm:grid-cols-3">
      <Stat
        label="Blue MMR"
        value={String(draft.blue.mmr)}
        accent="text-blue-glow"
      />
      <Stat
        label="Red MMR"
        value={String(draft.red.mmr)}
        accent="text-red-glow"
      />
      {isRoleConsider ? (
        <Stat
          label="Favorite"
          value={draft.favorite === "blue" ? "Blue" : "Red"}
        />
      ) : (
        <Stat
          label="Balance"
          value={formatPercent(draft.balanceScore)}
        />
      )}

      {isRoleConsider ? (
        <>
          <Stat
            label="Underdog"
            value={draft.underdog === "blue" ? "Blue" : "Red"}
          />
          <Stat label="Blue Win %" value={formatPercent(draft.blueWinChance)} />
          <Stat label="Red Win %" value={formatPercent(draft.redWinChance)} />
        </>
      ) : (
        <>
          <Stat label="Difference" value={String(draft.mmrDifference)} />
          <Stat
            label="Favorite"
            value={draft.favorite === "blue" ? "Blue" : "Red"}
          />
          <Stat
            label="Win Odds"
            value={`${draft.blueWinChance}–${draft.redWinChance}`}
          />
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-surface px-4 py-4 text-center">
      <div className="text-[11px] text-muted">{label}</div>
      <div
        className={cn(
          "mt-1 text-base font-medium tracking-tight tabular-nums",
          accent ?? "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}
