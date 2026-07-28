"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PrizesView } from "@/components/prizes/prizes-view";

function PrizesPageInner() {
  const params = useSearchParams();
  const draftId = params.get("draft");
  return <PrizesView initialDraftId={draftId} />;
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
