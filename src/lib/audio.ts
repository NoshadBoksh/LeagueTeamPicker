"use client";

/**
 * Audio / SFX hooks for the draft reveal.
 * Wire real assets later — call sites are ready.
 */
export type DraftSfxEvent =
  | "draft-start"
  | "role-reveal"
  | "draft-complete"
  | "reroll";

type SfxHandler = (event: DraftSfxEvent) => void;

let handler: SfxHandler | null = null;

export function registerDraftSfx(next: SfxHandler | null) {
  handler = next;
}

export function playDraftSfx(event: DraftSfxEvent) {
  try {
    handler?.(event);
  } catch {
    // Audio failures should never break the draft UX
  }
}

/** Optional Web Audio blip — silent no-op if AudioContext blocked */
export function createDefaultDraftSfx(): SfxHandler {
  let ctx: AudioContext | null = null;

  const beep = (freq: number, duration = 0.08, gain = 0.04) => {
    try {
      ctx ??= new AudioContext();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "triangle";
      g.gain.value = gain;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  };

  return (event) => {
    switch (event) {
      case "draft-start":
        beep(220, 0.15, 0.05);
        break;
      case "role-reveal":
        beep(440, 0.06, 0.035);
        break;
      case "draft-complete":
        beep(660, 0.12, 0.05);
        setTimeout(() => beep(880, 0.15, 0.04), 100);
        break;
      case "reroll":
        beep(330, 0.08, 0.03);
        break;
    }
  };
}
