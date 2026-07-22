import React, { ReactNode } from "react";

interface PortalHeaderProps {
  icon: ReactNode;
  badgeText: string;
  title: string;
  subtitle: string;
  accentColor?: "amber" | "rose" | "blue" | "emerald" | "stone";
  rightContent?: ReactNode;
}

const accentStyles = {
  amber: {
    badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40",
  },
  rose: {
    badge: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/40",
  },
  blue: {
    badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40",
  },
  emerald: {
    badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40",
  },
  stone: {
    badge: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
  },
};

export default function PortalHeader({
  icon,
  badgeText,
  title,
  subtitle,
  accentColor = "amber",
  rightContent,
}: PortalHeaderProps) {
  const accent = accentStyles[accentColor] || accentStyles.amber;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200/80 dark:border-stone-800/80 pb-6">
      <div>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-mono font-bold uppercase tracking-widest mb-3 shadow-xs ${accent.badge}`}
        >
          {icon}
          <span>{badgeText}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-950 dark:text-stone-50">
          {title}
        </h1>
        <p className="text-zinc-500 dark:text-stone-400 text-sm sm:text-base mt-2 max-w-2xl">
          {subtitle}
        </p>
      </div>

      {rightContent && (
        <div className="self-start md:self-auto shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
}
