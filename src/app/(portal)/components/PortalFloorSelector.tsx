"use client";

import { Layers } from "lucide-react";
import { FOYER_BUILDINGS, FloorDef as FloorOption } from "@/lib/buildings";

interface PortalFloorSelectorProps {
  buildings?: Record<string, FloorOption[]>;
  activeBuilding: string;
  activeFloor: string;
  onSelectBuilding: (building: string) => void;
  onSelectFloor: (floor: string) => void;
  accentColor?: "rose" | "emerald" | "amber" | "purple";
  title?: string;
  showAllFloorsOption?: boolean;
}

export default function PortalFloorSelector({
  buildings = FOYER_BUILDINGS,
  activeBuilding,
  activeFloor,
  onSelectBuilding,
  onSelectFloor,
  accentColor = "rose",
  title = "Sélection du Bâtiment & Étage",
  showAllFloorsOption = false,
}: PortalFloorSelectorProps) {
  const currentFloors = buildings[activeBuilding] || [];
  const currentFloorLabel = currentFloors.find(f => f.value === activeFloor)?.label || activeFloor;

  const getAccentBg = () => {
    switch (accentColor) {
      case "emerald": return "bg-emerald-600 text-white";
      case "amber": return "bg-amber-600 text-white";
      case "purple": return "bg-purple-600 text-white";
      case "rose":
      default: return "bg-rose-600 text-white";
    }
  };

  const getAccentIcon = () => {
    switch (accentColor) {
      case "emerald": return <Layers className="w-4 h-4 text-emerald-500" />;
      case "amber": return <Layers className="w-4 h-4 text-amber-500" />;
      case "purple": return <Layers className="w-4 h-4 text-purple-500" />;
      case "rose":
      default: return <Layers className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/80 dark:border-stone-800/80 bg-stone-50/80 dark:bg-stone-950/60">
        <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
          {getAccentIcon()}
          {title}
        </h3>
        <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase tracking-widest font-bold hidden sm:inline">
          Sélection: <span className="text-zinc-950 dark:text-stone-100">{activeBuilding} — {activeFloor === "ALL" ? "Tous les étages" : currentFloorLabel}</span>
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">Bâtiment:</span>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(buildings).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onSelectBuilding(b)}
                  className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
                    activeBuilding === b
                      ? `${getAccentBg()} shadow-xs`
                      : "bg-stone-100 dark:bg-stone-800/60 text-zinc-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">Étage:</span>
            <div className="flex flex-wrap gap-1.5">
              {showAllFloorsOption && (
                <button
                  type="button"
                  onClick={() => onSelectFloor("ALL")}
                  className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
                    activeFloor === "ALL"
                      ? "bg-zinc-950 dark:bg-stone-100 text-white dark:text-zinc-950 shadow-xs"
                      : "bg-stone-100 dark:bg-stone-800/60 text-zinc-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  Tous
                </button>
              )}
              {currentFloors.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => onSelectFloor(f.value)}
                  className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
                    activeFloor === f.value
                      ? "bg-zinc-950 dark:bg-stone-100 text-white dark:text-zinc-950 shadow-xs"
                      : "bg-stone-100 dark:bg-stone-800/60 text-zinc-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
