"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Gift,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";
import {
  nextSpinRotation,
  SpinResultBanner,
  WinnerSpinner,
} from "@/components/prizes/winner-spinner";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { PLAYERS } from "@/data/players";
import { useDraftHistory } from "@/hooks/use-draft-history";
import { usePrizePoints } from "@/hooks/use-prize-points";
import {
  copyToClipboard,
  formatNightSummary,
} from "@/lib/discord";
import {
  getSeriesSpinDraft,
  getWinningPlayers,
  isSeriesComplete,
  seriesScoreLabel,
} from "@/lib/series";
import { MODE_LABELS, type AssignedPlayer } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PrizesView({
  initialDraftId,
  initialSeriesId,
}: {
  initialDraftId?: string | null;
  initialSeriesId?: string | null;
}) {
  const { history, series, hydrated: historyHydrated } = useDraftHistory();
  const {
    points,
    log,
    awardSpin,
    cashIn,
    setPlayerPoints,
    undoLastSpin,
    resetAll,
    lastSpin,
    hydrated: prizesHydrated,
    prizeCost,
  } = usePrizePoints();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sourceDraftId, setSourceDraftId] = useState<string | null>(
    initialDraftId ?? null
  );
  const [sourceSeriesId, setSourceSeriesId] = useState<string | null>(
    initialSeriesId ?? null
  );
  const [spinning, setSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  /** Absolute wheel degrees — accumulates so each spin keeps full momentum. */
  const [wheelRotation, setWheelRotation] = useState(0);
  const [revealedWinner, setRevealedWinner] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [cashMessage, setCashMessage] = useState<string | null>(null);
  const [nightCopied, setNightCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const draftsWithResults = useMemo(
    () => history.filter((d) => Boolean(d.result)),
    [history]
  );

  const completedSeries = useMemo(
    () => series.filter((s) => isSeriesComplete(s, history)),
    [series, history]
  );

  // Prefill from series clincher or draft
  useEffect(() => {
    if (!historyHydrated) return;

    if (sourceSeriesId) {
      const s = series.find((x) => x.id === sourceSeriesId);
      if (!s) return;
      const clincher = getSeriesSpinDraft(s, history);
      if (clincher?.result) {
        setSourceDraftId(clincher.id);
        setSelectedIds(getWinningPlayers(clincher).map((p) => p.playerId));
      }
      return;
    }

    if (!sourceDraftId) return;
    const draft = history.find((d) => d.id === sourceDraftId);
    if (!draft?.result) return;
    setSelectedIds(getWinningPlayers(draft).map((p) => p.playerId));
  }, [historyHydrated, history, series, sourceDraftId, sourceSeriesId]);

  useEffect(() => {
    if (initialDraftId) setSourceDraftId(initialDraftId);
    if (initialSeriesId) setSourceSeriesId(initialSeriesId);
  }, [initialDraftId, initialSeriesId]);

  const selectedPlayers = useMemo(() => {
    return selectedIds
      .map((id) => PLAYERS.find((p) => p.id === id))
      .filter((p): p is (typeof PLAYERS)[number] => Boolean(p));
  }, [selectedIds]);

  const standings = useMemo(() => {
    return [...PLAYERS]
      .map((p) => ({
        player: p,
        pts: points[p.id] ?? 0,
      }))
      .sort((a, b) => b.pts - a.pts || a.player.name.localeCompare(b.player.name));
  }, [points]);

  const togglePlayer = (id: string) => {
    if (spinning) return;
    setSourceDraftId(null);
    setSourceSeriesId(null);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
    setWinnerIndex(null);
    setRevealedWinner(null);
  };

  const loadDraftWinners = (draftId: string) => {
    if (spinning) return;
    setSourceSeriesId(null);
    setSourceDraftId(draftId);
    setWinnerIndex(null);
    setRevealedWinner(null);
  };

  const loadSeriesWinners = (seriesId: string) => {
    if (spinning) return;
    setSourceSeriesId(seriesId);
    setWinnerIndex(null);
    setRevealedWinner(null);
  };

  const canSpin = selectedPlayers.length >= 2 && !spinning;

  const startSpin = () => {
    if (!canSpin) return;
    const index = Math.floor(Math.random() * selectedPlayers.length);
    setRevealedWinner(null);
    setWinnerIndex(index);
    setWheelRotation((prev) =>
      nextSpinRotation(prev, index, selectedPlayers.length)
    );
    setSpinning(true);
  };

  const finishSpin = () => {
    if (winnerIndex === null) return;
    const winner = selectedPlayers[winnerIndex];
    if (!winner) return;
    awardSpin({
      playerId: winner.id,
      playerName: winner.name,
      draftId: sourceDraftId ?? undefined,
      seriesId: sourceSeriesId ?? undefined,
      teamNames: selectedPlayers.map((p) => p.name),
    });
    setRevealedWinner({ id: winner.id, name: winner.name });
    setSpinning(false);
  };

  const handleCashIn = (playerId: string, playerName: string) => {
    const entry = cashIn(playerId, playerName);
    if (!entry) return;
    setCashMessage(`${playerName} cashed in for a Mystery Prize!`);
    setTimeout(() => setCashMessage(null), 3500);
  };

  const handleCopyNight = async () => {
    const ok = await copyToClipboard(
      formatNightSummary({ history, series, prizeLog: log })
    );
    if (ok) {
      setNightCopied(true);
      setTimeout(() => setNightCopied(false), 2000);
    }
  };

  if (!historyHydrated || !prizesHydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
        Loading prizes…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            After Best of 3
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Prize Spinner
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Spin the winning team once the Bo3 is done — one name gets{" "}
            <span className="text-foreground/80">+1 point</span>. Save up{" "}
            {prizeCost} to cash in for a mystery prize.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyNight}>
            {nightCopied ? <Check /> : <Copy />}
            {nightCopied ? "Night copied" : "Copy night summary"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!lastSpin}
            onClick={undoLastSpin}
          >
            <Undo2 />
            Undo last spin
          </Button>
          <Button variant="secondary" size="sm" onClick={resetAll}>
            <RotateCcw />
            Reset points
          </Button>
        </div>
      </div>

      {cashMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2 rounded-[10px] border border-white/15 bg-surface-raised px-4 py-3 text-sm"
        >
          <Gift className="h-4 w-4" />
          {cashMessage}
        </motion.div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-[12px] border border-white/[0.07] bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium tracking-tight">
                  Winning team spinner
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Load a finished Bo3 or match result, then spin once.
                </p>
              </div>
              <Button
                onClick={startSpin}
                disabled={!canSpin}
                className="shrink-0"
              >
                <Sparkles />
                {spinning ? "Spinning…" : "Spin"}
              </Button>
            </div>

            <WinnerSpinner
              names={selectedPlayers.map((p) => p.name)}
              playerIds={selectedPlayers.map((p) => p.id)}
              spinning={spinning}
              rotation={wheelRotation}
              onSpinEnd={finishSpin}
            />

            {revealedWinner && (
              <SpinResultBanner
                name={revealedWinner.name}
                playerId={revealedWinner.id}
                visible
              />
            )}
          </div>

          {completedSeries.length > 0 && (
            <div className="rounded-[12px] border border-white/[0.07] bg-surface p-5">
              <h3 className="mb-3 text-sm font-medium">Load from Bo3 series</h3>
              <div className="space-y-2">
                {completedSeries.slice(0, 6).map((s) => {
                  const clincher = getSeriesSpinDraft(s, history);
                  const winners = clincher ? getWinningPlayers(clincher) : [];
                  const active = sourceSeriesId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={spinning || winners.length === 0}
                      onClick={() => loadSeriesWinners(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-colors",
                        active
                          ? "border-white/20 bg-surface-raised"
                          : "border-white/[0.07] bg-background/40 hover:border-white/[0.12]"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {s.label} · {seriesScoreLabel(s, history)}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          {s.spunPlayerName
                            ? `Already spun: ${s.spunPlayerName}`
                            : winners.map((p) => p.name).join(", ")}
                        </div>
                      </div>
                      {winners.length > 0 && (
                        <WinnerAvatars players={winners} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {draftsWithResults.length > 0 && (
            <div className="rounded-[12px] border border-white/[0.07] bg-surface p-5">
              <h3 className="mb-3 text-sm font-medium">Load from match result</h3>
              <div className="space-y-2">
                {draftsWithResults.slice(0, 8).map((draft) => {
                  const winners = getWinningPlayers(draft);
                  const active =
                    sourceDraftId === draft.id && !sourceSeriesId;
                  return (
                    <button
                      key={draft.id}
                      type="button"
                      disabled={spinning}
                      onClick={() => loadDraftWinners(draft.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3 text-left transition-colors",
                        active
                          ? "border-white/20 bg-surface-raised"
                          : "border-white/[0.07] bg-background/40 hover:border-white/[0.12]"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {MODE_LABELS[draft.mode]} ·{" "}
                          {draft.result!.winner === "blue" ? "Blue" : "Red"}{" "}
                          won
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          {new Date(draft.timestamp).toLocaleString()} ·{" "}
                          {winners.map((p) => p.name).join(", ")}
                        </div>
                      </div>
                      <WinnerAvatars players={winners} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-[12px] border border-white/[0.07] bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Manual winning team</h3>
              <span className="text-xs text-muted">
                {selectedIds.length} / 5
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLAYERS.map((player) => {
                const selected = selectedIds.includes(player.id);
                const full = selectedIds.length >= 5 && !selected;
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={spinning || full}
                    onClick={() => togglePlayer(player.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-[8px] border px-2.5 py-2 text-left transition-colors",
                      selected
                        ? "border-white/20 bg-surface-raised"
                        : "border-white/[0.07] bg-background/40 hover:border-white/[0.12]",
                      full && "opacity-40"
                    )}
                  >
                    <PlayerAvatar
                      name={player.name}
                      playerId={player.id}
                      size="sm"
                    />
                    <span className="truncate text-xs font-medium">
                      {player.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[12px] border border-white/[0.07] bg-surface p-5">
            <h2 className="mb-4 text-sm font-medium tracking-tight">
              Points standings
            </h2>
            <div className="space-y-1.5">
              {standings.map(({ player, pts }, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-[8px] border border-white/[0.05] bg-background/40 px-3 py-2.5"
                >
                  <span className="w-5 text-center text-xs tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <PlayerAvatar
                    name={player.name}
                    playerId={player.id}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {player.name}
                    </div>
                    {editingId === player.id ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-16 rounded border border-white/15 bg-surface px-2 py-1 text-xs outline-none"
                        />
                        <button
                          type="button"
                          className="text-[11px] text-foreground underline"
                          onClick={() => {
                            const n = Number(editValue);
                            if (Number.isFinite(n)) {
                              setPlayerPoints(player.id, player.name, n);
                            }
                            setEditingId(null);
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-muted underline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-[11px] text-muted underline-offset-2 hover:text-foreground hover:underline"
                        onClick={() => {
                          setEditingId(player.id);
                          setEditValue(String(pts));
                        }}
                      >
                        {pts} point{pts === 1 ? "" : "s"}
                        {pts >= prizeCost ? " · ready · tap to edit" : " · tap to edit"}
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-base font-medium tabular-nums">
                      {pts}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1"
                      disabled={pts < prizeCost}
                      onClick={() => handleCashIn(player.id, player.name)}
                    >
                      <Gift />
                      Cash in
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] border border-white/[0.07] bg-surface p-5">
            <h2 className="mb-4 text-sm font-medium tracking-tight">
              Activity
            </h2>
            {log.length === 0 ? (
              <p className="text-sm text-muted">
                No spins or cash-ins yet. Finish a Bo3 and spin the winners.
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {log.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[8px] border border-white/[0.05] bg-background/40 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        {entry.kind === "spin"
                          ? `${entry.playerName} +1`
                          : entry.kind === "cashin"
                            ? `${entry.playerName} cashed in`
                            : entry.kind === "undo"
                              ? `Undo ${entry.playerName}`
                              : `${entry.playerName} adjusted`}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          entry.delta > 0 ? "text-foreground" : "text-muted"
                        )}
                      >
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta} ·{" "}
                        {entry.pointsAfter} pts
                      </div>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {new Date(entry.at).toLocaleString()}
                      {entry.kind === "cashin" && entry.prizeLabel
                        ? ` · ${entry.prizeLabel}`
                        : ""}
                      {entry.kind === "spin" && entry.teamNames
                        ? ` · spun from ${entry.teamNames.join(", ")}`
                        : ""}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function WinnerAvatars({ players }: { players: AssignedPlayer[] }) {
  return (
    <div className="flex -space-x-1.5">
      {players.slice(0, 5).map((p) => (
        <div
          key={p.playerId}
          className="rounded-[6px] ring-2 ring-surface"
        >
          <PlayerAvatar name={p.name} playerId={p.playerId} size="sm" />
        </div>
      ))}
    </div>
  );
}
