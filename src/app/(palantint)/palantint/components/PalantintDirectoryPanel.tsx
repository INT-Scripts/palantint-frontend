"use client";

import { ReactNode } from "react";
import { AlertTriangle, Info, type LucideIcon } from "lucide-react";

interface PalantintDirectoryPanelProps<T> {
  items: T[];
  getId: (item: T) => string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
  error?: string | null;
  accentColor?: "rose" | "housing";
  icon: LucideIcon;
  title: string;
  countLabel: string;
  emptyLabel?: string;
  renderDetail: (item: T, onClose: () => void) => ReactNode;
  renderList: (items: T[]) => ReactNode;
  // Some lists intentionally show a filtered subset (e.g. apartments only
  // lists occupied units) while a selection can come from elsewhere (the SVG
  // map lets you click any room, occupied or not). When provided, this
  // resolves the detail item independently of `items` instead of requiring
  // the selected id to be present in the (possibly filtered) list.
  resolveDetailItem?: (selectedId: string) => T | null | undefined;
}

const ACCENT = {
  rose: { icon: "text-rose-500", spinner: "border-rose-500 border-t-transparent" },
  housing: { icon: "text-housing-500", spinner: "border-housing-500 border-t-transparent" },
} as const;

// Dark-zinc "hacker/mono" counterpart of (portal)/components/PortalDirectoryPanel
// — same generic render-prop shape (header/loading/error/empty + detail slot +
// list slot) so both spaces share one directory-panel pattern.
export default function PalantintDirectoryPanel<T>({
  items,
  getId,
  selectedId,
  onSelect,
  loading = false,
  error = null,
  accentColor = "rose",
  icon: Icon,
  title,
  countLabel,
  emptyLabel = "Aucun élément détecté.",
  renderDetail,
  renderList,
  resolveDetailItem,
}: PalantintDirectoryPanelProps<T>) {
  const accent = ACCENT[accentColor];

  return (
    <div className="w-full h-full lg:absolute lg:inset-0 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 flex flex-col shadow-2xl relative rounded-none overflow-hidden min-w-0 min-h-0">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-black/20 shrink-0">
        <h3 className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-3">
          <Icon className={`w-4 h-4 ${accent.icon}`} />
          {title}
        </h3>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
          {items.length} {countLabel}
        </span>
      </div>

      {selectedId && (() => {
        const selected = resolveDetailItem
          ? resolveDetailItem(selectedId)
          : items.find((item) => getId(item) === selectedId);
        return selected ? (
          <div className="shrink-0 border-b border-zinc-800">
            {renderDetail(selected, () => onSelect(null))}
          </div>
        ) : null;
      })()}

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
            <div className={`w-8 h-8 border-2 rounded-full animate-spin ${accent.spinner}`} />
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
              Loading assets...
            </span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-2">
            <AlertTriangle className="w-9 h-9 text-rose-500" />
            <h3 className="font-bold text-sm text-white font-mono uppercase">Erreur</h3>
            <p className="text-zinc-500 text-xs font-mono">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-2 text-zinc-600">
            <Info className="w-8 h-8" />
            <h3 className="font-bold text-sm text-zinc-400 font-mono uppercase tracking-widest">No assets detected</h3>
            <p className="text-xs max-w-xs font-mono">{emptyLabel}</p>
          </div>
        ) : (
          renderList(items)
        )}
      </div>
    </div>
  );
}
