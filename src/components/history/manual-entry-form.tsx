"use client";

import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { PLAYERS } from "@/data/players";
import { Button } from "@/components/ui/button";
import { RoleLabel } from "@/components/ui/role-icon";
import { createManualDraft } from "@/lib/draft";
import type {
  DraftResult,
  GameResult,
  RatingsOverride,
  Role,
  RolePrefsOverride,
  TeamSide,
} from "@/lib/types";
import { ROLES } from "@/lib/types";
import { cn } from "@/lib/utils";

type RoleSlots = Record<Role, string>;

function emptySlots(): RoleSlots {
  return { top: "", jungle: "", mid: "", adc: "", support: "" };
}

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ManualEntryFormProps {
  overrides: RatingsOverride;
  rolePrefs: RolePrefsOverride;
  onSave: (draft: DraftResult, result?: GameResult) => void;
  onCancel: () => void;
}

export function ManualEntryForm({
  overrides,
  rolePrefs,
  onSave,
  onCancel,
}: ManualEntryFormProps) {
  const [blue, setBlue] = useState<RoleSlots>(emptySlots);
  const [red, setRed] = useState<RoleSlots>(emptySlots);
  const [playedAt, setPlayedAt] = useState(() =>
    toDatetimeLocalValue(Date.now())
  );
  const [includeResult, setIncludeResult] = useState(true);
  const [winner, setWinner] = useState<TeamSide>("blue");
  const [blueKills, setBlueKills] = useState("0");
  const [redKills, setRedKills] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const usedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const role of ROLES) {
      if (blue[role]) ids.add(blue[role]);
      if (red[role]) ids.add(red[role]);
    }
    return ids;
  }, [blue, red]);

  const filled =
    ROLES.every((role) => blue[role] && red[role]) && usedIds.size === 10;

  const setSlot = (side: TeamSide, role: Role, playerId: string) => {
    const setter = side === "blue" ? setBlue : setRed;
    setter((prev) => ({ ...prev, [role]: playerId }));
    setError(null);
  };

  const handleSubmit = () => {
    try {
      const draft = createManualDraft({
        blue,
        red,
        overrides,
        rolePrefs,
        timestamp: playedAt ? new Date(playedAt).getTime() : Date.now(),
      });

      let result: GameResult | undefined;
      if (includeResult) {
        const blueScore = Number(blueKills);
        const redScore = Number(redKills);
        if (!Number.isFinite(blueScore) || !Number.isFinite(redScore)) {
          setError("Enter valid kill counts");
          return;
        }
        result = {
          winner,
          blueScore,
          redScore,
          recordedAt: Date.now(),
        };
      }

      onSave(draft, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lineup");
    }
  };

  return (
    <div className="rounded-[10px] border border-white/[0.1] bg-surface p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Add past game</h2>
          <p className="mt-1 text-sm text-muted">
            Enter the exact Blue / Red lineups from last week — no rolling
            needed.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <label className="mb-6 block max-w-xs">
        <span className="mb-1.5 block text-xs text-muted">When you played</span>
        <input
          type="datetime-local"
          value={playedAt}
          onChange={(e) => setPlayedAt(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-background px-3 py-2 text-sm outline-none focus:border-white/20"
        />
      </label>

      <div className="grid gap-6 lg:grid-cols-2">
        <TeamPicker
          side="blue"
          slots={blue}
          usedIds={usedIds}
          onChange={(role, id) => setSlot("blue", role, id)}
        />
        <TeamPicker
          side="red"
          slots={red}
          usedIds={usedIds}
          onChange={(role, id) => setSlot("red", role, id)}
        />
      </div>

      <div className="mt-6 rounded-[10px] border border-white/[0.07] bg-background/50 p-4">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeResult}
            onChange={(e) => setIncludeResult(e.target.checked)}
            className="accent-foreground"
          />
          Record winner and kills now
        </label>

        {includeResult && (
          <>
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
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={blueKills}
                onChange={(e) => setBlueKills(e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-surface px-3 py-2 text-sm text-blue-glow outline-none focus:border-white/20"
              />
              <span className="shrink-0 text-xs text-muted">vs</span>
              <input
                type="number"
                min={0}
                value={redKills}
                onChange={(e) => setRedKills(e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-surface px-3 py-2 text-sm text-red-glow outline-none focus:border-white/20"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">Blue kills vs Red kills</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-glow">{error}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={handleSubmit} disabled={!filled}>
          <Check />
          Save to history
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function TeamPicker({
  side,
  slots,
  usedIds,
  onChange,
}: {
  side: TeamSide;
  slots: RoleSlots;
  usedIds: Set<string>;
  onChange: (role: Role, playerId: string) => void;
}) {
  const sorted = useMemo(
    () => [...PLAYERS].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  return (
    <div
      className={cn(
        "rounded-[10px] border p-4",
        side === "blue"
          ? "border-blue-glow/20 bg-blue-soft/40"
          : "border-red-glow/20 bg-red-soft/40"
      )}
    >
      <div
        className={cn(
          "mb-3 text-xs font-medium uppercase tracking-[0.14em]",
          side === "blue" ? "text-blue-glow" : "text-red-glow"
        )}
      >
        {side === "blue" ? "Blue side" : "Red side"}
      </div>
      <div className="space-y-2.5">
        {ROLES.map((role) => {
          const selected = slots[role];
          return (
            <label key={role} className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
                <RoleLabel role={role} size="xs" />
              </span>
              <select
                value={selected}
                onChange={(e) => onChange(role, e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-background px-3 py-2 text-sm outline-none focus:border-white/20"
              >
                <option value="">Select player…</option>
                {sorted.map((player) => {
                  const taken = usedIds.has(player.id) && selected !== player.id;
                  return (
                    <option
                      key={player.id}
                      value={player.id}
                      disabled={taken}
                    >
                      {player.name}
                      {taken ? " (taken)" : ""}
                    </option>
                  );
                })}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function ManualEntryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick}>
      <Plus />
      Add past game
    </Button>
  );
}
