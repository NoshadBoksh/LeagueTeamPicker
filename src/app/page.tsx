"use client";

import { Suspense } from "react";
import { LobbyApp } from "@/components/lobby/lobby-app";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-20 text-center text-sm text-muted">
          Loading lobby…
        </div>
      }
    >
      <LobbyApp />
    </Suspense>
  );
}
