"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

export interface PalantintStatItem {
  label: string;
  value: ReactNode;
  span?: 2;
  variant?: "default" | "accent";
  valueClassName?: string;
  action?: ReactNode;
}

interface PalantintDetailStatCardProps {
  accentColor: "rose" | "housing";
  title: ReactNode;
  onClose: () => void;
  stats?: PalantintStatItem[];
  footer?: ReactNode;
}

const ACCENT = {
  rose: { dot: "bg-rose-500", accentBox: "bg-rose-500/10 border-rose-500/20", accentText: "text-rose-400" },
  housing: { dot: "bg-housing-500", accentBox: "bg-housing-500/10 border-housing-500/20", accentText: "text-housing-400" },
} as const;

// Shared "popup" detail card used by both apartments and foyer directory
// panels — one component per space (see (portal)/components/DirectoryDetailCard
// for the portal counterpart) so the two pages can't visually drift apart.
export default function PalantintDetailStatCard({ accentColor, title, onClose, stats, footer }: PalantintDetailStatCardProps) {
  const accent = ACCENT[accentColor];

  return (
    <div className="p-4 border-b border-zinc-800 bg-zinc-950/70 space-y-3 shrink-0">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2 font-mono min-w-0">
          <div className={`w-2 h-2 rounded-full ${accent.dot} animate-pulse shrink-0`} />
          <span className="text-sm font-black text-white uppercase truncate">{title}</span>
        </div>
        <button onClick={onClose} title="Désélectionner" className="text-zinc-500 hover:text-white p-1 cursor-pointer shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`p-2 border ${s.variant === "accent" ? accent.accentBox : "bg-zinc-900/80 border-zinc-800"} ${
                s.span === 2 ? "col-span-2 flex items-center justify-between gap-2" : ""
              }`}
            >
              <div className="min-w-0">
                <span className={`text-[8px] font-mono uppercase block font-bold ${s.variant === "accent" ? "text-zinc-300" : "text-zinc-500"}`}>
                  {s.label}
                </span>
                <span
                  className={`font-bold text-xs truncate block ${s.variant === "accent" ? accent.accentText : "text-white"} ${s.valueClassName || ""}`}
                >
                  {s.value}
                </span>
              </div>
              {s.action}
            </div>
          ))}
        </div>
      )}

      {footer}
    </div>
  );
}
