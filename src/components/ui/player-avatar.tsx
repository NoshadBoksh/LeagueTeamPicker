"use client";

import { useState } from "react";
import { getPlayerPhotoPath } from "@/data/players";
import { cn, getInitials } from "@/lib/utils";

const SIZE = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-base",
} as const;

export function PlayerAvatar({
  name,
  playerId,
  size = "md",
  selected = false,
  className,
}: {
  name: string;
  playerId?: string;
  size?: "sm" | "md" | "lg" | "xl";
  selected?: boolean;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = playerId && !imgFailed ? getPlayerPhotoPath(playerId) : null;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-surface-raised font-medium text-muted ring-1 ring-white/[0.08]",
        SIZE[size],
        selected && "ring-white/25",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
