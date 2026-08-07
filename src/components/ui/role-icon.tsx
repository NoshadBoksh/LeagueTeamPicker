"use client";

import type { RatingKey, Role } from "@/lib/types";
import { ROLE_LABELS, RATING_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZE = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

type IconSize = keyof typeof SIZE;

/** LoL-style position glyphs (filled paths, currentColor). */
function RoleGlyph({ role }: { role: Role }) {
  switch (role) {
    case "top":
      return (
        <path
          fill="currentColor"
          d="M4 4h7.5v2.2H6.2V11.5H4V4zm8.5 8.5H20V20h-7.5v-2.2h5.3v-5.3H12.5v-2zM11.2 8.8h2.4v2.4h-2.4V8.8z"
        />
      );
    case "jungle":
      return (
        <path
          fill="currentColor"
          d="M12 3.2c.4 1.8 1.3 3.2 2.6 4.4 1.1 1 1.8 2.1 1.8 3.5 0 1.6-1 2.9-2.4 3.7.7-.9 1.1-2 1.1-3.1 0-1.7-1-3.1-2.5-4.2C10.9 6.4 10 5.2 9.6 3.6c.7 1.4 1.7 2.5 3 3.4 1.1.8 1.8 1.8 1.8 3.1 0 1.1-.5 2.1-1.3 2.9C11.5 11.5 10.5 10 10.5 8.3c0-1.5.7-2.8 1.9-3.9C13.7 3.2 12.7 2.5 12 3.2zm-5.2 7.1c1.3-.2 2.5.1 3.5.9.9.7 1.4 1.6 1.4 2.8 0 1.9-1.4 3.5-3.4 4.2 1.5-.7 2.5-2 2.5-3.6 0-1.3-.7-2.3-1.8-3-.9-.5-1.9-.7-3-.6.6.1 1.2.3 1.7.7.8.6 1.2 1.4 1.2 2.4 0 1.5-1.1 2.8-2.7 3.4-.2.1-.5.1-.7.2 2.2-.4 3.8-2.1 3.8-4.2 0-1.5-.8-2.7-2.1-3.5-.5-.3-1.1-.5-1.7-.6.5-.1 1.1-.1 1.7-.1zM17.2 10.3c-.6 0-1.2.1-1.7.3-1.3.6-2.1 1.7-2.1 3.2 0 2 1.5 3.6 3.6 4.1-.2 0-.4-.1-.6-.1-1.5-.5-2.5-1.7-2.5-3.2 0-.9.4-1.7 1.1-2.2.5-.4 1.1-.6 1.7-.7-1.1-.1-2.1.1-3 .6-1.1.7-1.8 1.7-1.8 3 0 1.6 1 2.9 2.5 3.6-2-.7-3.4-2.3-3.4-4.2 0-1.2.5-2.1 1.4-2.8 1-.8 2.2-1.1 3.5-.9.5 0 1.1 0 1.6.1z"
        />
      );
    case "mid":
      return (
        <path
          fill="currentColor"
          d="M5.2 4h3.1l10.5 12.6V4H21v16h-3.1L7.4 7.4V20H5.2V4z"
        />
      );
    case "adc":
      return (
        <path
          fill="currentColor"
          d="M12.5 4H20v7.5h-2.2V6.2h-5.3V4zM4 12.5h7.5v2.2H6.2V20H4v-7.5zm7.3.7h2.4v2.4h-2.4v-2.4z"
        />
      );
    case "support":
      return (
        <path
          fill="currentColor"
          d="M12 5.2c1.3 0 2.4.9 2.7 2.1h1.9c-.4-2.1-2.3-3.7-4.6-3.7S7.8 5.2 7.4 7.3h1.9C9.6 6.1 10.7 5.2 12 5.2zm-6.2 4.6h12.4v1.8H5.8V9.8zm1.5 3.2h9.4c.3 0 .6.2.7.5l1.4 5.2c.1.4-.2.8-.6.8H5.8c-.4 0-.7-.4-.6-.8l1.4-5.2c.1-.3.4-.5.7-.5zm1.1 1.8-.8 3h8.8l-.8-3H8.4z"
        />
      );
  }
}

function GeneralGlyph() {
  return (
    <path
      fill="currentColor"
      d="M12 3.5 13.7 9h5.8l-4.7 3.4 1.8 5.6L12 14.8l-4.6 3.2 1.8-5.6L4.5 9h5.8L12 3.5z"
    />
  );
}

export function RoleIcon({
  role,
  size = "md",
  className,
  title,
}: {
  role: Role;
  size?: IconSize;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={cn("shrink-0", SIZE[size], className)}
    >
      {title ? <title>{title}</title> : null}
      <RoleGlyph role={role} />
    </svg>
  );
}

export function RatingKeyIcon({
  ratingKey,
  size = "md",
  className,
}: {
  ratingKey: RatingKey;
  size?: IconSize;
  className?: string;
}) {
  if (ratingKey === "general") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={cn("shrink-0", SIZE[size], className)}
      >
        <GeneralGlyph />
      </svg>
    );
  }
  return <RoleIcon role={ratingKey} size={size} className={className} />;
}

/** Icon + label chip used in tabs / buttons. */
export function RoleLabel({
  role,
  size = "sm",
  className,
  iconClassName,
}: {
  role: Role;
  size?: IconSize;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RoleIcon role={role} size={size} className={iconClassName} />
      <span>{ROLE_LABELS[role]}</span>
    </span>
  );
}

export function RatingKeyLabel({
  ratingKey,
  size = "sm",
  className,
}: {
  ratingKey: RatingKey;
  size?: IconSize;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <RatingKeyIcon ratingKey={ratingKey} size={size} />
      <span>{RATING_LABELS[ratingKey]}</span>
    </span>
  );
}
