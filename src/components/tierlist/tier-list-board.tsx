"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toPng } from "html-to-image";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { PLAYERS } from "@/data/players";
import { useRatings } from "@/hooks/use-ratings";
import {
  RATING_KEYS,
  RATING_LABELS,
  TIERS,
  type RatingKey,
  type Tier,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const TIER_DROP_IDS = new Set<string>([...TIERS, "UNRANKED"]);

/** Prefer the tier row under the pointer; fall back to nearest center. */
const tierCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const tierHit = pointerHits.find((hit) => TIER_DROP_IDS.has(String(hit.id)));
    if (tierHit) return [tierHit];
    return pointerHits;
  }
  return closestCenter(args);
};

export function TierListBoard() {
  const { getTier, setTier, resetRatings, hydrated } = useRatings();
  const [activeKey, setActiveKey] = useState<RatingKey>("general");
  const [activeId, setActiveId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    })
  );

  const columns = useMemo(() => {
    const map: Record<Tier | "UNRANKED", string[]> = {
      S: [],
      A: [],
      B: [],
      C: [],
      D: [],
      F: [],
      UNRANKED: [],
    };

    for (const player of PLAYERS) {
      const tier = getTier(player.id, activeKey);
      if (tier) map[tier].push(player.id);
      else map.UNRANKED.push(player.id);
    }
    return map;
  }, [activeKey, getTier]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const resolveTargetTier = (overId: string): Tier | null | undefined => {
    if (TIERS.includes(overId as Tier)) return overId as Tier;
    if (overId === "UNRANKED") return null;
    // Dropped on another player chip id — inherit that player's tier
    if (PLAYERS.some((p) => p.id === overId)) {
      return getTier(overId, activeKey);
    }
    return undefined;
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const playerId = String(active.id);
    const targetTier = resolveTargetTier(String(over.id));
    if (targetTier === undefined) return;

    const current = getTier(playerId, activeKey);
    if (current === targetTier) return;

    setTier(playerId, activeKey, targetTier);
  };

  const onDragCancel = () => {
    setActiveId(null);
  };

  const exportImage = async () => {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b0d10",
      });
      const link = document.createElement("a");
      link.download = `customs-draft-tierlist-${activeKey}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const activePlayer = PLAYERS.find((p) => p.id === activeId);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
        Loading tier list…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Rankings
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Tier List
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted">
            <span className="text-foreground/80">General</span> rates overall
            player strength. Role tabs rate lane-specific skill. Both feed draft
            MMR. Changes save automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={resetRatings}>
            <RotateCcw />
            Reset
          </Button>
          <Button variant="outline" onClick={exportImage} disabled={exporting}>
            <Download />
            {exporting ? "Exporting…" : "Export"}
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {RATING_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveKey(key)}
            className={cn(
              "rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeKey === key
                ? "border-white/20 bg-surface-raised text-foreground"
                : "border-white/[0.07] bg-surface text-muted hover:border-white/[0.12] hover:text-foreground"
            )}
          >
            {RATING_LABELS[key]}
          </button>
        ))}
      </div>

      <div ref={boardRef} className="space-y-2 rounded-[10px] bg-background p-1">
        <div className="mb-3 px-2 text-xs text-muted">
          {RATING_LABELS[activeKey]}
          {activeKey === "general" ? " · overall player" : " · role"} · Customs
          Draft
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={tierCollisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          {([...TIERS, "UNRANKED"] as const).map((tier) => (
            <TierRow
              key={tier}
              tier={tier}
              playerIds={columns[tier]}
              ratingKey={activeKey}
              draggingId={activeId}
            />
          ))}

          <DragOverlay dropAnimation={null}>
            {activePlayer ? (
              <div className="scale-105 cursor-grabbing opacity-95 shadow-lg">
                <TierPlayerChip
                  name={activePlayer.name}
                  playerId={activePlayer.id}
                  dragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function TierRow({
  tier,
  playerIds,
  ratingKey,
  draggingId,
}: {
  tier: Tier | "UNRANKED";
  playerIds: string[];
  ratingKey: RatingKey;
  draggingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tier });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[72px] overflow-hidden rounded-[10px] border transition-colors",
        isOver
          ? "border-white/25 bg-surface-raised"
          : "border-white/[0.07] bg-surface"
      )}
    >
      <div
        className={cn(
          "flex w-14 shrink-0 items-center justify-center border-r border-white/[0.06] sm:w-16",
          "bg-background/40"
        )}
      >
        {tier === "UNRANKED" ? (
          <span className="text-[10px] font-medium text-muted">N/A</span>
        ) : (
          <TierBadge tier={tier} size="lg" />
        )}
      </div>
      <div className="flex flex-1 flex-wrap content-start gap-2 p-2.5 sm:p-3">
        {playerIds.map((id) => {
          const player = PLAYERS.find((p) => p.id === id)!;
          return (
            <DraggableChip
              key={`${ratingKey}-${id}`}
              id={id}
              name={player.name}
              isActive={draggingId === id}
            />
          );
        })}
        {playerIds.length === 0 && (
          <span className="pointer-events-none self-center px-2 text-xs text-muted/50">
            Drop players here
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableChip({
  id,
  name,
  isActive,
}: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none",
        (isDragging || isActive) && "opacity-35"
      )}
    >
      <TierPlayerChip name={name} playerId={id} />
    </div>
  );
}

function TierPlayerChip({
  name,
  playerId,
  dragging,
}: {
  name: string;
  playerId?: string;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border border-white/[0.07] bg-background/60 px-2.5 py-1.5 active:cursor-grabbing",
        dragging && "border-white/20 bg-surface-raised"
      )}
    >
      <PlayerAvatar name={name} playerId={playerId} size="sm" />
      <span className="text-xs font-medium tracking-tight">{name}</span>
    </div>
  );
}
