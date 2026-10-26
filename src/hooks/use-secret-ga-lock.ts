"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readSecretGaLock,
  writeSecretGaLock,
} from "@/lib/built-in-together";

/** Quiet on/off for the Gabriel↔Aman same-team lock (local only). */
export function useSecretGaLock() {
  const [enabled, setEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabled(readSecretGaLock());
    setHydrated(true);
  }, []);

  const toggle = useCallback((): boolean => {
    const next = !readSecretGaLock();
    writeSecretGaLock(next);
    setEnabled(next);
    return next;
  }, []);

  return { enabled, toggle, hydrated };
}
