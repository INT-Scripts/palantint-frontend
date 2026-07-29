"use client";

import { ReactNode } from "react";
import { AlertTriangle, Info, type LucideIcon } from "lucide-react";

interface PortalDirectoryPanelProps<T> {
  items: T[];
  getId: (item: T) => string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
  error?: string | null;
  accentColor: "rose" | "amber";
  icon: LucideIcon;
  title: string;
  countLabel: string;
  emptyLabel?: string;
  renderDetail: (item: T, onClose: () => void) => ReactNode;
  renderList: (items: T[]) => ReactNode;
}

const ACCENT = {
  rose: { border: "border-rose-500 border-t-transparent", ring: "text-rose-500" },
  amber: { border: "border-amber-500 border-t-transparent", ring: "text-amber-500" },
} as const;

export default function PortalDirectoryPanel<T>({
  items,
  getId,
  selectedId,
  onSelect,
  loading = false,
  error = null,
  accentColor,
  icon: Icon,
  title,
  countLabel,
  emptyLabel = "Aucun élément trouvé.",
  renderDetail,
  renderList,
}: PortalDirectoryPanelProps<T>) {
  const accent = ACCENT[accentColor];

  return (
    <div className="w-full h-full lg:absolute lg:inset-0 bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs flex flex-col min-h-0 min-w-0">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 shrink-0">
        <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${accent.ring}`} />
          {title}
        </h3>
        <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase font-bold">
          {items.length} {countLabel}
        </span>
      </div>

      {selectedId && (() => {
        const selected = items.find((item) => getId(item) === selectedId);
        return selected ? (
          <div className="p-4 border-b border-zinc-200 dark:border-stone-800 shrink-0">
            {renderDetail(selected, () => onSelect(null))}
          </div>
        ) : null;
      })()}

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
            <div className={`w-8 h-8 border-2 rounded-full animate-spin ${accent.border}`} />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
              Chargement...
            </span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-2">
            <AlertTriangle className="w-9 h-9 text-rose-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-stone-100">Erreur de chargement</h3>
            <p className="text-zinc-500 dark:text-stone-400 text-xs font-mono">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-2 text-zinc-400 dark:text-stone-500">
            <Info className="w-8 h-8" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-stone-100">Aucun résultat</h3>
            <p className="text-xs max-w-xs">{emptyLabel}</p>
          </div>
        ) : (
          renderList(items)
        )}
      </div>
    </div>
  );
}
