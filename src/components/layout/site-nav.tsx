"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutGrid, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Lobby", icon: Swords },
  { href: "/tierlist", label: "Tier List", icon: LayoutGrid },
  { href: "/history", label: "History", icon: History },
  { href: "/stats", label: "Stats", icon: Trophy },
];

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
    </header>
  );
}
