"use client";

import { FOYER_BUILDINGS, FloorDef as FloorOption } from "@/lib/buildings";

interface PalantintFloorSelectorProps {
  buildings?: Record<string, FloorOption[]>;
  activeBuilding?: string;
  activeFloor: string;
  onSelectBuilding?: (building: string) => void;
  onSelectFloor: (floor: string) => void;
  title?: string;
  accentColor?: "rose" | "orga" | "emerald";
  showAllFloorsOption?: boolean;
}

export default function PalantintFloorSelector({
  buildings = FOYER_BUILDINGS,
  activeBuilding = "Foyer",
  activeFloor,
  onSelectBuilding,
  onSelectFloor,
  title = "Étages — Foyer Associatif",
  accentColor = "rose",
  showAllFloorsOption = false,
}: PalantintFloorSelectorProps) {
  const currentFloors = buildings[activeBuilding] || [];
  const currentFloorLabel = currentFloors.find((f) => f.value === activeFloor)?.label || activeFloor;

  const activeStyle = accentColor === "orga"
    ? "bg-orga-500/20 text-white border-orga-500 shadow-sm shadow-orga-500/20"
    : "bg-rose-500/20 text-white border-rose-500 shadow-sm shadow-rose-500/20";

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 shadow-xl overflow-hidden backdrop-blur-3xl rounded-none p-3.5 space-y-2.5">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <label className="text-[10px] font-extrabold font-mono text-zinc-400 uppercase tracking-widest">
          {title}
        </label>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest hidden sm:block">
          Sélection: <span className="text-white font-black">{activeFloor === "ALL" ? "Tous les étages" : currentFloorLabel}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        {onSelectBuilding && Object.keys(buildings).length > 1 && (
          <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-3">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Bâtiment:</span>
            {Object.keys(buildings).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onSelectBuilding(b)}
                className={`px-2.5 py-1 text-xs font-bold font-mono border transition-all cursor-pointer rounded-none ${
                  activeBuilding === b
                    ? activeStyle
                    : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {showAllFloorsOption && (
            <button
              type="button"
              onClick={() => onSelectFloor("ALL")}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono border transition-all cursor-pointer rounded-none ${
                activeFloor === "ALL"
                  ? activeStyle
                  : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              Tous
            </button>
          )}
          {currentFloors.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onSelectFloor(f.value)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono border transition-all cursor-pointer rounded-none ${
                activeFloor === f.value
                  ? activeStyle
                  : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
