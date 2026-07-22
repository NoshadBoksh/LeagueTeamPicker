"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Eye,
  ImagePlus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { useDraftHistory } from "@/hooks/use-draft-history";
import { useRatings } from "@/hooks/use-ratings";
import { useRolePrefs } from "@/hooks/use-role-prefs";
import { copyToClipboard, formatDraftForDiscord } from "@/lib/discord";
import { generateDraft } from "@/lib/draft";
import { compressImageFile } from "@/lib/image";
import { getPlayersByIds } from "@/data/players";
import {
  ROLE_LABELS,
  MODE_LABELS,
  type DraftResult,
  type GameResult,
  type TeamSide,
} from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";

export function HistoryView() {
  const { history, addDraft, updateDraftResult, clearHistory, hydrated } =
    useDraftHistory();
  const { overrides } = useRatings();
  const { prefs: rolePrefs } = useRolePrefs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selected =
    history.find((d) => d.id === selectedId) ?? history[0] ?? null;

  useEffect(() => {
    if (!selectedId && history.length > 0) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
        Loading history…
      </div>
    );
  }

  const handleCopy = async (draft: DraftResult) => {
    const ok = await copyToClipboard(formatDraftForDiscord(draft));
    if (ok) {
      setCopiedId(draft.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleRegenerate = (draft: DraftResult) => {
    const players = getPlayersByIds(draft.playerIds);
    if (players.length !== 10) return;
    try {
      const next = generateDraft(draft.mode, players, overrides, rolePrefs);
      addDraft(next);
      setSelectedId(next.id);
    } catch {
      // Role constraints may block a regenerate; leave history unchanged
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Past Sessions
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            History
          </h1>
          <p className="mt-3 text-sm text-muted">
            Drafts save locally. Add the winner, kills, and a leaderboard
            screenshot after each game.
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="destructive" size="sm" onClick={clearHistory}>
            <Trash2 />
            Clear
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface px-6 py-20 text-center">
          <p className="text-base font-medium text-muted">No drafts yet</p>
          <p className="mt-2 text-sm text-muted/70">
            Generate teams from the lobby to start building history.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-2">
            {history.map((draft, i) => (
              <motion.button
                key={draft.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => setSelectedId(draft.id)}
                className={cn(
                  "w-full rounded-[10px] border p-4 text-left transition-colors",
                  selected?.id === draft.id
                    ? "border-white/20 bg-surface-raised"
                    : "border-white/[0.07] bg-surface hover:border-white/[0.12]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium tracking-tight">
                      {MODE_LABELS[draft.mode]}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {new Date(draft.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    {draft.result ? (
                      <>
                        <div
                          className={
                            draft.result.winner === "blue"
                              ? "text-blue-glow"
                              : "text-red-glow"
                          }
                        >
                          {draft.result.winner === "blue" ? "Blue" : "Red"} won
                        </div>
                        <div className="text-muted">
                          {draft.result.blueScore} – {draft.result.redScore}
                        </div>
                      </>
                    ) : (
                      <div className="text-muted">No result</div>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="rounded-[10px] border border-white/[0.07] bg-surface p-6 lg:sticky lg:top-20 lg:self-start">
            {selected ? (
              <HistoryDetail
                draft={selected}
                copied={copiedId === selected.id}
                onCopy={() => handleCopy(selected)}
                onRegenerate={() => handleRegenerate(selected)}
                onSaveResult={(result) =>
                  updateDraftResult(selected.id, result)
                }
                onClearResult={() => updateDraftResult(selected.id, undefined)}
              />
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center text-muted">
                <Eye className="mb-3 h-6 w-6 opacity-40" />
                <p className="text-sm">Select a draft to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryDetail({
  draft,
  copied,
  onCopy,
  onRegenerate,
  onSaveResult,
  onClearResult,
}: {
  draft: DraftResult;
  copied: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  onSaveResult: (result: GameResult) => void;
  onClearResult: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-medium tracking-tight">
            {MODE_LABELS[draft.mode]}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {new Date(draft.timestamp).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onRegenerate}>
            <RefreshCw />
            Regenerate
          </Button>
          <Button size="sm" onClick={onCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <GameResultForm
        key={draft.id}
        draft={draft}
        onSave={onSaveResult}
        onClear={onClearResult}
      />

      {draft.mode !== "normal" && (
        <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
          <MiniStat
            label="Blue Role"
            value={String(draft.blue.mmr)}
            className="text-blue-glow"
          />
          <MiniStat
            label="Red Role"
            value={String(draft.red.mmr)}
            className="text-red-glow"
          />
          <MiniStat
            label="Blue General"
            value={String(draft.blue.generalMmr ?? 0)}
            className="text-blue-glow"
          />
          <MiniStat
            label="Red General"
            value={String(draft.red.generalMmr ?? 0)}
            className="text-red-glow"
          />
          <MiniStat
            label="Role Favorite"
            value={draft.favorite === "blue" ? "Blue" : "Red"}
          />
          <MiniStat
            label="Gen Favorite"
            value={
              (draft.generalFavorite ?? draft.favorite) === "blue"
                ? "Blue"
                : "Red"
            }
          />
          <MiniStat
            label="Role Balance"
            value={formatPercent(draft.balanceScore)}
          />
          <MiniStat
            label="Gen Balance"
            value={formatPercent(
              draft.generalBalanceScore ?? draft.balanceScore
            )}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <TeamHistory side="blue" draft={draft} />
        <TeamHistory side="red" draft={draft} />
      </div>
    </div>
  );
}

function GameResultForm({
  draft,
  onSave,
  onClear,
}: {
  draft: DraftResult;
  onSave: (result: GameResult) => void;
  onClear: () => void;
}) {
  const existing = draft.result;
  const [winner, setWinner] = useState<TeamSide>(
    existing?.winner ?? "blue"
  );
  const [blueKills, setBlueKills] = useState(
    existing ? String(existing.blueScore) : ""
  );
  const [redKills, setRedKills] = useState(
    existing ? String(existing.redScore) : ""
  );
  const [image, setImage] = useState<string | undefined>(
    existing?.leaderboardImage
  );
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImageFile(file);
      setImage(dataUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const blue = Number(blueKills);
    const red = Number(redKills);
    if (!Number.isFinite(blue) || !Number.isFinite(red)) return;

    onSave({
      winner,
      blueScore: blue,
      redScore: red,
      leaderboardImage: image,
      recordedAt: Date.now(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="rounded-[10px] border border-white/[0.07] bg-background/50 p-4">
      <div className="mb-3 text-sm font-medium">Game result</div>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setWinner("blue")}
          className={cn(
            "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
            winner === "blue"
              ? "border-blue-glow/40 bg-blue-soft text-blue-glow"
              : "border-white/[0.07] text-muted hover:text-foreground"
          )}
        >
          Blue won
        </button>
        <button
          type="button"
          onClick={() => setWinner("red")}
          className={cn(
            "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
            winner === "red"
              ? "border-red-glow/40 bg-red-soft text-red-glow"
              : "border-white/[0.07] text-muted hover:text-foreground"
          )}
        >
          Red won
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder="37"
          value={blueKills}
          onChange={(e) => setBlueKills(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-surface px-3 py-2 text-sm text-blue-glow outline-none focus:border-white/20"
        />
        <span className="shrink-0 text-xs text-muted">vs</span>
        <input
          type="number"
          min={0}
          placeholder="65"
          value={redKills}
          onChange={(e) => setRedKills(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-surface px-3 py-2 text-sm text-red-glow outline-none focus:border-white/20"
        />
      </div>
      <p className="mb-3 text-[11px] text-muted">Blue kills vs Red kills</p>

      <div className="mb-3">
        {image ? (
          <div className="relative overflow-hidden rounded-md border border-white/[0.08]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Leaderboard"
              className="max-h-56 w-full object-contain bg-black/40"
            />
            <button
              type="button"
              onClick={() => setImage(undefined)}
              className="absolute right-2 top-2 rounded-md border border-white/10 bg-background/80 p-1 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/[0.12] px-3 py-6 text-sm text-muted transition-colors hover:border-white/20 hover:text-foreground">
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading…" : "Add leaderboard screenshot"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={blueKills === "" || redKills === ""}
        >
          {saved ? <Check /> : null}
          {saved ? "Saved" : existing ? "Update result" : "Save result"}
        </Button>
        {existing && (
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/[0.07] bg-background/60 px-2 py-2.5">
      <div className="text-[10px] text-muted">{label}</div>
      <div className={cn("mt-0.5 text-sm font-medium tabular-nums", className)}>
        {value}
      </div>
    </div>
  );
}

function TeamHistory({
  side,
  draft,
}: {
  side: "blue" | "red";
  draft: DraftResult;
}) {
  const team = side === "blue" ? draft.blue : draft.red;
  const plain = draft.mode === "normal";
  const won = draft.result?.winner === side;

  return (
    <div
      className={cn(
        "rounded-[10px] border p-3.5",
        side === "blue"
          ? "border-blue-glow/20 bg-blue-soft"
          : "border-red-glow/20 bg-red-soft"
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em]",
          side === "blue" ? "text-blue-glow" : "text-red-glow"
        )}
      >
        <span>
          {side === "blue" ? "Blue" : "Red"}
          {!plain &&
            ` · Role ${team.mmr} · Gen ${team.generalMmr ?? 0}`}
        </span>
        {won && <span className="normal-case tracking-normal">Winner</span>}
      </div>
      <div className="space-y-2.5">
        {team.players.map((p) => (
          <div key={p.playerId} className="flex items-center gap-2.5">
            <PlayerAvatar name={p.name} playerId={p.playerId} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{p.name}</div>
              <div className="text-[10px] text-muted">
                {ROLE_LABELS[p.role]}
                {!plain && p.autofilled ? " · Autofill" : ""}
              </div>
            </div>
            {!plain && <TierBadge tier={p.tier} size="sm" />}
          </div>
        ))}
      </div>
    </div>
  );
}
