"use client";

import { useEffect } from "react";

export function useKeyboardShortcuts(handlers: {
  onSpace?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
}) {
  const { onSpace, onEnter, enabled = true } = handlers;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      if (e.code === "Space" && onSpace) {
        e.preventDefault();
        onSpace();
      }
      if (e.code === "Enter" && onEnter) {
        e.preventDefault();
        onEnter();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSpace, onEnter, enabled]);
}
