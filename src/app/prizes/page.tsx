"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PrizesView } from "@/components/prizes/prizes-view";

function PrizesPageInner() {
  const params = useSearchParams();
  const draftId = params.get("draft");
  const seriesId = params.get("series");
  return (
    <PrizesView
      initialDraftId={draftId}
      initialSeriesId={seriesId}
    />
  );
}

export default function PrizesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
          Loading prizes…
        </div>
      }
    >
      <PrizesPageInner />
    </Suspense>
  );
}
