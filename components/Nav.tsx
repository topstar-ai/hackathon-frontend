"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Database, Grid3x3, Shield, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Run", icon: Activity },
  { href: "/harness", label: "Harness", icon: Database },
  { href: "/agents", label: "Agents", icon: Grid3x3 },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* mobile menu */}
        <button
          className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-fg md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#b15cff] to-[#ff4d8d] text-white shadow-[0_4px_16px_-4px_rgba(177,92,255,0.8)]">
            <Shield className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <div className="brand-text text-base font-bold tracking-tight">Drift</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-faint">
              alignment control room
            </div>
          </div>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "text-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pass animate-dot" />
            14 agents · mock backend
          </span>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-3 py-2 md:hidden">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-white/10 text-fg" : "text-muted hover:bg-white/5",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
