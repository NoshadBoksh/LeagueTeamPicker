"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cloud,
  CloudOff,
  Gift,
  History,
  LayoutGrid,
  LoaderCircle,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useAppState } from "@/components/providers/app-state-provider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Lobby", icon: Swords },
  { href: "/roles", label: "Roles", icon: Users },
  { href: "/tierlist", label: "Tier List", icon: LayoutGrid },
  { href: "/prizes", label: "Prizes", icon: Gift },
  { href: "/history", label: "History", icon: History },
  { href: "/stats", label: "Stats", icon: Trophy },
];

function SyncBadge() {
  const { syncStatus } = useAppState();

  const label =
    syncStatus === "loading"
      ? "Loading"
      : syncStatus === "saving"
        ? "Saving"
        : syncStatus === "saved"
          ? "Saved"
          : syncStatus === "offline"
            ? "Offline"
            : "Save error";

  const Icon =
    syncStatus === "loading" || syncStatus === "saving"
      ? LoaderCircle
      : syncStatus === "offline" || syncStatus === "error"
        ? CloudOff
        : Cloud;

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs sm:inline-flex",
        syncStatus === "error" || syncStatus === "offline"
          ? "text-amber-400/90"
          : "text-muted"
      )}
      title="Tier list, history, roles, and prizes sync to shared storage"
    >
      <Icon
        className={cn(
          "h-3 w-3",
          (syncStatus === "loading" || syncStatus === "saving") && "animate-spin"
        )}
      />
      {label}
    </span>
  );
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
            <Swords className="h-3.5 w-3.5 text-background" />
          </div>
          <span className="text-sm font-medium tracking-tight text-foreground">
            Customs Draft
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <SyncBadge />
          <nav className="flex items-center gap-0.5">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 opacity-70" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
