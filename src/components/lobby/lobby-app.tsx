"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Swords } from "lucide-react";
import { DraftReveal } from "@/components/draft/draft-reveal";
import { ModeSelect } from "@/components/lobby/mode-select";
import { PlayerCard } from "@/components/lobby/player-card";
import { Button } from "@/components/ui/button";
import { PLAYERS, getPlayersByIds } from "@/data/players";
import { useDraftHistory } from "@/hooks/use-draft-history";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useRatings } from "@/hooks/use-ratings";
import { useRolePrefs } from "@/hooks/use-role-prefs";
import { generateDraft } from "@/lib/draft";
import type { DraftMode, DraftResult } from "@/lib/types";

export function LobbyApp() {
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<DraftMode>("competitive");
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [view, setView] = useState<"lobby" | "draft">("lobby");
  const [generating, setGenerating] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const { overrides } = useRatings();
  const { prefs: rolePrefs } = useRolePrefs();
  const { addDraft } = useDraftHistory();

  const canGenerate = selected.length === 10;

  const togglePlayer = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 10) return prev;
      return [...prev, id];
    });
  };

  const runDraft = useCallback(() => {
    if (selected.length !== 10) return;
    setGenerating(true);
    setDraftError(null);

    requestAnimationFrame(() => {
      try {
        const players = getPlayersByIds(selected);
        const result = generateDraft(mode, players, overrides, rolePrefs);
        setDraft(result);
        addDraft(result);
        setView("draft");
      } catch (err) {
        setDraftError(
          err instanceof Error
            ? err.message
            : "Could not generate teams with current role assignments."
        );
      } finally {
        setGenerating(false);
      }
    });
  }, [selected, mode, overrides, rolePrefs, addDraft]);

  const reroll = useCallback(() => {
    if (selected.length !== 10) return;
    setGenerating(true);
    setDraftError(null);
    try {
      const players = getPlayersByIds(selected);
      const result = generateDraft(mode, players, overrides, rolePrefs);
      setDraft(result);
      addDraft(result);
    } catch (err) {
      setDraftError(
        err instanceof Error
          ? err.message
          : "Could not generate teams with current role assignments."
      );
    } finally {
      setGenerating(false);
    }
  }, [selected, mode, overrides, rolePrefs, addDraft]);

  useKeyboardShortcuts({
    onEnter: () => {
      if (view === "lobby" && canGenerate) runDraft();
    },
    onSpace: () => {
      if (view === "draft" && draft) reroll();
    },
    enabled: true,
  });

  const sortedPlayers = useMemo(
    () =>
      [...PLAYERS].sort((a, b) => {
        const aSel = selected.includes(a.id) ? 0 : 1;
        const bSel = selected.includes(b.id) ? 0 : 1;
        if (aSel !== bSel) return aSel - bSel;
        return a.name.localeCompare(b.name);
      }),
    [selected]
  );

  if (view === "draft" && draft) {
    return (
      <DraftReveal
        draft={draft}
        onReroll={reroll}
        onBack={() => setView("lobby")}
        isRerolling={generating}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
              Tonight&apos;s Lobby
            </p>
            <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Customs Draft
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Select exactly ten players, choose a draft mode, then watch the
              reveal lock in tonight&apos;s teams.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="rounded-[10px] border border-white/[0.07] bg-surface px-5 py-3.5">
              <div className="text-[11px] text-muted">Players selected</div>
              <div className="mt-0.5 text-2xl font-medium tracking-tight tabular-nums">
                <span
                  className={
                    selected.length === 10 ? "text-foreground" : "text-muted"
                  }
                >
                  {selected.length}
                </span>
                <span className="text-muted"> / 10</span>
              </div>
            </div>

            <Button
              size="lg"
              disabled={!canGenerate || generating}
              onClick={runDraft}
              className="min-w-[160px]"
            >
              <Swords />
              Generate
              <kbd className="ml-1 hidden rounded border border-background/20 bg-background/10 px-1.5 py-0.5 text-[10px] font-normal sm:inline">
                Enter
              </kbd>
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-12"
      >
        <ModeSelect mode={mode} onChange={setMode} />
      </motion.section>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Roster</h2>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            Clear selection
          </button>
        )}
      </div>

      {draftError && (
        <div className="mb-5 rounded-[10px] border border-red-glow/30 bg-red-soft px-4 py-3 text-sm text-red-glow">
          {draftError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player) => {
            const isSelected = selected.includes(player.id);
            return (
              <PlayerCard
                key={player.id}
                player={player}
                selected={isSelected}
                onToggle={() => togglePlayer(player.id)}
                overrides={overrides}
                rolePrefs={rolePrefs}
                disabled={!isSelected && selected.length >= 10}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
