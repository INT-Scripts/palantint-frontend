"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

export interface PortalStatItem {
  label: string;
  value: ReactNode;
  span?: 2;
  variant?: "default" | "accent" | "success";
  action?: ReactNode;
}

interface DirectoryDetailCardProps {
  accentColor: "amber" | "rose";
  title: ReactNode;
  badge?: string;
  onClose: () => void;
  stats: PortalStatItem[];
  footer?: ReactNode;
}

const ACCENT = {
  amber: { border: "border-amber-500/80", dot: "bg-amber-500", badge: "bg-amber-600", accentBox: "bg-amber-500/10 border-amber-500/20", accentText: "text-amber-600 dark:text-amber-400" },
  rose: { border: "border-rose-500/80", dot: "bg-rose-500", badge: "bg-rose-600", accentBox: "bg-rose-500/10 border-rose-500/20", accentText: "text-rose-600 dark:text-rose-400" },
} as const;

// Shared "popup" detail card used by both the apartments and foyer directory
// panels — one component per space (see (palantint)/palantint/components/
// PalantintDetailStatCard for the palantint counterpart) so the two pages
// can't visually drift apart.
export default function DirectoryDetailCard({ accentColor, title, badge, onClose, stats, footer }: DirectoryDetailCardProps) {
  const accent = ACCENT[accentColor];

  return (
    <div className={`bg-white dark:bg-stone-900 border-2 ${accent.border} rounded-3xl p-5 shadow-xs space-y-4 shrink-0`}>
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-3 h-3 rounded-full ${accent.dot} animate-pulse shrink-0`} />
          <h3 className="text-lg font-extrabold font-mono text-zinc-950 dark:text-stone-50 truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg ${accent.badge} text-white`}>{badge}</span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          {stats.map((s, i) => {
            const boxClass =
              s.variant === "accent"
                ? accent.accentBox
                : s.variant === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60"
                : "bg-stone-50 dark:bg-stone-950 border-zinc-200/80 dark:border-stone-800";
            const textClass =
              s.variant === "accent"
                ? `${accent.accentText} font-extrabold`
                : s.variant === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-900 dark:text-stone-100";
            const labelClass =
              s.variant === "accent"
                ? accent.accentText
                : s.variant === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-400 dark:text-stone-500";

            return (
              <div
                key={i}
                className={`p-3.5 rounded-2xl border ${boxClass} ${s.span === 2 ? "col-span-2 flex items-center justify-between gap-3" : ""}`}
              >
                <div className="min-w-0">
                  <span className={`text-[9px] uppercase block font-bold ${labelClass}`}>{s.label}</span>
                  <span className={`font-bold truncate block ${textClass}`}>{s.value}</span>
                </div>
                {s.action}
              </div>
            );
          })}
        </div>
      )}

      {footer}
    </div>
  );
}
