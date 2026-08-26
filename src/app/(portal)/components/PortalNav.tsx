"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/clubs", label: "Clubs" },
  { href: "/foyer", label: "Foyer" },
  { href: "/apartments", label: "Apartments" },
  { href: "/laundry", label: "Laundry" },
  { href: "/campus", label: "Campus 3D" },
];

export default function PortalNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 sm:gap-6">
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-stone-400">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block border-l border-zinc-200 dark:border-stone-800/80 h-4" />
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="md:hidden p-2 -mr-2 rounded-lg text-zinc-600 dark:text-stone-400 hover:text-zinc-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden absolute left-0 right-0 top-full border-t border-zinc-200/85 dark:border-stone-800/80 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md shadow-sm">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-medium text-zinc-600 dark:text-stone-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
